import { onValue, ref, query, orderByChild, limitToLast } from '@react-native-firebase/database';
import { z } from 'zod';
import {
  directSchema,
  groupSchema,
  messageSchema,
  type ChatMessage,
  type MessageInput,
} from '../../shared/domain';
import { database } from './firebase';
import { apiRequest } from './api';
export const conversationSchema = z.union([directSchema, groupSchema]);
export const getConversation = (id: string) =>
  apiRequest(`/conversations/${id}`, 'GET', undefined, conversationSchema);
export const startDirect = (otherUid: string) =>
  apiRequest('/conversations/direct', 'POST', { otherUid }, directSchema);
export const sendMessage = (id: string, input: MessageInput) =>
  apiRequest(`/conversations/${id}/messages`, 'POST', input, messageSchema);
export function listenMessages(
  id: string,
  count: number,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (error: unknown) => void,
) {
  return onValue(
    query(ref(database(), `streams/${id}/messages`), orderByChild('createdAt'), limitToLast(count)),
    (snapshot) => {
      try {
        const raw: unknown = snapshot.val();
        const data = raw === null ? {} : z.record(z.string(), messageSchema).parse(raw);
        onMessages(
          Object.values(data).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)),
        );
      } catch (error) {
        onError(error);
      }
    },
    onError,
  );
}
