import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../hooks/useConversations';
import { Avatar, Button, ErrorMessage, Screen, styles } from '../components/UI';
import { errorText } from '../services/api';
export function ConversationsScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Conversations'>) {
  const { user, profile, signOut } = useAuth();
  const { conversations, users, loading, error } = useConversations(user!.uid);
  const [logoutError, setLogoutError] = useState('');
  const [exiting, setExiting] = useState(false);
  const exit = async () => {
    setExiting(true);
    try {
      await signOut();
    } catch (err) {
      setLogoutError(errorText(err));
    } finally {
      setExiting(false);
    }
  };
  return (
    <Screen>
      <View style={styles.row}>
        <Avatar
          uri={profile?.photoUrl}
          name={profile?.name ?? 'Você'}
          onPress={() => navigation.navigate('Profile', { uid: user!.uid })}
        />
        <View style={styles.grow}>
          <Text style={styles.title}>Conversas</Text>
          <Text style={styles.subtitle}>{profile?.name}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button title="Nova conversa" onPress={() => navigation.navigate('Users')} />
        </View>
        <View style={styles.grow}>
          <Button title="Criar grupo" secondary onPress={() => navigation.navigate('GroupForm')} />
        </View>
      </View>
      <ErrorMessage message={error || logoutError} />
      {loading && <Text style={styles.subtitle}>Buscando suas conversas…</Text>}
      {!loading && conversations.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>Comece uma conversa</Text>
          <Text style={styles.subtitle}>
            Escolha uma pessoa cadastrada ou crie seu primeiro grupo.
          </Text>
        </View>
      )}
      {conversations.map((conversation) => {
        const other =
          conversation.type === 'direct'
            ? users.find(
                (item) => conversation.participantIds.includes(item.uid) && item.uid !== user!.uid,
              )
            : null;
        const name =
          conversation.type === 'group'
            ? conversation.name
            : (other?.name ?? 'Conversa individual');
        return (
          <Pressable
            accessibilityRole="button"
            key={conversation.id}
            style={[styles.card, styles.row]}
            onPress={() => navigation.navigate('Chat', { conversationId: conversation.id })}
          >
            <Avatar
              uri={conversation.type === 'group' ? conversation.photoUrl : other?.photoUrl}
              name={name}
            />
            <View style={styles.grow}>
              <Text style={styles.label}>{name}</Text>
              <Text style={styles.subtitle}>
                {conversation.type === 'group'
                  ? `Grupo · ${conversation.memberIds.length}/${conversation.memberLimit} integrantes`
                  : 'Conversa individual'}
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Button title="Sair da conta" secondary loading={exiting} onPress={() => void exit()} />
    </Screen>
  );
}
