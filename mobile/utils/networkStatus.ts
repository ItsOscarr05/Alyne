import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Network status utility
 * Detects online/offline status across platforms
 * Works on web and native without additional dependencies
 */

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

let networkState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: null,
};

const listeners = new Set<(state: NetworkState) => void>();

/**
 * Check if device is online
 * Uses navigator.onLine on web, attempts a lightweight fetch on native
 */
export const isOnline = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }
  
  // For native, we'll rely on error detection from API calls
  // This is a lightweight check that doesn't require additional packages
  try {
    // Try a simple fetch to check connectivity
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
    });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get current network state
 */
export const getNetworkState = async (): Promise<NetworkState> => {
  if (Platform.OS === 'web') {
    const isConnected = typeof navigator !== 'undefined' && navigator.onLine;
    return {
      isConnected,
      isInternetReachable: isConnected,
      type: 'wifi',
    };
  }
  
  // For native, check connectivity
  const connected = await isOnline();
  return {
    isConnected: connected,
    isInternetReachable: connected,
    type: null,
  };
};

/**
 * Subscribe to network state changes
 */
export const subscribeToNetworkState = (callback: (state: NetworkState) => void): () => void => {
  listeners.add(callback);
  
  // Call immediately with current state
  getNetworkState().then((state) => {
    networkState = state;
    callback(state);
  });
  
  if (Platform.OS === 'web') {
    // Web: listen to online/offline events
    const handleOnline = () => {
      networkState = {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      };
      listeners.forEach((listener) => listener(networkState));
    };
    
    const handleOffline = () => {
      networkState = {
        isConnected: false,
        isInternetReachable: false,
        type: null,
      };
      listeners.forEach((listener) => listener(networkState));
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    
    return () => {
      listeners.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  } else {
    // Native: poll periodically (lightweight approach)
    const pollInterval = setInterval(async () => {
      const state = await getNetworkState();
      if (state.isConnected !== networkState.isConnected) {
        networkState = state;
        listeners.forEach((listener) => listener(networkState));
      }
    }, 3000); // Check every 3 seconds
    
    return () => {
      listeners.delete(callback);
      clearInterval(pollInterval);
    };
  }
};

/**
 * React hook for network status
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkState>(networkState);
  
  useEffect(() => {
    // Initialize
    getNetworkState().then((state) => {
      networkState = state;
      setNetworkStatus(state);
    });
    
    // Subscribe to changes
    const unsubscribe = subscribeToNetworkState((state) => {
      setNetworkStatus(state);
    });
    
    return unsubscribe;
  }, []);
  
  return networkStatus;
};

