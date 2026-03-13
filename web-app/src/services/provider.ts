import apiClient from './api';
import type { ProviderCardData } from '../components/cards/ProviderCard';

export interface DiscoveryFilters {
  lat?: number;
  lng?: number;
  radius?: number;
  serviceType?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  availableNow?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DiscoveryResult {
  data: ProviderCardData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

function mapBackendToCardData(raw: Record<string, unknown>): ProviderCardData {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    specialties: Array.isArray(raw.specialties) ? raw.specialties.map(String) : [],
    distance: Number(raw.distance ?? 0),
    startingPrice: Number(raw.startingPrice ?? 0),
    rating: Number(raw.rating ?? 0),
    reviewCount: Number(raw.reviewCount ?? 0),
    profilePhoto: raw.profilePhoto ? String(raw.profilePhoto) : undefined,
    isAvailableNow: Boolean(raw.isAvailableNow),
    bio: raw.bio ? String(raw.bio) : undefined,
  };
}

export interface ProviderServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface ProviderReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

export interface ProviderDetail {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  profilePhoto?: string;
  bio?: string;
  specialties: string[];
  services: ProviderServiceItem[];
  reviews: ProviderReview[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

export const providerService = {
  async discover(filters: DiscoveryFilters): Promise<DiscoveryResult> {
    const params = new URLSearchParams();
    if (filters.lat !== undefined) params.append('lat', filters.lat.toString());
    if (filters.lng !== undefined) params.append('lng', filters.lng.toString());
    if (filters.radius !== undefined) params.append('radius', filters.radius.toString());
    if (filters.serviceType) params.append('serviceType', filters.serviceType);
    if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.minRating !== undefined) params.append('minRating', filters.minRating.toString());
    if (filters.availableNow) params.append('availableNow', 'true');
    if (filters.search) params.append('search', filters.search);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.limit !== undefined) params.append('limit', filters.limit.toString());

    const { data } = await apiClient.get<{
      success: boolean;
      data: Record<string, unknown>[];
      pagination: DiscoveryResult['pagination'];
    }>(`/providers/discover?${params.toString()}`);

    const body = data as {
      success?: boolean;
      data?: Record<string, unknown>[];
      pagination?: DiscoveryResult['pagination'];
    };
    const items = (body.data ?? []).map(mapBackendToCardData);
    return {
      data: items,
      pagination: body.pagination ?? { page: 1, limit: 20, total: items.length, totalPages: 1, hasNext: false, hasPrev: false },
    };
  },

  async getProvider(id: string): Promise<ProviderDetail> {
    const { data } = await apiClient.get<{ success: boolean; data: ProviderDetail }>(
      `/providers/${id}`
    );
    const body = data as { success?: boolean; data?: ProviderDetail };
    if (!body.data) throw new Error('Provider not found');
    return body.data;
  },

  async createOrUpdateProfile(data: { bio?: string; specialties?: string[] }): Promise<void> {
    await apiClient.post('/providers/profile', data);
  },

  async completeOnboarding(): Promise<{ user: import('../types').User }> {
    const { data } = await apiClient.post<{
      success: boolean;
      data: { user: import('../types').User };
    }>('/providers/onboarding-complete');
    const body = data as { success?: boolean; data?: { user?: import('../types').User } };
    if (!body.data?.user) throw new Error('Failed to complete onboarding');
    return { user: body.data.user };
  },
};
