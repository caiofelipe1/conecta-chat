import { registerRootComponent } from 'expo';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
// Payload notification é apresentado pelo Android/iOS em background; não criar uma segunda notificação local.
setBackgroundMessageHandler(getMessaging(), async () => {
  /* Os dados são tratados ao tocar e abrir a conversa. */
});
registerRootComponent(App);
