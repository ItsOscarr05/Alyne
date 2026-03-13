import apiClient from './api';
import type { BookingCardData } from '../components/cards/BookingCard';

interface RawBooking {
  id?: string;
  providerId?: string;
  clientId?: string;
  status?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  location?: string | { address?: string } | null;
  notes?: string | null;
  provider?: { firstName?: string; lastName?: string; profilePhoto?: string | null };
  client?: { firstName?: string; lastName?: string; profilePhoto?: string | null };
  service?: { name?: string; price?: number | string };
}

function getViewerRole(raw: RawBooking, userId?: string): 'client' | 'provider' | undefined {
  if (!userId) return undefined;
  if (raw.clientId === userId) return 'client';
  if (raw.providerId === userId) return 'provider';
  return undefined;
}

function mapToBookingCard(raw: RawBooking, viewerRole?: 'client' | 'provider'): BookingCardData {
  const provider = raw.provider;
  const client = raw.client;
  const providerName = provider
    ? `${provider.firstName ?? ''} ${provider.lastName ?? ''}`.trim() || 'Provider'
    : 'Provider';
  const clientName = client
    ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || 'Client'
    : 'Client';
  const displayName = viewerRole === 'provider' ? clientName : providerName;
  const displayPhoto =
    viewerRole === 'provider' ? client?.profilePhoto : provider?.profilePhoto;
  const service = raw.service;
  const price = service?.price != null ? Number(service.price) : 0;
  const locationStr =
    typeof raw.location === 'string'
      ? raw.location
      : raw.location?.address
        ? JSON.stringify(raw.location)
        : undefined;

  return {
    id: String(raw.id ?? ''),
    providerId: String(raw.providerId ?? ''),
    providerName: displayName,
    providerPhoto: displayPhoto ? String(displayPhoto) : undefined,
    serviceName: service?.name ?? 'Service',
    status: (raw.status as BookingCardData['status']) ?? 'PENDING',
    scheduledDate: raw.scheduledDate ? String(raw.scheduledDate).split('T')[0] : '',
    scheduledTime: raw.scheduledTime ? String(raw.scheduledTime) : '',
    price,
    location: locationStr,
    notes: raw.notes ? String(raw.notes) : undefined,
  };
}

export const bookingService = {
  async getBookings(
    status?: string,
    role?: 'client' | 'provider',
    userId?: string
  ): Promise<BookingCardData[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (role) params.append('role', role);

    const { data } = await apiClient.get<{
      success: boolean;
      data: RawBooking[];
      pagination?: { total: number };
    }>(`/bookings?${params.toString()}`);

    const body = data as { success?: boolean; data?: RawBooking[] };
    const items = body.data ?? [];
    return items.map((b) => mapToBookingCard(b, role ?? getViewerRole(b, userId)));
  },

  async getBooking(id: string, viewerRole?: 'client' | 'provider'): Promise<BookingCardData | null> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: RawBooking }>(
        `/bookings/${id}`
      );
      const body = data as { success?: boolean; data?: RawBooking };
      return body.data ? mapToBookingCard(body.data, viewerRole) : null;
    } catch {
      return null;
    }
  },

  async cancelBooking(id: string): Promise<void> {
    await apiClient.post(`/bookings/${id}/cancel`);
  },

  async acceptBooking(id: string): Promise<void> {
    await apiClient.post(`/bookings/${id}/accept`);
  },

  async declineBooking(id: string): Promise<void> {
    await apiClient.post(`/bookings/${id}/decline`);
  },

  async completeBooking(id: string): Promise<void> {
    await apiClient.post(`/bookings/${id}/complete`);
  },

  async rescheduleBooking(
    id: string,
    scheduledDate: string,
    scheduledTime: string
  ): Promise<void> {
    await apiClient.patch(`/bookings/${id}/reschedule`, { scheduledDate, scheduledTime });
  },
};
