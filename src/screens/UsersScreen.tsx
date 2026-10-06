import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DirectoryUser } from '../../shared/domain';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { UserSelector } from '../components/UserSelector';
import { Button, ErrorMessage, Screen, styles } from '../components/UI';
import { fetchUsers } from '../services/userService';
import { startDirect } from '../services/chatService';
import { errorText } from '../services/api';
export function UsersScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Users'>) {
  const { user } = useAuth();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let alive = true;
    void fetchUsers()
      .then((value) => {
        if (alive) setUsers(value);
      })
      .catch((err) => {
        if (alive) setError(errorText(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const select = async (other: DirectoryUser) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const conversation = await startDirect(other.uid);
      navigation.replace('Chat', { conversationId: conversation.id });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen>
      <Text style={styles.title}>Pessoas</Text>
      <Text style={styles.subtitle}>
        Selecione alguém para conversar. Dados privados ficam disponíveis após criar uma conversa em
        comum.
      </Text>
      <ErrorMessage message={error} />
      {loading && <Text style={styles.subtitle}>Carregando…</Text>}
      <UserSelector users={users} ownUid={user!.uid} onSelect={(other) => void select(other)} />
      <Button title="Atualizar lista" secondary loading={loading} onPress={() => void load()} />
    </Screen>
  );
}
