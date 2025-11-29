import apiClient from './api';

export interface PaymentIntent {
  clientSecret: string;
  paymentId: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  stripePaymentId?: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const paymentService = {
  async createPaymentIntent(bookingId: string) {
    const response = await apiClient.post<{ success: boolean; data: PaymentIntent }>('/payments/create-intent', { bookingId });
    return response.data.data;
  },

  async confirmPayment(bookingId: string, paymentIntentId: string) {
    const response = await apiClient.post<{ success: boolean; data: Payment }>('/payments/confirm', {
      bookingId,
      paymentIntentId,
    });
    return response.data.data;
  },

  async getByBooking(bookingId: string) {
    const response = await apiClient.get<{ success: boolean; data: Payment }>(`/payments/booking/${bookingId}`);
    return response.data.data;
  },

  async getPaymentHistory() {
    const response = await apiClient.get<{ success: boolean; data: Payment[] }>('/payments/history');
    return response.data.data; // Extract data from { success: true, data: payments }
  },
};

