import apiClient from './api';
import type { User } from '../types';

export interface ProfileData {
  bio?: string;
  specialties?: string[];
  serviceArea?: {
    center: { lat: number; lng: number };
    radius: number;
  };
}

export interface ServiceData {
  name: string;
  description?: string;
  price: number;
  duration: number;
}

export interface CredentialData {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface AvailabilityData {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  specificDate?: string;
}

export const onboardingService = {
  async updateProfile(data: ProfileData): Promise<void> {
    await apiClient.post('/providers/profile', data);
  },

  async createService(data: ServiceData): Promise<{ id: string }> {
    const { data: res } = await apiClient.post<{ success: boolean; data: { id: string } }>(
      '/providers/services',
      data
    );
    const body = res as { success?: boolean; data?: { id: string } };
    return body.data ?? { id: '' };
  },

  async createCredential(data: CredentialData): Promise<void> {
    await apiClient.post('/providers/credentials', data);
  },

  async createAvailability(data: AvailabilityData): Promise<void> {
    await apiClient.post('/providers/availability', data);
  },

  async completeOnboarding(): Promise<{ user: User }> {
    const { data } = await apiClient.post<{ success: boolean; data: { user: User } }>(
      '/providers/onboarding-complete'
    );
    const body = data as { success?: boolean; data?: { user: User } };
    if (!body.data?.user) throw new Error('Failed to complete onboarding');
    return { user: body.data.user };
  },
};
