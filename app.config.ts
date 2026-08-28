import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Restore',
  slug: 'restore-mobility',
  version: '0.1.0',
  platforms: ['ios'],
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'restore',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.restore.mobility',
    supportsTablet: false,
    icon: './assets/expo.icon',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F4F6F2',
        dark: {
          backgroundColor: '#0D120F',
        },
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
};

export default config;
