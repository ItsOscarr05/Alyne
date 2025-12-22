import apiClient from './api';
import { User, UserType } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'PROVIDER' | 'CLIENT';
  phoneNumber?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data.data; // Extract data from response
  },

  async register(data: RegisterData) {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data.data; // Extract data from response
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token });
  },

  async resendVerificationEmail(): Promise<void> {
    await apiClient.post('/auth/resend-verification');
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/auth/account');
  },
};

