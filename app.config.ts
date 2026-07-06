import type { ConfigContext, ExpoConfig } from 'expo/config';

import { appIdentity } from './appIdentity.js';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appIdentity.displayName,
  slug: appIdentity.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: appIdentity.scheme,
  userInterfaceStyle: 'dark',
  ios: {
    icon: './assets/expo.icon',
    supportsTablet: true,
    bundleIdentifier: appIdentity.bundleId,
    infoPlist: {
      UIBackgroundModes: ['fetch', 'processing'],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: appIdentity.androidPackage,
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-background-task',
    'expo-task-manager',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '16.4',
        },
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
        },
      },
    ],
    './plugins/withReadium.js',
  ],
  experiments: {
    reactCompiler: true,
  },
});
