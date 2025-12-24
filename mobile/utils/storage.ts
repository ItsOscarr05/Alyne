import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Generate or retrieve a unique tab ID for web
// This ensures each tab has its own isolated storage
const getTabId = (): string => {
  if (!isWeb || typeof window === 'undefined') {
    return 'default';
  }

  // Try to get existing tab ID from sessionStorage (tab-specific)
  const existingTabId = sessionStorage.getItem('alyne_tab_id');
  if (existingTabId) {
    return existingTabId;
  }

  // Generate a new unique tab ID
  const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('alyne_tab_id', tabId);
  return tabId;
};

// Get tab-specific storage key
const getTabKey = (key: string): string => {
  if (!isWeb) {
    return key;
  }
  const tabId = getTabId();
  return `${tabId}_${key}`;
};

// Use sessionStorage for web to ensure each tab has isolated storage
// sessionStorage is tab-specific and prevents tabs from overwriting each other
const getWebStorage = () => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  // Fallback to localStorage if sessionStorage is not available
  if (typeof window !== 'undefined' && window.localStorage) {
    logger.warn('sessionStorage not available, falling back to localStorage');
    return window.localStorage;
  }
  return null;
};

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      const webStorage = getWebStorage();
      if (webStorage) {
        // Use tab-specific key for web
        const tabKey = getTabKey(key);
        return webStorage.getItem(tabKey);
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
        // Use tab-specific key for web
        const tabKey = getTabKey(key);
        webStorage.setItem(tabKey, value);
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
        // Use tab-specific key for web
        const tabKey = getTabKey(key);
        webStorage.removeItem(tabKey);
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
