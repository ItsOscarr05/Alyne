import apiClient from './api';
import { Booking } from '../data/mockBookings';

export interface CreateBookingData {
  providerId: string;
  serviceId: string;
  scheduledDate: string; // ISO date string
  scheduledTime: string; // "14:00" format
  location?: {
    address?: string;
    coordinates?: { lat: number; lng: number };
  };
  notes?: string;
}

export interface BookingDetail extends Booking {
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  payment?: {
    id: string;
    status: string;
    amount: number;
  };
}

export const bookingService = {
  async create(data: CreateBookingData) {
    const response = await apiClient.post<{ success: boolean; data: BookingDetail }>(
      '/bookings',
      data
    );
    return response.data.data;
  },

  async getMyBookings(status?: string, role?: 'client' | 'provider') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (role) params.append('role', role);

    const response = await apiClient.get<{ success: boolean; data: BookingDetail[] }>(
      `/bookings?${params.toString()}`
    );
    return response.data.data;
  },

  async getById(bookingId: string) {
    const response = await apiClient.get<{ success: boolean; data: BookingDetail }>(
      `/bookings/${bookingId}`
    );
    return response.data.data;
  },

  async accept(bookingId: string) {
    const response = await apiClient.post<{ success: boolean; data: BookingDetail }>(
      `/bookings/${bookingId}/accept`
    );
    return response.data.data;
  },

  async decline(bookingId: string) {
    const response = await apiClient.post<{ success: boolean; data: BookingDetail }>(
      `/bookings/${bookingId}/decline`
    );
    return response.data.data;
  },

  async cancel(bookingId: string) {
    const response = await apiClient.post<{ success: boolean; data: BookingDetail }>(
      `/bookings/${bookingId}/cancel`
    );
    return response.data.data;
  },

  async update(bookingId: string, updates: Partial<CreateBookingData>) {
    const response = await apiClient.patch<{ success: boolean; data: BookingDetail }>(
      `/bookings/${bookingId}`,
      updates
    );
    return response.data.data;
  },
};

