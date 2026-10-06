import { useCallback, useEffect, useState } from 'react';
import { onValue, ref } from '@react-native-firebase/database';
import type { ChatMessage } from '../../shared/domain';
import { listenMessages } from '../services/chatService';
import { database } from '../services/firebase';
import { errorText } from '../services/api';
export function useChat(id: string, uid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [count, setCount] = useState(100);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setError('');
    setBlocked(false);
    let stopMessages: (() => void) | null = null;
    const fail = (err: unknown) => {
      setMessages([]);
      setBlocked(true);
      setError(errorText(err));
      setLoading(false);
      stopMessages?.();
      stopMessages = null;
    };
    const stopAccess = onValue(
      ref(database(), `streams/${id}/access`),
      (snapshot) => {
        const raw: unknown = snapshot.val();
        const active =
          typeof raw === 'object' && raw !== null && 'state' in raw && raw.state === 'active';
        if (!active) {
          stopMessages?.();
          stopMessages = null;
          setMessages([]);
          setBlocked(true);
          setLoading(false);
          setError('Conversa indisponível durante a atualização.');
        } else if (!stopMessages) {
          setBlocked(false);
          setError('');
          setLoading(true);
          stopMessages = listenMessages(
            id,
            count,
            (next) => {
              setMessages(next);
              setLoading(false);
            },
            fail,
          );
        }
      },
      fail,
    );
    return () => {
      stopMessages?.();
      stopAccess();
    };
  }, [id, uid, count]);
  const loadOlder = useCallback(() => setCount((value) => value + 100), []);
  return { messages, error, loading, blocked, loadOlder, count };
}
