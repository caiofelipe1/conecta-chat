import { PermissionsAndroid, Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import {
  getToken,
  deleteToken,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { z } from 'zod';
import type { NotificationResult } from '../../shared/domain';
import { messaging, firestore, auth } from './firebase';
import { apiRequest } from './api';

const receiptSchema = z.object({
  status: z.enum(['sent', 'skipped', 'processing', 'failed', 'uncertain']),
  sent: z.number().optional(),
  failed: z.number().optional(),
});
// ID por instalação e usuário: fica em preferências privadas do próprio usuário e é recuperado pela sessão.
let currentDeviceId: string | null = null;
let paused = false;
let permissionGranted = false;
const pendingWrites = new Set<Promise<void>>();
export function resumeNotifications() {
  paused = false;
  permissionGranted = false;
}
async function notificationPermissionDenied(message: string): Promise<string> {
  permissionGranted = false;
  await Promise.allSettled([...pendingWrites]);
  if (currentDeviceId) await apiRequest<void>(`/devices/${currentDeviceId}`, 'DELETE');
  return message;
}
export async function deviceId(): Promise<string> {
  if (currentDeviceId) return currentDeviceId;
  // Token estável identifica a instalação; o ID aleatório evita colocar o token nos paths.
  const token = await getToken(messaging());
  const { digestStringAsync, CryptoDigestAlgorithm } = await import('expo-crypto');
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, token);
  const user = auth().currentUser;
  if (!user) throw new Error('Entre na sua conta.');
  const preference = doc(firestore(), `users/${user.uid}/installations/${hash}`);
  const existing = await getDoc(preference);
  const raw: unknown = existing.data();
  const parsed = z.object({ id: z.uuid() }).safeParse(raw);
  const id = parsed.success ? parsed.data.id : randomUUID();
  if (!parsed.success) await setDoc(preference, { id });
  currentDeviceId = id;
  return id;
}
export async function registerNotifications(): Promise<string> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED)
      return notificationPermissionDenied(
        'Notificações bloqueadas. Você pode ativá-las nas configurações do aparelho.',
      );
  }
  if (Platform.OS === 'ios') {
    const permission = await requestPermission(messaging());
    if (
      permission !== AuthorizationStatus.AUTHORIZED &&
      permission !== AuthorizationStatus.PROVISIONAL
    )
      return notificationPermissionDenied('Notificações bloqueadas nas configurações do aparelho.');
  }
  permissionGranted = true;
  const token = await getToken(messaging());
  if (!token) return 'Este dispositivo ainda não disponibilizou um token de notificação.';
  await saveToken(token);
  return 'Notificações ativadas neste dispositivo.';
}
export async function saveToken(token: string) {
  if (paused || !permissionGranted) return;
  const operation = (async () => {
    const id = await deviceId();
    if (paused || !permissionGranted) return;
    await apiRequest<void>(`/devices/${id}`, 'PUT', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      enabled: true,
    });
  })();
  pendingWrites.add(operation);
  try {
    await operation;
  } finally {
    pendingWrites.delete(operation);
  }
}
export async function unregisterNotifications() {
  paused = true;
  permissionGranted = false;
  try {
    // Impede que um refresh de token em andamento recrie o registro após a exclusão.
    await Promise.allSettled([...pendingWrites]);
    if (currentDeviceId) await apiRequest<void>(`/devices/${currentDeviceId}`, 'DELETE');
    await deleteToken(messaging());
    currentDeviceId = null;
  } catch (error) {
    paused = false;
    throw error;
  }
}
export const requestPush = (
  conversationId: string,
  messageId: string,
): Promise<NotificationResult> =>
  apiRequest('/notifications/messages', 'POST', { conversationId, messageId }, receiptSchema);
