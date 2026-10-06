import React from 'react';
import { Text, View } from 'react-native';
import type { ChatMessage as Message } from '../../shared/domain';
import { colors, styles } from './UI';
export function ChatMessage({
  message,
  ownUid,
  authorName,
  targetName,
}: {
  message: Message;
  ownUid: string;
  authorName: string;
  targetName?: string;
}) {
  const own = ownUid === message.senderId;
  return (
    <View
      style={{
        alignSelf: own ? 'flex-end' : 'flex-start',
        maxWidth: '86%',
        borderRadius: 16,
        backgroundColor: own ? colors.blue : colors.white,
        padding: 12,
        gap: 4,
        marginVertical: 5,
      }}
    >
      {message.conversationType === 'group' && (
        <Text style={{ color: own ? '#DCE8FF' : colors.blue, fontWeight: '700', fontSize: 12 }}>
          {authorName}
        </Text>
      )}
      {targetName && (
        <Text style={{ color: own ? '#DCE8FF' : colors.muted, fontSize: 12 }}>
          Para {targetName} · visível para o grupo
        </Text>
      )}
      <Text
        selectable
        style={{ color: own ? colors.white : colors.navy, fontSize: 16, lineHeight: 23 }}
      >
        {message.text}
      </Text>
      <Text
        style={[
          styles.subtitle,
          { color: own ? '#DCE8FF' : colors.muted, fontSize: 11, textAlign: 'right' },
        ]}
      >
        {new Date(message.createdAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}
