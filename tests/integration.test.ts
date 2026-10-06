import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { deleteApp } from 'firebase-admin/app';
import { createFirebaseServices, type FirebaseServices } from '../server/src/firebaseAdmin';
import { FirebaseBackend } from '../server/src/backend';
import { groupInputSchema, type ChatGroup } from '../shared/domain';
import { bypassProxyForLocalEmulators } from './emulatorEnvironment';
let firebase: FirebaseServices;
let backend: FirebaseBackend;
let group: ChatGroup;
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_DATABASE_EMULATOR_HOST)
    throw new Error('Execute npm run test:integration.');
  bypassProxyForLocalEmulators();
  process.env.FIREBASE_PROJECT_ID = 'demo-conecta';
  process.env.FIREBASE_DATABASE_URL = 'https://demo-conecta-default-rtdb.firebaseio.com';
  process.env.FIREBASE_STORAGE_BUCKET = 'demo-conecta.appspot.com';
  firebase = createFirebaseServices();
  backend = new FirebaseBackend(firebase);
  for (const uid of ['alice', 'bob', 'carol', 'dave'])
    await backend.saveProfile(uid, `${uid}@example.com`, {
      name: uid,
      phoneNumber: '11999999999',
      birthDate: '2000-01-01',
      photoUrl: '',
    });
  group = await backend.group('alice', null, {
    name: 'Teste',
    photoUrl: '',
    memberIds: ['alice', 'bob'],
    memberLimit: 3,
    notificationPolicy: 'all_group_messages',
  });
}, 30000);
afterAll(async () => {
  vi.restoreAllMocks();
  if (firebase) await deleteApp(firebase.auth.app);
});
describe('Firebase real em emuladores (não substitui aparelho)', () => {
  it('verifica ID Token real de conta e-mail/senha no emulador Auth', async () => {
    const response = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test-only`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${randomUUID()}@example.com`,
          password: 'test-password-only',
          returnSecureToken: true,
        }),
      },
    );
    const token = z
      .object({ idToken: z.string(), localId: z.string(), email: z.string() })
      .parse(await response.json());
    expect(await backend.verifyToken(token.idToken)).toEqual({
      uid: token.localId,
      email: token.email,
    });
  });
  it('rejeita ID Token inválido no Firebase Admin', async () => {
    await expect(backend.verifyToken('not-a-firebase-token')).rejects.toThrow();
  });
  it('criação concorrente retorna uma única conversa direta', async () => {
    const results = await Promise.all([
      backend.direct('alice', 'bob'),
      backend.direct('bob', 'alice'),
    ]);
    expect(results[0]?.id).toBe(results[1]?.id);
    expect((await firebase.firestore.collection('directConversations').get()).size).toBe(1);
  });
  it('rejeita conversa consigo mesmo', async () =>
    expect(backend.direct('alice', 'alice')).rejects.toMatchObject({ status: 400 }));
  it('perfil privado exige conversa em comum', async () => {
    await expect(backend.profile('dave', 'alice')).rejects.toMatchObject({ status: 403 });
    expect((await backend.profile('bob', 'alice')).uid).toBe('alice');
  });
  it('não proprietário não altera o grupo', async () =>
    expect(
      backend.group(
        'bob',
        group.id,
        {
          name: group.name,
          photoUrl: '',
          memberIds: group.memberIds,
          memberLimit: group.memberLimit,
          notificationPolicy: group.notificationPolicy,
        },
        group.revision,
      ),
    ).rejects.toMatchObject({ status: 403 }));
  it('duas entradas concorrentes não ultrapassam a capacidade', async () => {
    const base = {
      name: group.name,
      photoUrl: '',
      memberIds: group.memberIds,
      memberLimit: 3,
      notificationPolicy: group.notificationPolicy,
    };
    const results = await Promise.allSettled([
      backend.group(
        'alice',
        group.id,
        { ...base, memberIds: [...group.memberIds, 'carol'] },
        group.revision,
      ),
      backend.group(
        'alice',
        group.id,
        { ...base, memberIds: [...group.memberIds, 'dave'] },
        group.revision,
      ),
    ]);
    expect(results.filter((value) => value.status === 'fulfilled')).toHaveLength(1);
    const current = await backend.conversation('alice', group.id);
    expect(current.type).toBe('group');
    if (current.type === 'group') {
      expect(current.memberIds).toHaveLength(3);
      expect(current.revision).toBe(2);
      group = current;
    }
  });
  it('persiste mensagem e repetir o mesmo ID não duplica', async () => {
    const input = {
      messageId: randomUUID(),
      text: 'Mensagem real de teste',
      target: { type: 'conversation' as const },
      mentionedUserIds: [],
    };
    const [first, second] = await Promise.all([
      backend.sendMessage('alice', group.id, input),
      backend.sendMessage('alice', group.id, input),
    ]);
    expect(first.id).toBe(second.id);
    expect(
      Object.keys((await firebase.database.ref(`streams/${group.id}/messages`).get()).val()),
    ).toHaveLength(1);
  });
  it('não participante não envia mensagem', async () => {
    const excluded = group.memberIds.includes('carol') ? 'dave' : 'carol';
    await expect(
      backend.sendMessage(excluded, group.id, {
        messageId: randomUUID(),
        text: 'fraude',
        target: { type: 'conversation' },
        mentionedUserIds: [],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('token não pertence simultaneamente a duas contas', async () => {
    const token = 'fake-test-token-which-is-long-enough';
    const firstId = randomUUID();
    const secondId = randomUUID();
    await backend.saveDevice('alice', firstId, { token, enabled: true, platform: 'android' });
    await backend.saveDevice('bob', secondId, { token, enabled: true, platform: 'android' });
    expect((await firebase.firestore.doc(`users/alice/devices/${firstId}`).get()).exists).toBe(
      false,
    );
    expect((await firebase.firestore.doc(`users/bob/devices/${secondId}`).get()).exists).toBe(true);
  });
  it('notificação repetida chama FCM apenas uma vez', async () => {
    const send = vi.spyOn(firebase.messaging, 'sendEachForMulticast').mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'fcm-test-id' }],
    });
    const message = await backend.sendMessage('alice', group.id, {
      messageId: randomUUID(),
      text: 'Push real separado do teste',
      target: { type: 'member', memberId: 'bob' },
      mentionedUserIds: ['bob'],
    });
    const results = await Promise.all([
      backend.notify('alice', group.id, message.id),
      backend.notify('alice', group.id, message.id),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.some((value) => value.status === 'sent')).toBe(true);
    const payload = send.mock.calls[0]?.[0];
    expect(payload?.data).toMatchObject({ conversationId: group.id, conversationType: 'group' });
    expect(payload?.notification?.body).not.toContain(message.text);
    send.mockRestore();
  });
  it('somente remetente solicita push', async () => {
    const message = await backend.sendMessage('alice', group.id, {
      messageId: randomUUID(),
      text: 'Oi',
      target: { type: 'conversation' },
      mentionedUserIds: [],
    });
    await expect(backend.notify('bob', group.id, message.id)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('FCM desativa token inválido', async () => {
    const devices = await firebase.firestore.collection('users/bob/devices').get();
    const invalidError = Object.assign(new Error('Token expirado de teste'), {
      code: 'messaging/registration-token-not-registered',
      toJSON: () => ({ code: 'messaging/registration-token-not-registered' }),
    });
    const send = vi
      .spyOn(firebase.messaging, 'sendEachForMulticast')
      .mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: invalidError }],
      });
    const message = await backend.sendMessage('alice', group.id, {
      messageId: randomUUID(),
      text: 'Teste de token inválido',
      target: { type: 'member', memberId: 'bob' },
      mentionedUserIds: ['bob'],
    });
    const result = await backend.notify('alice', group.id, message.id);
    expect(result.failed).toBe(1);
    expect((await devices.docs[0]!.ref.get()).data()?.enabled).toBe(false);
    send.mockRestore();
  });
  it('resposta FCM de token antigo preserva renovação concorrente', async () => {
    const devices = await firebase.firestore.collection('users/bob/devices').get();
    const id = devices.docs[0]!.id;
    await backend.saveDevice('bob', id, {
      token: 'old-fcm-token-long-enough-for-test',
      enabled: true,
      platform: 'android',
    });
    const error = Object.assign(new Error('Token antigo inválido'), {
      code: 'messaging/registration-token-not-registered',
      toJSON: () => ({ code: 'messaging/registration-token-not-registered' }),
    });
    const send = vi
      .spyOn(firebase.messaging, 'sendEachForMulticast')
      .mockImplementationOnce(async () => {
        await backend.saveDevice('bob', id, {
          token: 'renewed-fcm-token-long-enough-for-test',
          enabled: true,
          platform: 'android',
        });
        return { successCount: 0, failureCount: 1, responses: [{ success: false, error }] };
      });
    const message = await backend.sendMessage('alice', group.id, {
      messageId: randomUUID(),
      text: 'Teste de renovação',
      target: { type: 'member', memberId: 'bob' },
      mentionedUserIds: ['bob'],
    });
    await backend.notify('alice', group.id, message.id);
    const device = (await firebase.firestore.doc(`users/bob/devices/${id}`).get()).data();
    expect(device?.enabled).toBe(true);
    expect(device?.token).toBe('renewed-fcm-token-long-enough-for-test');
    send.mockRestore();
  });
  it('remoção atualiza a ACL e rejeita novos envios', async () => {
    const base = {
      name: group.name,
      photoUrl: '',
      memberIds: group.memberIds.filter((uid) => uid !== 'bob'),
      memberLimit: 3,
      notificationPolicy: group.notificationPolicy,
    };
    group = await backend.group('alice', group.id, base, group.revision);
    expect(
      (await firebase.database.ref(`streams/${group.id}/access/memberIds/bob`).get()).exists(),
    ).toBe(false);
    await expect(
      backend.sendMessage('bob', group.id, {
        messageId: randomUUID(),
        text: 'Não permitido',
        target: { type: 'conversation' },
        mentionedUserIds: [],
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      backend.profile(
        'bob',
        group.memberIds.find((uid) => uid !== 'alice')!,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
