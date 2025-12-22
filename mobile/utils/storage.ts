import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Use localStorage for web to persist authentication across browser sessions
// This ensures users remain logged in when closing and reopening the app
// localStorage persists across browser sessions, unlike sessionStorage which is cleared on tab close
const getWebStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  // Fallback to sessionStorage if localStorage is not available
  if (typeof window !== 'undefined' && window.sessionStorage) {
    logger.warn('localStorage not available, falling back to sessionStorage');
    return window.sessionStorage;
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
