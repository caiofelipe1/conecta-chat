import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';
import { z } from 'zod';
import type { PushPayload } from '../../shared/domain';
import { messaging } from '../services/firebase';
import {
  registerNotifications,
  resumeNotifications,
  saveToken,
} from '../services/notificationService';
import { errorText } from '../services/api';
const payloadSchema = z.object({
  conversationId: z.string().min(1),
  conversationType: z.enum(['direct', 'group']),
  messageId: z.string(),
});
export function useNotifications(uid: string | null, openChat: (id: string) => void) {
  const [status, setStatus] = useState('');
  const [incoming, setIncoming] = useState<PushPayload | null>(null);
  useEffect(() => {
    setStatus('');
    setIncoming(null);
    if (!uid) return;
    resumeNotifications();
    let active = true;
    const register = () => {
      void registerNotifications()
        .then((text) => {
          if (active) setStatus(text);
        })
        .catch((err) => {
          if (active) setStatus(`Push indisponível: ${errorText(err)}`);
        });
    };
    register();
    const opened = (data: unknown) => {
      const result = payloadSchema.safeParse(data);
      if (active && result.success) openChat(result.data.conversationId);
    };
    const stopMessage = onMessage(messaging(), (message) => {
      const result = payloadSchema.safeParse(message.data);
      if (active && result.success) setIncoming(result.data);
    });
    const stopOpened = onNotificationOpenedApp(messaging(), (message) => opened(message.data));
    const stopToken = onTokenRefresh(messaging(), (token) => {
      void saveToken(token).catch((err) => {
        if (active) setStatus(errorText(err));
      });
    });
    void getInitialNotification(messaging())
      .then((message) => {
        if (message) opened(message.data);
      })
      .catch((err) => {
        if (active) setStatus(errorText(err));
      });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') register();
    });
    return () => {
      active = false;
      stopMessage();
      stopOpened();
      stopToken();
      appState.remove();
    };
  }, [uid, openChat]);
  return { status, incoming, dismiss: () => setIncoming(null) };
}
