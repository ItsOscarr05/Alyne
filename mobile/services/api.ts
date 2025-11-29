import axios from 'axios';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
    if (error.response?.status === 401) {
      // TODO: Handle unauthorized - redirect to login
      logger.warn('Unauthorized - redirecting to login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

