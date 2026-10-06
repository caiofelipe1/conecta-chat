import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { DirectoryUser } from '../../shared/domain';
import { Avatar, Field, styles } from './UI';
export function UserSelector({
  users,
  ownUid,
  selected = [],
  onSelect,
}: {
  users: DirectoryUser[];
  ownUid: string;
  selected?: string[];
  onSelect: (user: DirectoryUser) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          user.uid !== ownUid &&
          user.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
    [users, ownUid, search],
  );
  return (
    <View style={{ gap: 10 }}>
      <Field
        label="Buscar pessoas"
        value={search}
        onChangeText={setSearch}
        placeholder="Nome do usuário"
      />
      {filtered.length === 0 && <Text style={styles.subtitle}>Nenhum usuário disponível.</Text>}
      {filtered.map((user) => (
        <Pressable
          key={user.uid}
          accessibilityRole="button"
          accessibilityLabel={`${selected.includes(user.uid) ? 'Remover' : 'Selecionar'} ${user.name}`}
          style={[styles.card, styles.row, selected.includes(user.uid) && styles.selected]}
          onPress={() => onSelect(user)}
        >
          <Avatar uri={user.photoUrl} name={user.name} />
          <Text style={[styles.label, styles.grow]}>{user.name}</Text>
          <Text style={styles.subtitle}>
            {selected.includes(user.uid) ? 'Selecionado' : 'Selecionar'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
