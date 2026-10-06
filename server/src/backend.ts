import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  userSchema,
  directorySchema,
  directSchema,
  groupSchema,
  groupInputSchema,
  messageSchema,
  directConversationId,
  membersOf,
  resolveRecipients,
  validateTargets,
  type ChatUser,
  type DirectoryUser,
  type ProfileInput,
  type GroupInput,
  type Conversation,
  type ChatGroup,
  type MessageInput,
  type ChatMessage,
  type DeviceInput,
  type Device,
  type NotificationResult,
} from '../../shared/domain.js';
import type { ChatBackend } from './contracts.js';
import type { FirebaseServices } from './firebaseAdmin.js';
import { HttpError } from './errors.js';

const accessSchema = z.object({
  state: z.enum(['active', 'updating']),
  revision: z.number(),
  memberIds: z.record(z.string(), z.boolean()),
  operationId: z.string().optional(),
});
const streamSchema = z.object({
  access: accessSchema,
  messages: z.record(z.string(), messageSchema).optional(),
});
const deviceRecordSchema = z.object({
  uid: z.string(),
  deviceId: z.string(),
  token: z.string(),
  platform: z.enum(['android', 'ios']),
  enabled: z.boolean(),
  updatedAt: z.number(),
});
const notificationResultSchema = z.object({
  status: z.enum(['sent', 'skipped', 'processing', 'failed', 'uncertain']),
  sent: z.number().optional(),
  failed: z.number().optional(),
});

export class FirebaseBackend implements ChatBackend {
  constructor(private firebase: FirebaseServices) {}
  async health() {
    await Promise.all([
      this.firebase.firestore.doc('system/health').get(),
      this.firebase.database.ref('system/health').get(),
    ]);
  }
  async verifyToken(token: string) {
    const decoded = await this.firebase.auth.verifyIdToken(token, true);
    if (decoded.firebase.sign_in_provider !== 'password' || !decoded.email)
      throw new HttpError(401, 'Autenticação permitida apenas por e-mail e senha.');
    return { uid: decoded.uid, email: decoded.email };
  }
  private checkPhoto(uid: string, value: string) {
    if (!value) return;
    const url = new URL(value);
    const match = /^\/v0\/b\/([^/]+)\/o\/(.+)$/.exec(url.pathname);
    if (
      url.hostname !== 'firebasestorage.googleapis.com' ||
      !match?.[1] ||
      !match[2] ||
      match[1] !== process.env.FIREBASE_STORAGE_BUCKET ||
      !decodeURIComponent(match[2]).startsWith(`users/${uid}/`)
    ) {
      throw new HttpError(
        400,
        'A foto deve ser enviada ao Storage da equipe pelo próprio usuário.',
      );
    }
  }
  async saveProfile(uid: string, email: string, input: ProfileInput): Promise<ChatUser> {
    this.checkPhoto(uid, input.photoUrl);
    const ref = this.firebase.firestore.doc(`users/${uid}`);
    return this.firebase.firestore.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      const parsed = previous.exists ? userSchema.parse(previous.data()) : null;
      const profile: ChatUser = {
        ...input,
        uid,
        email,
        createdAt: parsed?.createdAt ?? Date.now(),
      };
      tx.set(ref, profile);
      tx.set(this.firebase.firestore.doc(`directory/${uid}`), {
        uid,
        name: input.name,
        photoUrl: input.photoUrl,
      });
      return profile;
    });
  }
  async directory(): Promise<DirectoryUser[]> {
    const snapshot = await this.firebase.firestore.collection('directory').orderBy('name').get();
    return snapshot.docs.map((doc) => directorySchema.parse(doc.data()));
  }
  private async requireProfiles(ids: string[]) {
    const snapshots = await this.firebase.firestore.getAll(
      ...ids.map((uid) => this.firebase.firestore.doc(`users/${uid}`)),
    );
    if (snapshots.some((doc) => !doc.exists))
      throw new HttpError(400, 'Um integrante ainda não concluiu o cadastro.');
  }
  async profile(uid: string, targetUid: string): Promise<ChatUser> {
    if (uid !== targetUid) {
      const [direct, groups] = await Promise.all([
        this.firebase.firestore
          .doc(`directConversations/${directConversationId(uid, targetUid)}`)
          .get(),
        this.firebase.firestore
          .collection('groups')
          .where('memberIds', 'array-contains', uid)
          .get(),
      ]);
      const common =
        direct.exists ||
        groups.docs.some((doc) => groupSchema.parse(doc.data()).memberIds.includes(targetUid));
      if (!common)
        throw new HttpError(
          403,
          'Perfil disponível somente a participantes de uma conversa em comum.',
        );
    }
    const profile = await this.firebase.firestore.doc(`users/${targetUid}`).get();
    if (!profile.exists) throw new HttpError(404, 'Cadastro ainda não concluído.');
    return userSchema.parse(profile.data());
  }
  async conversation(uid: string, id: string): Promise<Conversation> {
    const [direct, group] = await Promise.all([
      this.firebase.firestore.doc(`directConversations/${id}`).get(),
      this.firebase.firestore.doc(`groups/${id}`).get(),
    ]);
    const conversation = direct.exists
      ? directSchema.parse(direct.data())
      : group.exists
        ? groupSchema.parse(group.data())
        : null;
    if (!conversation) throw new HttpError(404, 'Conversa não encontrada.');
    if (!membersOf(conversation).includes(uid))
      throw new HttpError(403, 'Você não participa desta conversa.');
    return conversation;
  }
  async direct(uid: string, otherUid: string): Promise<Conversation> {
    if (uid === otherUid) throw new HttpError(400, 'Não é permitido conversar consigo mesmo.');
    await this.requireProfiles([uid, otherUid]);
    const id = directConversationId(uid, otherUid);
    const doc = this.firebase.firestore.doc(`directConversations/${id}`);
    const conversation = await this.firebase.firestore.runTransaction(async (tx) => {
      const snapshot = await tx.get(doc);
      if (snapshot.exists) return directSchema.parse(snapshot.data());
      const value: Conversation = {
        id,
        type: 'direct',
        participantIds: [uid, otherUid],
        createdAt: Date.now(),
        revision: 1,
      };
      tx.create(doc, value);
      return value;
    });
    const result = await this.firebase.database.ref(`streams/${id}/access`).transaction(
      (raw: unknown) =>
        raw ?? {
          state: 'active',
          revision: 1,
          memberIds: { [uid]: true, [otherUid]: true },
        },
    );
    if (!result.committed)
      throw new HttpError(503, 'Não foi possível preparar a conversa. Tente novamente.');
    return conversation;
  }
  async group(
    uid: string,
    requestedId: string | null,
    input: GroupInput,
    expectedRevision?: number,
  ): Promise<ChatGroup> {
    input = groupInputSchema.parse(input);
    if (!input.memberIds.includes(uid))
      throw new HttpError(400, 'O proprietário deve permanecer no grupo.');
    this.checkPhoto(uid, input.photoUrl);
    await this.requireProfiles(input.memberIds);
    const id = requestedId ?? `g_${randomUUID()}`;
    const groupRef = this.firebase.firestore.doc(`groups/${id}`);
    const lockRef = this.firebase.firestore.doc(`conversationLocks/${id}`);
    const operationId = randomUUID();
    let next: ChatGroup;
    next = await this.firebase.firestore.runTransaction(async (tx) => {
      const [existing, lock] = await Promise.all([tx.get(groupRef), tx.get(lockRef)]);
      if (lock.exists)
        throw new HttpError(
          409,
          'O grupo está sendo atualizado. Aguarde; se persistir, solicite recuperação ao administrador.',
        );
      if (requestedId && !existing.exists) throw new HttpError(404, 'Grupo não encontrado.');
      const old = existing.exists ? groupSchema.parse(existing.data()) : null;
      if (old && old.ownerId !== uid)
        throw new HttpError(403, 'Somente o proprietário pode editar o grupo.');
      if (old && old.revision !== expectedRevision)
        throw new HttpError(
          409,
          'Outro dispositivo alterou o grupo. Reabra a edição antes de salvar.',
        );
      const group: ChatGroup = {
        ...input,
        id,
        type: 'group',
        ownerId: uid,
        revision: (old?.revision ?? 0) + 1,
        createdAt: old?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      // Lock persistente sem expiração automática: nenhum processo antigo pode voltar a escrever após uma retomada concorrente.
      tx.create(lockRef, {
        operationId,
        ownerId: uid,
        createdAt: Date.now(),
        previous: old,
        next: group,
      });
      return group;
    });
    // Barreira de leitura antes de publicar novos metadados. Falhas deixam o grupo fechado (fail closed).
    const streamRef = this.firebase.database.ref(`streams/${id}`);
    await streamRef.child('access/state').set('updating');
    await this.firebase.firestore.runTransaction(async (tx) => {
      const lock = await tx.get(lockRef);
      if (lock.data()?.operationId !== operationId)
        throw new HttpError(409, 'Atualização em conflito.');
      tx.set(groupRef, next);
    });
    await streamRef.child('access').set({
      state: 'active',
      revision: next.revision,
      memberIds: Object.fromEntries(next.memberIds.map((member) => [member, true])),
    });
    await this.firebase.firestore.runTransaction(async (tx) => {
      const lock = await tx.get(lockRef);
      if (lock.data()?.operationId === operationId) tx.delete(lockRef);
    });
    return next;
  }
  async sendMessage(
    uid: string,
    conversationId: string,
    input: MessageInput,
  ): Promise<ChatMessage> {
    const conversation = await this.conversation(uid, conversationId);
    if (!validateTargets(conversation, input))
      throw new HttpError(400, 'Destinatário ou menção inválida para esta conversa.');
    const message: ChatMessage = {
      id: input.messageId,
      conversationId,
      conversationType: conversation.type,
      senderId: uid,
      text: input.text,
      target: input.target,
      mentionedUserIds: [...new Set(input.mentionedUserIds)],
      createdAt: Date.now(),
    };
    let rejection = 'Conversa sendo atualizada. Tente novamente.';
    const streamRef = this.firebase.database.ref(`streams/${conversationId}`);
    // O callback inicial do SDK pode receber null mesmo quando o servidor possui dados.
    // Usar o snapshot como proposta inicial permite ao servidor detectar conflito e repetir
    // o callback com seu valor atual; nenhuma gravação ignora a comparação da transação.
    const bootstrap: unknown = (await streamRef.once('value')).val();
    const result = await streamRef.transaction((raw: unknown) => {
      const parsed = streamSchema.safeParse(raw ?? bootstrap);
      if (!parsed.success) return;
      const stream = parsed.data;
      if (
        stream.access.state !== 'active' ||
        stream.access.revision !== conversation.revision ||
        stream.access.memberIds[uid] !== true
      )
        return;
      const previous = stream.messages?.[input.messageId];
      if (previous) {
        if (
          previous.senderId !== uid ||
          previous.text !== message.text ||
          JSON.stringify(previous.target) !== JSON.stringify(message.target) ||
          JSON.stringify(previous.mentionedUserIds) !== JSON.stringify(message.mentionedUserIds)
        ) {
          rejection = 'Identificador já utilizado para outra mensagem.';
          return;
        }
        return stream;
      }
      return { ...stream, messages: { ...stream.messages, [message.id]: message } };
    });
    if (!result.committed) throw new HttpError(409, rejection);
    return messageSchema.parse(result.snapshot.child(`messages/${input.messageId}`).val());
  }
  async saveDevice(uid: string, deviceId: string, input: DeviceInput) {
    const ownerRef = this.firebase.firestore.doc(
      `tokenOwners/${createHash('sha256').update(input.token).digest('hex')}`,
    );
    const deviceRef = this.firebase.firestore.doc(`users/${uid}/devices/${deviceId}`);
    await this.firebase.firestore.runTransaction(async (tx) => {
      const [owner, old] = await Promise.all([tx.get(ownerRef), tx.get(deviceRef)]);
      const ownerData = owner.exists
        ? z.object({ uid: z.string(), deviceId: z.string() }).parse(owner.data())
        : null;
      const oldData = old.exists ? deviceRecordSchema.parse(old.data()) : null;
      if (ownerData && (ownerData.uid !== uid || ownerData.deviceId !== deviceId))
        tx.delete(
          this.firebase.firestore.doc(`users/${ownerData.uid}/devices/${ownerData.deviceId}`),
        );
      if (oldData && oldData.token !== input.token)
        tx.delete(
          this.firebase.firestore.doc(
            `tokenOwners/${createHash('sha256').update(oldData.token).digest('hex')}`,
          ),
        );
      tx.set(ownerRef, { uid, deviceId });
      tx.set(deviceRef, { ...input, uid, deviceId, updatedAt: Date.now() } satisfies Device);
    });
  }
  async deleteDevice(uid: string, deviceId: string) {
    const deviceRef = this.firebase.firestore.doc(`users/${uid}/devices/${deviceId}`);
    await this.firebase.firestore.runTransaction(async (tx) => {
      const device = await tx.get(deviceRef);
      if (!device.exists) return;
      const data = deviceRecordSchema.parse(device.data());
      const ownerRef = this.firebase.firestore.doc(
        `tokenOwners/${createHash('sha256').update(data.token).digest('hex')}`,
      );
      const owner = await tx.get(ownerRef);
      if (owner.data()?.uid === uid && owner.data()?.deviceId === deviceId) tx.delete(ownerRef);
      tx.delete(deviceRef);
    });
  }
  async notify(
    uid: string,
    conversationId: string,
    messageId: string,
  ): Promise<NotificationResult> {
    let conversation = await this.conversation(uid, conversationId);
    const snapshot = await this.firebase.database
      .ref(`streams/${conversationId}/messages/${messageId}`)
      .get();
    if (!snapshot.exists()) throw new HttpError(404, 'Mensagem não encontrada.');
    const message = messageSchema.parse(snapshot.val());
    if (message.senderId !== uid || message.conversationId !== conversationId)
      throw new HttpError(403, 'Somente o remetente pode solicitar esta notificação.');
    const receiptRef = this.firebase.firestore.doc(
      `notificationReceipts/${createHash('sha256').update(`${conversationId}/${messageId}`).digest('hex')}`,
    );
    const previous = await this.firebase.firestore.runTransaction(async (tx) => {
      const receipt = await tx.get(receiptRef);
      if (receipt.exists) return notificationResultSchema.parse(receipt.data());
      tx.create(receiptRef, {
        status: 'processing',
        conversationId,
        messageId,
        createdAt: Date.now(),
      });
      return null;
    });
    if (previous) return previous;
    let attempted = false;
    try {
      // Reconsulta depois da reserva: nenhum destinatário é fornecido pelo cliente.
      conversation = await this.conversation(uid, conversationId);
      const access = accessSchema.parse(
        (await this.firebase.database.ref(`streams/${conversationId}/access`).get()).val(),
      );
      if (access.state !== 'active' || access.revision !== conversation.revision)
        throw new HttpError(409, 'Grupo sendo atualizado.');
      const recipients = resolveRecipients(conversation, message).filter(
        (member) => access.memberIds[member] === true,
      );
      const snapshots = await Promise.all(
        recipients.map((member) =>
          this.firebase.firestore
            .collection(`users/${member}/devices`)
            .where('enabled', '==', true)
            .get(),
        ),
      );
      const uniqueDevices = new Map<string, Device>();
      snapshots
        .flatMap((devices) => devices.docs)
        .forEach((doc) => {
          const device = deviceRecordSchema.parse(doc.data());
          if (recipients.includes(device.uid)) uniqueDevices.set(device.token, device);
        });
      const devices = [...uniqueDevices.values()];
      if (devices.length === 0) {
        await receiptRef.update({ status: 'skipped', sent: 0, finishedAt: Date.now() });
        return { status: 'skipped', sent: 0 };
      }
      let sent = 0;
      let failed = 0;
      // Cada lote é enviado uma única vez. Não retentar respostas de rede ambíguas do FCM.
      for (let offset = 0; offset < devices.length; offset += 500) {
        const batch = devices.slice(offset, offset + 500);
        attempted = true;
        const response = await this.firebase.messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          notification: { title: 'Conecta Chat', body: 'Você recebeu uma nova mensagem.' },
          data: { conversationId, conversationType: conversation.type, messageId },
          android: { priority: 'high', notification: { tag: messageId } },
          apns: {
            headers: { 'apns-priority': '10', 'apns-collapse-id': messageId },
            payload: { aps: { sound: 'default' } },
          },
        });
        sent += response.successCount;
        failed += response.failureCount;
        await Promise.all(
          response.responses.map(async (result, index) => {
            const device = batch[index];
            if (!device || result.success) return;
            if (
              [
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered',
              ].includes(result.error?.code ?? '')
            ) {
              // Só elimina o token rejeitado, sem apagar um token renovado na mesma instalação.
              const ref = this.firebase.firestore.doc(
                `users/${device.uid}/devices/${device.deviceId}`,
              );
              await this.firebase.firestore.runTransaction(async (tx) => {
                const current = await tx.get(ref);
                if (current.data()?.token === device.token)
                  tx.update(ref, { enabled: false, updatedAt: Date.now() });
              });
            }
          }),
        );
      }
      const result: NotificationResult = { status: 'sent', sent, failed };
      await receiptRef.update({ ...result, finishedAt: Date.now() });
      return result;
    } catch (error) {
      if (!attempted) {
        // Nenhuma chamada ao FCM ocorreu; liberar a reserva permite retentar com segurança.
        await receiptRef.delete();
        throw error;
      }
      await receiptRef.update({ status: 'uncertain', finishedAt: Date.now() });
      return { status: 'uncertain' };
    }
  }
}
