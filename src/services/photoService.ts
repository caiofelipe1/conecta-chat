import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { getDownloadURL, putFile, ref } from '@react-native-firebase/storage';
import { auth, storage } from './firebase';
export async function choosePhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      'Permita acesso às fotos nas configurações do dispositivo para selecionar uma imagem.',
    );
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) throw new Error('Escolha uma foto de até 5 MB.');
  return asset.uri;
}
export async function uploadPhoto(uri: string): Promise<string> {
  const uid = auth().currentUser?.uid;
  if (!uid) throw new Error('Entre na sua conta para enviar uma foto.');
  const extension = /\.png(?:\?|$)/i.test(uri)
    ? 'png'
    : /\.webp(?:\?|$)/i.test(uri)
      ? 'webp'
      : 'jpg';
  const path = ref(storage(), `users/${uid}/${randomUUID()}.${extension}`);
  await putFile(path, uri, {
    contentType: extension === 'jpg' ? 'image/jpeg' : `image/${extension}`,
  });
  return getDownloadURL(path);
}
