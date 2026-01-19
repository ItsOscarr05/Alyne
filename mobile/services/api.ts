import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

// Use localhost for web, 10.0.2.2 for Android emulator
const getDefaultApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
  // Android emulator uses 10.0.2.2 to access host machine's localhost
  return 'http://10.0.2.2:3000/api';
};

// Get API URL with platform-specific override
// Priority: Platform check > env var > config > default
const getApiBaseUrl = () => {
  // CRITICAL: On web, ALWAYS use localhost (override everything else)
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }
  
  // Check env var first (highest priority after platform check)
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // Check config, but ignore if it's 10.0.2.2 (Android emulator address)
  const configUrl = Constants.expoConfig?.extra?.API_BASE_URL;
  if (configUrl && !configUrl.includes('10.0.2.2')) {
    return configUrl;
  }
  
  // Use platform-specific default
  return getDefaultApiUrl();
};

const API_BASE_URL = getApiBaseUrl();

// Debug: Log the API URL being used
console.log('[API] Using API_BASE_URL:', API_BASE_URL, 'Platform:', Platform.OS);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: Platform.OS === 'web', // Enable credentials for web (cookies, auth headers)
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        logger.debug('Token found, adding to request');
      } else {
        logger.debug('No auth token found in storage');
      }
    } catch (error) {
      logger.error('Error getting auth token', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhance network errors with better detection
    if (!error.response) {
      // No response means network error
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        error.isNetworkError = true;
        error.networkError = true;
      }
    }
    
    if (error.response?.status === 401) {
      // Mark as unauthorized for component-level handling
      // Components should handle 401 by redirecting to login
      error.isUnauthorized = true;
      logger.warn('Unauthorized access detected - component should handle redirect');
    }
    
    logger.error('API Error', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      isNetworkError: error.isNetworkError,
    });
    
    return Promise.reject(error);
  }
);

export default apiClient;

