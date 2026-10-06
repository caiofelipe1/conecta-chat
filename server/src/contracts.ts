import type {
  ChatUser,
  DirectoryUser,
  ProfileInput,
  GroupInput,
  Conversation,
  ChatGroup,
  MessageInput,
  ChatMessage,
  DeviceInput,
  NotificationResult,
} from '../../shared/domain.js';
export interface ChatBackend {
  health(): Promise<void>;
  verifyToken(token: string): Promise<{ uid: string; email: string }>;
  saveProfile(uid: string, email: string, input: ProfileInput): Promise<ChatUser>;
  profile(uid: string, targetUid: string): Promise<ChatUser>;
  directory(): Promise<DirectoryUser[]>;
  direct(uid: string, otherUid: string): Promise<Conversation>;
  conversation(uid: string, id: string): Promise<Conversation>;
  group(
    uid: string,
    id: string | null,
    input: GroupInput,
    expectedRevision?: number,
  ): Promise<ChatGroup>;
  sendMessage(uid: string, conversationId: string, input: MessageInput): Promise<ChatMessage>;
  saveDevice(uid: string, deviceId: string, input: DeviceInput): Promise<void>;
  deleteDevice(uid: string, deviceId: string): Promise<void>;
  notify(uid: string, conversationId: string, messageId: string): Promise<NotificationResult>;
}
