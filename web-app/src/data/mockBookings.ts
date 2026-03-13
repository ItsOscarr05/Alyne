import type { BookingCardData } from '../components/cards/BookingCard';

export const mockBookings: BookingCardData[] = [
  {
    id: '1',
    providerId: '1',
    providerName: 'Sarah Johnson',
    serviceName: 'Personal Training',
    status: 'CONFIRMED',
    scheduledDate: '2025-03-15',
    scheduledTime: '10:00',
    price: 75,
  },
  {
    id: '2',
    providerId: '3',
    providerName: 'Emily Rodriguez',
    serviceName: 'Yoga Session',
    status: 'PENDING',
    scheduledDate: '2025-03-16',
    scheduledTime: '14:30',
    price: 60,
  },
  {
    id: '3',
    providerId: '4',
    providerName: 'David Thompson',
    serviceName: 'Nutrition Consultation',
    status: 'COMPLETED',
    scheduledDate: '2025-03-10',
    scheduledTime: '09:00',
    price: 80,
  },
];
