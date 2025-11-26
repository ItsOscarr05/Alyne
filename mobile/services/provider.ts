import apiClient from './api';
import { ProviderCardData } from '../components/ProviderCard';

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
}

export interface ProviderDetail {
  id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  bio?: string;
  specialties: string[];
  serviceArea: {
    center: { lat: number; lng: number };
    radius: number;
  };
  services: Service[];
  credentials: Credential[];
  availability: AvailabilitySlot[];
  reviews: Review[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface Credential {
  id: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  isVerified: boolean;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string;
}

export interface Review {
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

export const providerService = {
  async discover(filters: DiscoveryFilters) {
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

    const response = await apiClient.get<{ success: boolean; data: ProviderCardData[] }>(
      `/providers/discover?${params.toString()}`
    );
    return response.data.data;
  },

  async getById(providerId: string) {
    const response = await apiClient.get<{ success: boolean; data: ProviderDetail }>(
      `/providers/${providerId}`
    );
    return response.data.data;
  },

  async getServices(providerId: string) {
    const response = await apiClient.get<{ success: boolean; data: Service[] }>(
      `/providers/${providerId}/services`
    );
    return response.data.data;
  },

  async getReviews(providerId: string) {
    const response = await apiClient.get<{ success: boolean; data: Review[] }>(
      `/providers/${providerId}/reviews`
    );
    return response.data.data;
  },
};

