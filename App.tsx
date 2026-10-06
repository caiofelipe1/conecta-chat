import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import type { RootStackParamList } from './src/navigation/types';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { useNotifications } from './src/hooks/useNotifications';
import { Button, ErrorMessage, Loading, Screen, colors, styles } from './src/components/UI';
import { configurationError } from './src/services/firebase';
import { errorText } from './src/services/api';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ConversationsScreen } from './src/screens/ConversationsScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { GroupFormScreen } from './src/screens/GroupFormScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { MembersScreen } from './src/screens/MembersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
const Stack = createNativeStackNavigator<RootStackParamList>();
const navigation = createNavigationContainerRef<RootStackParamList>();
function Application() {
  const { user, profile, loading, error, reload, signOut } = useAuth();
  const [register, setRegister] = useState(false);
  const [authActionError, setAuthActionError] = useState('');
  const pendingChat = useRef<string | null>(null);
  const openChat = useCallback((id: string) => {
    if (navigation.isReady()) navigation.navigate('Chat', { conversationId: id });
    else pendingChat.current = id;
  }, []);
  const { status, incoming, dismiss } = useNotifications(profile?.uid ?? null, openChat);
  if (loading) return <Loading />;
  if (!user)
    return register ? (
      <RegisterScreen onBack={() => setRegister(false)} />
    ) : (
      <LoginScreen onRegister={() => setRegister(true)} />
    );
  if (error)
    return (
      <Screen safeTop>
        <ErrorMessage message={authActionError || error} />
        <Button
          title="Tentar novamente"
          onPress={() => {
            setAuthActionError('');
            void reload();
          }}
        />
        <Button
          title="Sair"
          secondary
          onPress={() => void signOut().catch((err) => setAuthActionError(errorText(err)))}
        />
      </Screen>
    );
  if (!profile) return <RegisterScreen existing />;
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigation}
        onReady={() => {
          if (pendingChat.current) {
            openChat(pendingChat.current);
            pendingChat.current = null;
          }
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.white },
            headerTintColor: colors.navy,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{ title: 'Conecta Chat' }}
          />
          <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Nova conversa' }} />
          <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
          <Stack.Screen
            name="Members"
            component={MembersScreen}
            options={{ title: 'Integrantes' }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
        </Stack.Navigator>
      </NavigationContainer>
      {incoming && (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            openChat(incoming.conversationId);
            dismiss();
          }}
          style={{ padding: 16, backgroundColor: colors.blue }}
        >
          <Text style={styles.buttonText}>Nova mensagem · toque para abrir</Text>
        </Pressable>
      )}
      {status && (
        <Text style={{ padding: 8, fontSize: 11, color: colors.muted, backgroundColor: colors.bg }}>
          {status}
        </Text>
      )}
    </View>
  );
}
export default function App() {
  const error = configurationError();
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {error ? (
        <Screen safeTop>
          <Text style={styles.title}>Configuração necessária</Text>
          <ErrorMessage message={error} />
          <Text style={styles.subtitle}>
            Siga o README para conectar o projeto Firebase e a API.
          </Text>
        </Screen>
      ) : (
        <AuthProvider>
          <Application />
        </AuthProvider>
      )}
    </SafeAreaProvider>
  );
}
