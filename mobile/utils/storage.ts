import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Use sessionStorage for web to isolate storage per browser tab/window
// This prevents token conflicts when multiple users are logged in simultaneously
// sessionStorage is tab-specific, unlike localStorage which is shared across tabs
const getWebStorage = () => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  // Fallback to localStorage if sessionStorage is not available
  if (typeof window !== 'undefined' && window.localStorage) {
    logger.warn('sessionStorage not available, falling back to localStorage');
    return window.localStorage;
  }
  // Last resort: use AsyncStorage (shared across tabs, but better than nothing)
  return null;
};

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      const webStorage = getWebStorage();
      if (webStorage) {
        return webStorage.getItem(key);
      }
      // Fallback to AsyncStorage
      return await AsyncStorage.getItem(key);
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        logger.error('Error getting item from SecureStore', error);
        return null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      const webStorage = getWebStorage();
      if (webStorage) {
        webStorage.setItem(key, value);
        return;
      }
      // Fallback to AsyncStorage
      await AsyncStorage.setItem(key, value);
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        logger.error('Error setting item in SecureStore', error);
        throw error;
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      const webStorage = getWebStorage();
      if (webStorage) {
        webStorage.removeItem(key);
        return;
      }
      // Fallback to AsyncStorage
      await AsyncStorage.removeItem(key);
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        logger.error('Error removing item from SecureStore', error);
      }
    }
  },
};
