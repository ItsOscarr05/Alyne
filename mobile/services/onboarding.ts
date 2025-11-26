import apiClient from './api';

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
  duration: number; // in minutes
}

export interface CredentialData {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface AvailabilityData {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  isRecurring?: boolean;
  specificDate?: string;
}

export const onboardingService = {
  async updateProfile(data: ProfileData) {
    const response = await apiClient.post('/providers/profile', data);
    return response.data;
  },

  async createService(data: ServiceData) {
    const response = await apiClient.post('/providers/services', data);
    return response.data;
  },

  async updateService(serviceId: string, data: Partial<ServiceData>) {
    const response = await apiClient.put(`/providers/services/${serviceId}`, data);
    return response.data;
  },

  async deleteService(serviceId: string) {
    const response = await apiClient.delete(`/providers/services/${serviceId}`);
    return response.data;
  },

  async createCredential(data: CredentialData) {
    const response = await apiClient.post('/providers/credentials', data);
    return response.data;
  },

  async updateCredential(credentialId: string, data: Partial<CredentialData>) {
    const response = await apiClient.put(`/providers/credentials/${credentialId}`, data);
    return response.data;
  },

  async deleteCredential(credentialId: string) {
    const response = await apiClient.delete(`/providers/credentials/${credentialId}`);
    return response.data;
  },

  async createAvailability(data: AvailabilityData) {
    const response = await apiClient.post('/providers/availability', data);
    return response.data;
  },

  async updateAvailability(availabilityId: string, data: Partial<AvailabilityData>) {
    const response = await apiClient.put(`/providers/availability/${availabilityId}`, data);
    return response.data;
  },

  async deleteAvailability(availabilityId: string) {
    const response = await apiClient.delete(`/providers/availability/${availabilityId}`);
    return response.data;
  },

  async updateUserProfile(data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    profilePhoto?: string;
  }) {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },
};

