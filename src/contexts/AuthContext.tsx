import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { User } from '@react-native-firebase/auth';
import type { ChatUser } from '../../shared/domain';
import { observeAuth, logout } from '../services/authService';
import { ApiError, errorText } from '../services/api';
import { fetchProfile } from '../services/userService';
import { unregisterNotifications } from '../services/notificationService';
import { auth } from '../services/firebase';
type AuthState = {
  user: User | null;
  profile: ChatUser | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const next = await fetchProfile(currentUser.uid);
      if (auth().currentUser?.uid === currentUser.uid) setProfile(next);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const unsubscribe = observeAuth((nextUser) => {
      const run = ++generation;
      setUser(nextUser);
      setProfile(null);
      setError('');
      if (!nextUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetchProfile(nextUser.uid)
        .then((next) => {
          if (alive && generation === run) setProfile(next);
        })
        .catch((err) => {
          if (alive && generation === run && !(err instanceof ApiError && err.status === 404))
            setError(errorText(err));
        })
        .finally(() => {
          if (alive && generation === run) setLoading(false);
        });
    });
    return () => {
      alive = false;
      generation++;
      unsubscribe();
    };
  }, []);
  const signOut = useCallback(async () => {
    // Não concluir logout se a desativação do token falhar: evita pushes para a sessão anterior.
    await unregisterNotifications();
    await logout();
    setProfile(null);
  }, []);
  const value = useMemo(
    () => ({ user, profile, loading, error, reload, signOut }),
    [user, profile, loading, error, reload, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider ausente.');
  return context;
}
