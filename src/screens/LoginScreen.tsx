import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ErrorMessage, Field, Screen, styles } from '../components/UI';
import { login } from '../services/authService';
import { errorText } from '../services/api';
export function LoginScreen({ onRegister }: { onRegister: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen safeTop>
      <View style={{ paddingTop: 48, gap: 12 }}>
        <Text style={styles.title}>Conecta Chat</Text>
        <Text style={styles.subtitle}>Suas conversas. Seu grupo. Tudo em tempo real.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Entrar</Text>
        <Field
          label="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Senha"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        <ErrorMessage message={error} />
        <Button title="Entrar" loading={loading} onPress={() => void submit()} />
        <Button title="Criar uma conta" secondary onPress={onRegister} />
      </View>
    </Screen>
  );
}
