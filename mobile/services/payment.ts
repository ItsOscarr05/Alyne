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
    const response = await apiClient.post('/payments/create-intent', { bookingId });
    return response.data;
  },

  async confirmPayment(bookingId: string, paymentIntentId: string) {
    const response = await apiClient.post('/payments/confirm', {
      bookingId,
      paymentIntentId,
    });
    return response.data;
  },

  async getPaymentByBooking(bookingId: string) {
    const response = await apiClient.get(`/payments/booking/${bookingId}`);
    return response.data;
  },
};

