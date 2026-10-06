import express, { type RequestHandler, type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z, ZodError } from 'zod';
import {
  conversationIdSchema,
  deviceSchema,
  groupInputSchema,
  idSchema,
  messageInputSchema,
  profileInputSchema,
} from '../../shared/domain.js';
import type { ChatBackend } from './contracts.js';
import { HttpError } from './errors.js';

declare global {
  namespace Express {
    interface Locals {
      uid: string;
      email: string;
    }
  }
}

export function createApp(backend: ChatBackend) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY ?? '0'));
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'conecta-chat-api' }));
  app.get('/ready', async (_req, res, next) => {
    try {
      await backend.health();
      res.json({ status: 'ready' });
    } catch {
      next(new HttpError(503, 'Serviços indisponíveis.'));
    }
  });
  const authenticate: RequestHandler = async (req, res, next) => {
    const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!match?.[1]) return next(new HttpError(401, 'Entre na sua conta para continuar.'));
    try {
      const user = await backend.verifyToken(match[1]);
      res.locals.uid = user.uid;
      res.locals.email = user.email;
      next();
    } catch {
      next(new HttpError(401, 'Sua sessão expirou. Entre novamente.'));
    }
  };
  app.use(authenticate);
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      keyGenerator: (_req, res) => res.locals.uid,
      message: { error: 'Muitas solicitações. Aguarde um minuto.' },
    }),
  );
  app.post('/users/me', async (req, res) =>
    res
      .status(201)
      .json(
        await backend.saveProfile(
          res.locals.uid,
          res.locals.email,
          profileInputSchema.parse(req.body),
        ),
      ),
  );
  app.get('/users', async (_req, res) => res.json(await backend.directory()));
  app.get('/users/:uid', async (req, res) =>
    res.json(await backend.profile(res.locals.uid, idSchema.parse(req.params.uid))),
  );
  app.post('/conversations/direct', async (req, res) => {
    const body = z.object({ otherUid: idSchema }).strict().parse(req.body);
    res.json(await backend.direct(res.locals.uid, body.otherUid));
  });
  app.get('/conversations/:id', async (req, res) =>
    res.json(await backend.conversation(res.locals.uid, conversationIdSchema.parse(req.params.id))),
  );
  app.post('/groups', async (req, res) =>
    res
      .status(201)
      .json(await backend.group(res.locals.uid, null, groupInputSchema.parse(req.body))),
  );
  app.put('/groups/:id', async (req, res) => {
    const body = z
      .object({ group: groupInputSchema, expectedRevision: z.number().int().min(1) })
      .strict()
      .parse(req.body);
    res.json(
      await backend.group(
        res.locals.uid,
        idSchema.parse(req.params.id),
        body.group,
        body.expectedRevision,
      ),
    );
  });
  app.post('/conversations/:id/messages', async (req, res) =>
    res
      .status(201)
      .json(
        await backend.sendMessage(
          res.locals.uid,
          conversationIdSchema.parse(req.params.id),
          messageInputSchema.parse(req.body),
        ),
      ),
  );
  app.put('/devices/:id', async (req, res) => {
    await backend.saveDevice(
      res.locals.uid,
      z.uuid().parse(req.params.id),
      deviceSchema.parse(req.body),
    );
    res.sendStatus(204);
  });
  app.delete('/devices/:id', async (req, res) => {
    await backend.deleteDevice(res.locals.uid, z.uuid().parse(req.params.id));
    res.sendStatus(204);
  });
  app.post('/notifications/messages', async (req, res) => {
    const body = z
      .object({ conversationId: conversationIdSchema, messageId: z.uuid() })
      .strict()
      .parse(req.body);
    res.json(await backend.notify(res.locals.uid, body.conversationId, body.messageId));
  });
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: error.issues.map((issue) => issue.message).join(' ') });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON inválido.' });
      return;
    }
    // Não registrar payloads, tokens, perfis, mensagens ou credenciais.
    console.error('request_failed', error instanceof Error ? error.name : 'UnknownError');
    res.status(500).json({ error: 'Não foi possível concluir. Tente novamente.' });
  };
  app.use(errorHandler);
  return app;
}
