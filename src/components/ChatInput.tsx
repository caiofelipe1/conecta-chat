import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { DirectoryUser } from '../../shared/domain';
import { Button, Field, styles } from './UI';
export function ChatInput({
  text,
  setText,
  target,
  setTarget,
  members,
  onSend,
  sending,
  disabled,
}: {
  text: string;
  setText: (text: string) => void;
  target: string | null;
  setTarget: (target: string | null) => void;
  members: DirectoryUser[];
  onSend: () => void;
  sending: boolean;
  disabled: boolean;
}) {
  return (
    <View style={{ gap: 10 }}>
      {members.length > 0 && (
        <>
          <Text style={styles.label}>Destinatário da notificação</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => setTarget(null)}
              style={[styles.chip, !target && styles.selected]}
            >
              <Text style={styles.label}>Todo o grupo</Text>
            </Pressable>
            {members.map((member) => (
              <Pressable
                key={member.uid}
                style={[styles.chip, target === member.uid && styles.selected]}
                onPress={() => setTarget(member.uid)}
              >
                <Text style={styles.label}>{member.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      <Field
        label="Mensagem"
        placeholder="Escreva uma mensagem"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        editable={!disabled && !sending}
      />
      <Button
        title="Enviar mensagem"
        disabled={disabled || !text.trim()}
        loading={sending}
        onPress={onSend}
      />
    </View>
  );
}
