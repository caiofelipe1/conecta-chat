import React, { useEffect, useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export const colors = {
  bg: '#F4F7FB',
  navy: '#14213D',
  blue: '#2563EB',
  muted: '#64748B',
  border: '#DCE4EE',
  error: '#B91C1C',
  white: '#FFFFFF',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, flexGrow: 1 },
  title: { fontSize: 30, fontWeight: '800', color: colors.navy },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 14, color: colors.navy, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    color: colors.navy,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  secondary: { backgroundColor: '#E5EDFF' },
  error: {
    color: colors.error,
    backgroundColor: '#FEECEC',
    padding: 12,
    borderRadius: 10,
    lineHeight: 20,
  },
  grow: { flex: 1 },
  chip: { borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 12 },
  selected: { borderColor: colors.blue, backgroundColor: '#E5EDFF' },
});
export function Screen({
  children,
  scroll = true,
  safeTop = false,
}: PropsWithChildren<{ scroll?: boolean; safeTop?: boolean }>) {
  return (
    <SafeAreaView edges={safeTop ? ['top', 'bottom'] : ['bottom']} style={styles.screen}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={loading || disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        (loading || disabled) && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.blue : colors.white} />
      ) : (
        <Text style={[styles.buttonText, secondary && { color: colors.blue }]}>{title}</Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function Loading() {
  return (
    <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
      <ActivityIndicator color={colors.blue} size="large" />
      <Text style={styles.subtitle}>Carregando…</Text>
    </View>
  );
}
export function Avatar({
  uri,
  name,
  size = 48,
  onPress,
}: {
  uri?: string;
  name: string;
  size?: number;
  onPress?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <Pressable
      accessibilityLabel={`Foto de ${name}`}
      accessibilityRole={onPress ? 'button' : 'image'}
      disabled={!onPress}
      onPress={onPress}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#E5EDFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size / 3, color: colors.blue, fontWeight: '800' }}>
            {name.slice(0, 2).toUpperCase() || 'CC'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
