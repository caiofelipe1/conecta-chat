import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { membersOf, type Conversation, type DirectoryUser } from '../../shared/domain';
import type { RootStackParamList } from '../navigation/types';
import { Avatar, ErrorMessage, Screen, styles } from '../components/UI';
import { getConversation } from '../services/chatService';
import { fetchUsers } from '../services/userService';
import { errorText } from '../services/api';
export function MembersScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Members'>) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void Promise.all([getConversation(route.params.conversationId), fetchUsers()])
      .then(([value, list]) => {
        if (active) {
          setConversation(value);
          setUsers(list);
        }
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      });
    return () => {
      active = false;
    };
  }, [route.params.conversationId]);
  return (
    <Screen>
      <Text style={styles.title}>Integrantes</Text>
      <ErrorMessage message={error} />
      {!conversation && !error && <Text style={styles.subtitle}>Carregando…</Text>}
      {conversation &&
        users
          .filter((person) => membersOf(conversation).includes(person.uid))
          .map((person) => (
            <Pressable
              accessibilityRole="button"
              key={person.uid}
              style={[styles.card, styles.row]}
              onPress={() => navigation.navigate('Profile', { uid: person.uid })}
            >
              <Avatar uri={person.photoUrl} name={person.name} />
              <View>
                <Text style={styles.label}>{person.name}</Text>
                <Text style={styles.subtitle}>
                  {conversation.type === 'group' && conversation.ownerId === person.uid
                    ? 'Proprietário'
                    : 'Integrante'}
                </Text>
              </View>
            </Pressable>
          ))}
    </Screen>
  );
}
