import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  directSchema,
  groupSchema,
  membersOf,
  type ChatMessage as Message,
  type Conversation,
  type DirectoryUser,
  type MessageInput,
} from '../../shared/domain';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../hooks/useChat';
import { Avatar, Button, ErrorMessage, Screen, styles } from '../components/UI';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { fetchUsers } from '../services/userService';
import { getConversation, sendMessage } from '../services/chatService';
import { requestPush } from '../services/notificationService';
import { firestore } from '../services/firebase';
import { errorText } from '../services/api';
export function ChatScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'Chat'>) {
  const { user } = useAuth();
  const uid = user!.uid;
  const id = route.params.conversationId;
  const { messages, loading, error: listenerError, blocked, loadOlder, count } = useChat(id, uid);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [text, setText] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pushPending, setPushPending] = useState<string | null>(null);
  const [pushNotice, setPushNotice] = useState('');
  const pending = useRef<MessageInput | null>(null);
  const list = useRef<FlatList<Message>>(null);
  useEffect(() => {
    let alive = true;
    setConversation(null);
    setError('');
    setText('');
    setTarget(null);
    pending.current = null;
    void Promise.all([getConversation(id), fetchUsers()])
      .then(([value, directory]) => {
        if (alive) {
          setConversation(value);
          setUsers(directory);
        }
      })
      .catch((err) => {
        if (alive) setError(errorText(err));
      });
    return () => {
      alive = false;
    };
  }, [id]);
  useEffect(() => {
    if (!conversation) return;
    return onSnapshot(
      doc(firestore(), `${conversation.type === 'group' ? 'groups' : 'directConversations'}/${id}`),
      (snapshot) => {
        try {
          setConversation(
            conversation.type === 'group'
              ? groupSchema.parse(snapshot.data())
              : directSchema.parse(snapshot.data()),
          );
        } catch {
          setConversation(null);
          setError('Você não tem mais acesso à conversa.');
        }
      },
      () => {
        setConversation(null);
        setError('Você não tem mais acesso à conversa.');
      },
    );
  }, [id, conversation?.type]);
  const members = useMemo(
    () =>
      conversation ? users.filter((person) => membersOf(conversation).includes(person.uid)) : [],
    [conversation, users],
  );
  const other = members.find((person) => person.uid !== uid);
  const title = conversation?.type === 'group' ? conversation.name : (other?.name ?? 'Conversa');
  const push = async (messageId: string) => {
    try {
      const result = await requestPush(id, messageId);
      if (result.status === 'uncertain' || result.status === 'failed' || (result.failed ?? 0) > 0)
        setPushNotice('Mensagem salva. A entrega de algumas notificações não pôde ser confirmada.');
      else
        setPushNotice(
          result.status === 'skipped'
            ? 'Mensagem salva. Nenhum dispositivo elegível para push.'
            : 'Mensagem salva e push processado.',
        );
      setPushPending(null);
    } catch {
      setPushPending(messageId);
      setPushNotice('Mensagem salva. Falha ao solicitar push; você pode tentar novamente.');
    }
  };
  const send = async () => {
    setSending(true);
    setError('');
    setPushNotice('');
    const newInput: MessageInput = {
      messageId: randomUUID(),
      text: text.trim(),
      target: target ? { type: 'member', memberId: target } : { type: 'conversation' },
      mentionedUserIds: target ? [target] : [],
    };
    const previous = pending.current;
    const input =
      previous &&
      previous.text === newInput.text &&
      JSON.stringify(previous.target) === JSON.stringify(newInput.target)
        ? previous
        : newInput;
    pending.current = input;
    try {
      await sendMessage(id, input);
      pending.current = null;
      setText('');
      await push(input.messageId);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };
  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1, gap: 12 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.row}>
          <Avatar
            name={title}
            uri={conversation?.type === 'group' ? conversation.photoUrl : other?.photoUrl}
            onPress={() => {
              if (conversation?.type === 'group')
                navigation.navigate('Members', { conversationId: id });
              else if (other) navigation.navigate('Profile', { uid: other.uid });
            }}
          />
          <View style={styles.grow}>
            <Text style={styles.label}>{title}</Text>
            <Text style={styles.subtitle}>
              {conversation?.type === 'group'
                ? `${members.length} integrantes`
                : 'Conversa individual'}
            </Text>
          </View>
        </View>
        {conversation?.type === 'group' && conversation.ownerId === uid && (
          <Button
            title="Gerenciar grupo"
            secondary
            onPress={() => navigation.navigate('GroupForm', { groupId: id })}
          />
        )}
        <ErrorMessage message={listenerError || error} />
        {loading && <Text style={styles.subtitle}>Carregando mensagens…</Text>}
        <FlatList
          ref={list}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            messages.length >= count ? (
              <Button title="Carregar mensagens anteriores" secondary onPress={loadOlder} />
            ) : null
          }
          ListEmptyComponent={
            !loading && !blocked ? (
              <Text style={styles.subtitle}>Nenhuma mensagem. Comece a conversa.</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <ChatMessage
              message={item}
              ownUid={uid}
              authorName={
                members.find((member) => member.uid === item.senderId)?.name ?? 'Integrante'
              }
              targetName={
                item.target.type === 'member'
                  ? (members.find(
                      (member) =>
                        item.target.type === 'member' && member.uid === item.target.memberId,
                    )?.name ?? 'Integrante')
                  : undefined
              }
            />
          )}
        />
        {pushNotice && <Text style={styles.subtitle}>{pushNotice}</Text>}
        {pushPending && (
          <Button
            title="Tentar solicitar push novamente"
            secondary
            disabled={sending}
            onPress={() => void push(pushPending)}
          />
        )}
        <ChatInput
          text={text}
          setText={setText}
          target={target}
          setTarget={setTarget}
          members={
            conversation?.type === 'group' ? members.filter((member) => member.uid !== uid) : []
          }
          onSend={() => void send()}
          sending={sending}
          disabled={blocked || !conversation}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
