import apiClient from './api';
import type { User } from '../types';

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

export interface AuthResponseData {
  user: User;
  token: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponseData> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponseData }>(
      '/auth/login',
      credentials
    );
    const body = data as { success?: boolean; data?: AuthResponseData };
    return body.data!;
  },

  async register(registerData: RegisterData): Promise<AuthResponseData> {
    const { data } = await apiClient.post<{ success: boolean; data: AuthResponseData }>(
      '/auth/register',
      registerData
    );
    const body = data as { success?: boolean; data?: AuthResponseData };
    return body.data!;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/request-password-reset', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    profilePhoto?: string;
  }): Promise<User> {
    const { data: res } = await apiClient.put<{ success: boolean; data: User }>(
      '/auth/profile',
      data
    );
    const body = res as { success?: boolean; data?: User };
    if (!body.data) throw new Error('Failed to update profile');
    return body.data;
  },
};
