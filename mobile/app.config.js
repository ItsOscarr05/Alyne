// Load environment variables from .env file
require('dotenv').config();

// Debug: Log if key is loaded (only shows in build, not runtime)
if (process.env.STRIPE_PUBLISHABLE_KEY) {
  console.log('[app.config.js] STRIPE_PUBLISHABLE_KEY loaded from .env');
} else {
  console.warn('[app.config.js] STRIPE_PUBLISHABLE_KEY NOT found in .env');
}

export default {
  expo: {
    name: 'Alyne',
    slug: 'alyne',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.alyne.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.alyne.app',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-location',
      'expo-notifications',
    ],
    extra: {
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    },
    // Debug: Log the key during config load
    // Note: This will only show in build logs, not runtime
  },
};

