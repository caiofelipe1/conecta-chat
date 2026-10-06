import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app';
import type { ChatBackend } from '../server/src/contracts';
import { HttpError } from '../server/src/errors';
const backend: ChatBackend = {
  health: vi.fn().mockResolvedValue(undefined),
  verifyToken: vi.fn().mockResolvedValue({ uid: 'alice', email: 'alice@example.com' }),
  saveProfile: vi.fn(),
  profile: vi.fn(),
  directory: vi.fn().mockResolvedValue([]),
  direct: vi.fn(),
  conversation: vi.fn(),
  group: vi.fn(),
  sendMessage: vi.fn(),
  saveDevice: vi.fn(),
  deleteDevice: vi.fn(),
  notify: vi.fn().mockResolvedValue({ status: 'sent', sent: 1 }),
};
const app = createApp(backend);
beforeEach(() => vi.clearAllMocks());
describe('API HTTP', () => {
  it('health público responde sem expor dados', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'conecta-chat-api' });
  });
  it('endpoint protegido exige Bearer', async () => {
    expect((await request(app).get('/users')).status).toBe(401);
    expect(backend.directory).not.toHaveBeenCalled();
  });
  it('token inválido não acessa dados', async () => {
    vi.mocked(backend.verifyToken).mockRejectedValueOnce(new Error('invalid'));
    expect((await request(app).get('/users').auth('bad', { type: 'bearer' })).status).toBe(401);
  });
  it('busca autenticada funciona', async () =>
    expect((await request(app).get('/users').auth('valid', { type: 'bearer' })).status).toBe(200));
  it('não aceita destinatários enviados pelo cliente', async () => {
    const res = await request(app)
      .post('/notifications/messages')
      .auth('valid', { type: 'bearer' })
      .send({
        conversationId: 'g_test',
        messageId: '12345678-1234-4234-9234-123456789012',
        recipientIds: ['outsider'],
      });
    expect(res.status).toBe(400);
    expect(backend.notify).not.toHaveBeenCalled();
  });
  it('encaminha somente usuário, conversa e mensagem ao servidor', async () => {
    const id = '12345678-1234-4234-9234-123456789012';
    expect(
      (
        await request(app)
          .post('/notifications/messages')
          .auth('valid', { type: 'bearer' })
          .send({ conversationId: 'g_test', messageId: id })
      ).status,
    ).toBe(200);
    expect(backend.notify).toHaveBeenCalledWith('alice', 'g_test', id);
  });
  it('conflito de revisão chega ao cliente como 409', async () => {
    vi.mocked(backend.group).mockRejectedValueOnce(new HttpError(409, 'Grupo alterado.'));
    const res = await request(app)
      .put('/groups/g_test')
      .auth('valid', { type: 'bearer' })
      .send({
        expectedRevision: 1,
        group: {
          name: 'Grupo',
          photoUrl: '',
          memberIds: ['alice', 'bob'],
          memberLimit: 2,
          notificationPolicy: 'disabled',
        },
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Grupo alterado.');
  });
  it('não aceita senderId forjado', async () => {
    const res = await request(app)
      .post('/conversations/g_test/messages')
      .auth('valid', { type: 'bearer' })
      .send({
        messageId: '12345678-1234-4234-9234-123456789012',
        senderId: 'bob',
        text: 'Oi',
        target: { type: 'conversation' },
        mentionedUserIds: [],
      });
    expect(res.status).toBe(400);
    expect(backend.sendMessage).not.toHaveBeenCalled();
  });
  it('readiness falha se Firebase estiver indisponível', async () => {
    vi.mocked(backend.health).mockRejectedValueOnce(new Error('down'));
    expect((await request(app).get('/ready')).status).toBe(503);
  });
});
