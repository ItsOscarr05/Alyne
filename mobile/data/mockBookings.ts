export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  serviceName: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string; // ISO date string
  scheduledTime: string; // "14:00" format
  price: number;
  location?: string;
  notes?: string;
}

export const mockBookings: Booking[] = [
  {
    id: '1',
    providerId: '1',
    providerName: 'Sarah Johnson',
    serviceName: 'Personal Training Session',
    status: 'CONFIRMED',
    scheduledDate: '2025-11-10',
    scheduledTime: '10:00',
    price: 75,
    location: 'Your Home',
    notes: 'Focus on upper body strength',
  },
  {
    id: '2',
    providerId: '3',
    providerName: 'Emily Rodriguez',
    serviceName: 'Yoga Session',
    status: 'PENDING',
    scheduledDate: '2025-11-12',
    scheduledTime: '18:00',
    price: 60,
    location: 'Studio',
  },
  {
    id: '3',
    providerId: '5',
    providerName: 'Jessica Martinez',
    serviceName: 'Pilates Session',
    status: 'COMPLETED',
    scheduledDate: '2025-11-05',
    scheduledTime: '14:00',
    price: 70,
    location: 'Studio',
  },
  {
    id: '4',
    providerId: '2',
    providerName: 'Michael Chen',
    serviceName: 'Fitness Training',
    status: 'CONFIRMED',
    scheduledDate: '2025-11-15',
    scheduledTime: '09:00',
    price: 65,
    location: 'Gym',
  },
];

