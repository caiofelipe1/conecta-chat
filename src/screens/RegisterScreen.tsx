import React, { useState } from 'react';
import { Text } from 'react-native';
import { z } from 'zod';
import { profileInputSchema } from '../../shared/domain';
import { Avatar, Button, ErrorMessage, Field, Screen, styles } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { registerAccount } from '../services/authService';
import { errorText } from '../services/api';
import { choosePhoto, uploadPhoto } from '../services/photoService';
import { saveProfile } from '../services/userService';
export function RegisterScreen({
  existing = false,
  onBack,
}: {
  existing?: boolean;
  onBack?: () => void;
}) {
  const { reload, signOut } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState('');
  const [photo, setPhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const choose = async () => {
    try {
      const uri = await choosePhoto();
      if (uri) setPhoto(uri);
    } catch (err) {
      setError(errorText(err));
    }
  };
  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const profile = profileInputSchema.parse({
        name,
        phoneNumber: phone,
        birthDate: birth,
        photoUrl: '',
      });
      if (!existing) {
        z.email().parse(email.trim());
        if (password.length < 6) throw new Error('Use uma senha de pelo menos seis caracteres.');
        if (password !== confirmation) throw new Error('As senhas não coincidem.');
        await registerAccount(email, password);
      }
      const photoUrl = photo ? await uploadPhoto(photo) : '';
      await saveProfile({ ...profile, photoUrl });
      await reload();
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? err.issues.map((issue) => issue.message).join(' ')
          : errorText(err),
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen safeTop>
      <Text style={styles.title}>{existing ? 'Complete seu cadastro' : 'Criar conta'}</Text>
      <Text style={styles.subtitle}>Sua foto é opcional. Os demais dados são obrigatórios.</Text>
      <Avatar uri={photo} name={name || 'Você'} size={80} />
      <Button title="Selecionar foto" secondary onPress={() => void choose()} />
      <Field label="Nome completo" value={name} onChangeText={setName} />
      {!existing && (
        <>
          <Field
            label="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Field label="Senha" secureTextEntry value={password} onChangeText={setPassword} />
          <Field
            label="Confirmar senha"
            secureTextEntry
            value={confirmation}
            onChangeText={setConfirmation}
          />
        </>
      )}
      <Field
        label="Número de celular"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Field
        label="Data de nascimento (AAAA-MM-DD)"
        placeholder="2005-01-31"
        value={birth}
        onChangeText={setBirth}
        maxLength={10}
      />
      <ErrorMessage message={error} />
      <Button title="Salvar cadastro" loading={loading} onPress={() => void submit()} />
      <Button
        title={existing ? 'Sair' : 'Voltar ao login'}
        secondary
        disabled={loading}
        onPress={() => {
          if (existing) void signOut().catch((err) => setError(errorText(err)));
          else onBack?.();
        }}
      />
    </Screen>
  );
}
