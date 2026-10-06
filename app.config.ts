import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Conecta Chat',
  slug: 'conecta-chat',
  version: '1.0.0',
  scheme: 'conectachat',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? 'com.equipe.conectachat',
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: { UIBackgroundModes: ['remote-notification'] },
    entitlements: {
      'aps-environment':
        process.env.EAS_BUILD_PROFILE === 'development' ? 'development' : 'production',
    },
  },
  android: {
    package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? 'com.equipe.conectachat',
    googleServicesFile: './google-services.json',
    permissions: ['POST_NOTIFICATIONS'],
  },
  plugins: [
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-firebase/messaging',
    ['expo-build-properties', { ios: { useFrameworks: 'static' } }],
    [
      'expo-image-picker',
      {
        photosPermission: 'Permita acesso para escolher sua foto de perfil ou do grupo.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
};
export default config;
