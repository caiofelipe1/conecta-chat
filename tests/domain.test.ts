import { describe, expect, it } from 'vitest';
import {
  directConversationId,
  groupInputSchema,
  messageSchema,
  profileInputSchema,
  resolveRecipients,
  validateTargets,
  type ChatGroup,
  type ChatMessage,
  type Conversation,
} from '../shared/domain';
const group: ChatGroup = {
  id: 'g_test',
  type: 'group',
  name: 'Grupo',
  photoUrl: '',
  ownerId: 'a',
  memberIds: ['a', 'b', 'c'],
  memberLimit: 3,
  notificationPolicy: 'all_group_messages',
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
};
const message: ChatMessage = {
  id: '12345678-1234-4234-9234-123456789012',
  conversationId: group.id,
  conversationType: 'group',
  senderId: 'a',
  text: 'Olá',
  target: { type: 'conversation' },
  mentionedUserIds: [],
  createdAt: 1,
};
describe('identificação e destinatários', () => {
  it('gera o mesmo ID para um par em ordens diferentes', () =>
    expect(directConversationId('alice', 'bob')).toBe(directConversationId('bob', 'alice')));
  it('não colide quando UIDs contêm separadores', () =>
    expect(directConversationId('a_b', 'c')).not.toBe(directConversationId('a', 'b_c')));
  it('rejeita conversa com o próprio usuário', () =>
    expect(() => directConversationId('a', 'a')).toThrow());
  it('notifica todos exceto remetente em mensagem geral', () =>
    expect(resolveRecipients(group, message)).toEqual(['b', 'c']));
  it('direcionamento explícito notifica apenas o selecionado', () =>
    expect(
      resolveRecipients(group, { ...message, target: { type: 'member', memberId: 'b' } }),
    ).toEqual(['b']));
  it('menções excluem não participantes e o remetente', () =>
    expect(
      resolveRecipients(
        { ...group, notificationPolicy: 'mentioned_members' },
        { ...message, mentionedUserIds: ['a', 'c', 'fora'] },
      ),
    ).toEqual(['c']));
  it('nenhuma menção não notifica com política mentioned_members', () =>
    expect(
      resolveRecipients({ ...group, notificationPolicy: 'mentioned_members' }, message),
    ).toEqual([]));
  it.each(['disabled', 'direct_messages_only'] as const)(
    'política %s não gera push de grupo',
    (policy) =>
      expect(resolveRecipients({ ...group, notificationPolicy: policy }, message)).toEqual([]),
  );
  it('conversa direta notifica o outro participante', () => {
    const conversation: Conversation = {
      id: 'd_test',
      type: 'direct',
      participantIds: ['a', 'b'],
      createdAt: 1,
      revision: 1,
    };
    expect(resolveRecipients(conversation, { ...message, conversationType: 'direct' })).toEqual([
      'b',
    ]);
  });
  it('rejeita alvo fora do grupo', () =>
    expect(
      validateTargets(group, {
        messageId: message.id,
        text: 'Oi',
        target: { type: 'member', memberId: 'fora' },
        mentionedUserIds: [],
      }),
    ).toBe(false));
});
describe('validação de dados', () => {
  const input = {
    name: group.name,
    photoUrl: '',
    memberIds: group.memberIds,
    memberLimit: group.memberLimit,
    notificationPolicy: group.notificationPolicy,
  };
  it.each([1, 2, 2.5, 101])('rejeita limite %s para três integrantes', (memberLimit) =>
    expect(groupInputSchema.safeParse({ ...input, memberLimit }).success).toBe(false),
  );
  it('rejeita membros duplicados', () =>
    expect(groupInputSchema.safeParse({ ...input, memberIds: ['a', 'a'] }).success).toBe(false));
  it('aceita limite igual à ocupação', () =>
    expect(groupInputSchema.safeParse(input).success).toBe(true));
  it.each(['2025-02-30', '2999-01-01', '31/01/2000'])(
    'rejeita nascimento inválido %s',
    (birthDate) =>
      expect(
        profileInputSchema.safeParse({
          name: 'Teste',
          photoUrl: '',
          phoneNumber: '+5511999999999',
          birthDate,
        }).success,
      ).toBe(false),
  );
  it('não aceita foto Base64', () =>
    expect(
      profileInputSchema.safeParse({
        name: 'Teste',
        photoUrl: 'data:image/png;base64,AAA',
        phoneNumber: '11999999999',
        birthDate: '2000-01-01',
      }).success,
    ).toBe(false));
  it('normaliza lista vazia ausente no Realtime Database', () => {
    const { mentionedUserIds: _mentions, ...stored } = message;
    expect(messageSchema.parse(stored).mentionedUserIds).toEqual([]);
  });
});
