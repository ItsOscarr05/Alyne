// User Types
export type UserType = 'provider' | 'client';

export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  isVerified: boolean;
}

// Provider Types
export interface ProviderProfile {
  id: string;
  userId: string;
  bio?: string;
  specialties: string[];
  serviceArea: {
    center: { lat: number; lng: number };
    radius: number; // in miles
  };
  isActive: boolean;
}

export interface Service {
  id: string;
  providerId: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in minutes
  isActive: boolean;
}

export interface Credential {
  id: string;
  providerId: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  isVerified: boolean;
}

// Booking Types
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';

export interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  location?: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  notes?: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

// Review Types
export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  rating: number; // 1-5
  comment?: string;
  isVisible: boolean;
  createdAt: string;
}

// Message Types
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  bookingId?: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

