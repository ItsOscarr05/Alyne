import apiClient from './api';

export interface ClientPreferences {
  location?: {
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  };
  wellnessGoals?: string[];
  preferredServiceTypes?: string[];
}

export const clientService = {
  async updateProfile(preferences: ClientPreferences): Promise<void> {
    await apiClient.put('/clients/profile', { preferences });
  },

  async getProfile(): Promise<{ preferences?: ClientPreferences }> {
    const { data } = await apiClient.get<{ success: boolean; data: { preferences?: ClientPreferences } }>(
      '/clients/profile'
    );
    const body = data as { success?: boolean; data?: { preferences?: ClientPreferences } };
    return body.data ?? {};
  },
};
