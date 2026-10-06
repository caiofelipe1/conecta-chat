import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ChatUser } from '../../shared/domain';
import type { RootStackParamList } from '../navigation/types';
import { Avatar, ErrorMessage, Screen, styles } from '../components/UI';
import { fetchProfile } from '../services/userService';
import { errorText } from '../services/api';
export function ProfileScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Profile'>) {
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setProfile(null);
    setError('');
    void fetchProfile(route.params.uid)
      .then((value) => {
        if (active) setProfile(value);
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      });
    return () => {
      active = false;
    };
  }, [route.params.uid]);
  return (
    <Screen>
      <Text style={styles.title}>Perfil</Text>
      <ErrorMessage message={error} />
      {!profile && !error && <Text style={styles.subtitle}>Carregando…</Text>}
      {profile && (
        <>
          <Avatar uri={profile.photoUrl} name={profile.name} size={110} />
          <View style={styles.card}>
            {[
              ['Nome', profile.name],
              ['E-mail', profile.email],
              ['Celular', profile.phoneNumber],
              ['Data de nascimento', profile.birthDate],
            ].map(([label, value]) => (
              <View key={label}>
                <Text style={styles.label}>{label}</Text>
                <Text selectable style={styles.subtitle}>
                  {value || 'Não informado'}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
