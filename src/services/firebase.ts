import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getDatabase } from '@react-native-firebase/database';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getMessaging } from '@react-native-firebase/messaging';
import firebaseConfig from '../../firebaseConfig.json';

export function configurationError(): string | null {
  if (Object.values(firebaseConfig).some((value) => value.includes('CONFIGURAR')))
    return 'Configure firebaseConfig.json e os arquivos nativos do Firebase antes de executar.';
  const api = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!api.startsWith('https://') || api.includes('SUA_API'))
    return 'Configure EXPO_PUBLIC_API_URL com a URL HTTPS da API publicada.';
  if (getApp().options.projectId !== firebaseConfig.projectId)
    return 'Os arquivos nativos e firebaseConfig.json devem pertencer ao mesmo projeto Firebase.';
  return null;
}
export const auth = () => getAuth(getApp());
export const database = () => getDatabase(getApp(), firebaseConfig.databaseURL);
export const firestore = () => getFirestore(getApp());
export const storage = () => getStorage(getApp(), `gs://${firebaseConfig.storageBucket}`);
export const messaging = () => getMessaging(getApp());
