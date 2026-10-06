import { z } from 'zod';

export const idSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const conversationIdSchema = z
  .string()
  .min(1)
  .max(600)
  .regex(/^[A-Za-z0-9_-]+$/);
export const policies = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
] as const;
export const policySchema = z.enum(policies);
export type NotificationPolicy = z.infer<typeof policySchema>;
export const photoSchema = z
  .string()
  .max(2048)
  .refine(
    (value) => value === '' || value.startsWith('https://'),
    'Foto deve possuir uma URL HTTPS.',
  );
export const profileInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{8,24}$/, 'Celular inválido.'),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD.')
      .refine((value) => {
        const date = new Date(value + 'T00:00:00Z');
        return (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value &&
          value >= '1900-01-01' &&
          date <= new Date()
        );
      }, 'Data de nascimento inválida.'),
    photoUrl: photoSchema,
  })
  .strict();
export const userSchema = profileInputSchema.extend({
  uid: idSchema,
  email: z.email(),
  createdAt: z.number(),
});
export type ChatUser = z.infer<typeof userSchema>;
export type ProfileInput = z.infer<typeof profileInputSchema>;
export const directorySchema = z.object({ uid: idSchema, name: z.string(), photoUrl: photoSchema });
export type DirectoryUser = z.infer<typeof directorySchema>;
export const groupInputSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    photoUrl: photoSchema,
    memberIds: z.array(idSchema).min(2).max(100),
    memberLimit: z.number().int().min(2).max(100),
    notificationPolicy: policySchema,
  })
  .strict()
  .superRefine((group, ctx) => {
    if (new Set(group.memberIds).size !== group.memberIds.length)
      ctx.addIssue({ code: 'custom', message: 'Integrantes repetidos.' });
    if (group.memberIds.length > group.memberLimit)
      ctx.addIssue({
        code: 'custom',
        message: 'O limite não pode ser menor que a quantidade de integrantes.',
      });
  });
export type GroupInput = z.infer<typeof groupInputSchema>;
export const groupSchema = z.object({
  id: idSchema,
  type: z.literal('group'),
  name: z.string(),
  photoUrl: photoSchema,
  ownerId: idSchema,
  memberIds: z.array(idSchema),
  memberLimit: z.number(),
  notificationPolicy: policySchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  revision: z.number(),
});
export type ChatGroup = z.infer<typeof groupSchema>;
export const directSchema = z.object({
  id: conversationIdSchema,
  type: z.literal('direct'),
  participantIds: z.tuple([idSchema, idSchema]),
  createdAt: z.number(),
  revision: z.number(),
});
export type DirectConversation = z.infer<typeof directSchema>;
export type Conversation = ChatGroup | DirectConversation;
export const targetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('conversation') }).strict(),
  z.object({ type: z.literal('member'), memberId: idSchema }).strict(),
]);
export const messageInputSchema = z
  .object({
    messageId: z.uuid(),
    text: z.string().trim().min(1).max(2000),
    target: targetSchema,
    mentionedUserIds: z.array(idSchema).max(99),
  })
  .strict();
export type MessageInput = z.infer<typeof messageInputSchema>;
export const messageSchema = z.object({
  id: z.uuid(),
  conversationId: conversationIdSchema,
  conversationType: z.enum(['direct', 'group']),
  senderId: idSchema,
  text: z.string(),
  target: targetSchema,
  mentionedUserIds: z.array(idSchema).default([]),
  createdAt: z.number(),
});
export type ChatMessage = z.infer<typeof messageSchema>;
export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};
export const deviceSchema = z
  .object({
    token: z.string().min(20).max(4096),
    platform: z.enum(['android', 'ios']),
    enabled: z.boolean(),
  })
  .strict();
export type DeviceInput = z.infer<typeof deviceSchema>;
export type Device = DeviceInput & { uid: string; deviceId: string; updatedAt: number };
export type PushPayload = {
  conversationId: string;
  conversationType: 'direct' | 'group';
  messageId: string;
};
export type NotificationResult = {
  status: 'sent' | 'skipped' | 'processing' | 'failed' | 'uncertain';
  sent?: number;
  failed?: number;
};

export function membersOf(conversation: Conversation): string[] {
  return conversation.type === 'group' ? conversation.memberIds : conversation.participantIds;
}
export function directConversationId(first: string, second: string): string {
  if (first === second) throw new Error('Não é permitido conversar consigo mesmo.');
  // Codificação sem colisões mesmo quando os UIDs contêm sublinhados.
  const sorted = [first, second].sort();
  return `d_${sorted.map((uid) => `${uid.length}_${uid}`).join('_')}`;
}
export function resolveRecipients(conversation: Conversation, message: ChatMessage): string[] {
  const members = membersOf(conversation).filter((uid) => uid !== message.senderId);
  if (conversation.type === 'direct') return members;
  if (
    conversation.notificationPolicy === 'disabled' ||
    conversation.notificationPolicy === 'direct_messages_only'
  )
    return [];
  const targets = new Set([
    ...message.mentionedUserIds,
    ...(message.target.type === 'member' ? [message.target.memberId] : []),
  ]);
  if (conversation.notificationPolicy === 'mentioned_members' || message.target.type === 'member')
    return members.filter((uid) => targets.has(uid));
  return members;
}
export function validateTargets(conversation: Conversation, input: MessageInput): boolean {
  const members = membersOf(conversation);
  if (conversation.type === 'direct')
    return input.target.type === 'conversation' && input.mentionedUserIds.length === 0;
  return (
    input.mentionedUserIds.every((uid) => members.includes(uid)) &&
    (input.target.type === 'conversation' || members.includes(input.target.memberId))
  );
}
