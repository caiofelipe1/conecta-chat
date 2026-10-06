import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { z } from 'zod';
import {
  directorySchema,
  directSchema,
  groupSchema,
  type Conversation,
  type DirectoryUser,
} from '../../shared/domain';
import { firestore } from '../services/firebase';
import { errorText } from '../services/api';
export function useConversations(uid: string) {
  const [direct, setDirect] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [pending, setPending] = useState(3);
  const [error, setError] = useState('');
  useEffect(() => {
    setDirect([]);
    setGroups([]);
    setUsers([]);
    setPending(3);
    setError('');
    const seen = new Set<number>();
    const done = (key: number) => {
      if (!seen.has(key)) {
        seen.add(key);
        setPending((count) => count - 1);
      }
    };
    const fail = (key: number, err: unknown) => {
      setError(errorText(err));
      done(key);
    };
    const disposers = [
      onSnapshot(
        query(
          collection(firestore(), 'directConversations'),
          where('participantIds', 'array-contains', uid),
        ),
        (snapshot) => {
          try {
            setDirect(snapshot.docs.map((doc) => directSchema.parse(doc.data())));
            done(0);
          } catch (err) {
            fail(0, err);
          }
        },
        (err) => fail(0, err),
      ),
      onSnapshot(
        query(collection(firestore(), 'groups'), where('memberIds', 'array-contains', uid)),
        (snapshot) => {
          try {
            setGroups(snapshot.docs.map((doc) => groupSchema.parse(doc.data())));
            done(1);
          } catch (err) {
            fail(1, err);
          }
        },
        (err) => fail(1, err),
      ),
      onSnapshot(
        collection(firestore(), 'directory'),
        (snapshot) => {
          try {
            setUsers(z.array(directorySchema).parse(snapshot.docs.map((doc) => doc.data())));
            done(2);
          } catch (err) {
            fail(2, err);
          }
        },
        (err) => fail(2, err),
      ),
    ];
    return () => disposers.forEach((dispose) => dispose());
  }, [uid]);
  const conversations = useMemo(
    () => [...direct, ...groups].sort((a, b) => b.createdAt - a.createdAt),
    [direct, groups],
  );
  return { conversations, users, loading: pending > 0, error };
}
