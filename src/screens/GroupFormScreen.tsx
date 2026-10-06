import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  groupInputSchema,
  policies,
  type DirectoryUser,
  type NotificationPolicy,
} from '../../shared/domain';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, Button, ErrorMessage, Field, Screen, styles } from '../components/UI';
import { UserSelector } from '../components/UserSelector';
import { fetchUsers } from '../services/userService';
import { getConversation } from '../services/chatService';
import { createGroup, updateGroup } from '../services/groupService';
import { choosePhoto, uploadPhoto } from '../services/photoService';
import { errorText } from '../services/api';
export const policyLabels: Record<NotificationPolicy, string> = {
  all_group_messages: 'Todas as mensagens gerais',
  mentioned_members: 'Somente mencionados ou selecionados',
  direct_messages_only: 'Somente conversas individuais',
  disabled: 'Nenhuma notificação deste grupo',
};
export function GroupFormScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'GroupForm'>) {
  const { user } = useAuth();
  const uid = user!.uid;
  const id = route.params?.groupId;
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [members, setMembers] = useState<string[]>([uid]);
  const [limit, setLimit] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    void Promise.all([fetchUsers(), id ? getConversation(id) : Promise.resolve(null)])
      .then(([list, conversation]) => {
        if (!alive) return;
        setUsers(list);
        if (conversation?.type === 'group') {
          if (conversation.ownerId !== uid) throw new Error('Somente o proprietário pode editar.');
          setName(conversation.name);
          setPhoto(conversation.photoUrl);
          setMembers(conversation.memberIds);
          setLimit(String(conversation.memberLimit));
          setPolicy(conversation.notificationPolicy);
          setRevision(conversation.revision);
        }
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
  }, [id, uid]);
  const available = useMemo(() => Number(limit) - members.length, [limit, members.length]);
  const toggle = (other: DirectoryUser) => {
    setError('');
    if (members.includes(other.uid))
      setMembers((previous) => previous.filter((member) => member !== other.uid));
    else if (!Number.isInteger(Number(limit)) || available <= 0)
      setError('O grupo está sem vagas. Aumente o limite para adicionar integrantes.');
    else setMembers((previous) => [...previous, other.uid]);
  };
  const selectPhoto = async () => {
    try {
      const uri = await choosePhoto();
      if (uri) {
        setPhoto(uri);
        setPhotoChanged(true);
      }
    } catch (err) {
      setError(errorText(err));
    }
  };
  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const group = groupInputSchema.parse({
        name,
        photoUrl: photoChanged ? '' : photo,
        memberIds: members,
        memberLimit: Number(limit),
        notificationPolicy: policy,
      });
      const photoUrl = photoChanged ? await uploadPhoto(photo) : photo;
      const result = id
        ? await updateGroup(id, { ...group, photoUrl }, revision)
        : await createGroup({ ...group, photoUrl });
      navigation.replace('Chat', { conversationId: result.id });
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? err.issues.map((issue) => issue.message).join(' ')
          : errorText(err),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen>
      <Text style={styles.title}>{id ? 'Editar grupo' : 'Criar grupo'}</Text>
      {loading && <Text style={styles.subtitle}>Carregando…</Text>}
      <Avatar uri={photo} name={name || 'Grupo'} size={80} />
      <Button title="Selecionar foto do grupo" secondary onPress={() => void selectPhoto()} />
      <Field label="Nome do grupo" value={name} onChangeText={setName} />
      <Field
        label="Limite de integrantes (2 a 100)"
        keyboardType="number-pad"
        value={limit}
        onChangeText={setLimit}
      />
      <Text style={styles.label}>
        {members.length} integrante(s) · {Number.isFinite(available) ? available : 0} vaga(s)
        disponível(is)
      </Text>
      <Text style={styles.subtitle}>O proprietário ocupa uma vaga e permanece no grupo.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Política de notificações</Text>
        {policies.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="radio"
            accessibilityState={{ selected: policy === item }}
            onPress={() => setPolicy(item)}
            style={[styles.chip, policy === item && styles.selected]}
          >
            <Text style={styles.label}>{policyLabels[item]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Integrantes</Text>
      <UserSelector users={users} ownUid={uid} selected={members} onSelect={toggle} />
      <ErrorMessage message={error} />
      <Button
        title="Salvar grupo"
        loading={saving}
        disabled={loading || members.length < 2 || available < 0}
        onPress={() => void save()}
      />
    </Screen>
  );
}
