import apiClient from './api';

export interface PaymentIntent {
  clientSecret: string;
  paymentId: string;
  amount: number; // Total amount (service price + platform fee)
  providerAmount: number; // Provider share
  platformFee: number; // Platform fee (application fee)
  requiresPlaidPayment?: boolean; // Deprecated; always false with Stripe Connect
  stripeAmount?: number; // Amount in Stripe payment intent (total)
  stripeAccountId?: string; // Connected account for the provider (required for web Connect)
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number; // Total amount paid by client
  providerAmount: number; // Amount going to provider
  platformFee: number; // Platform fee
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

  /**
   * Release provider payout (manual payouts) after completion.
   */
  async processProviderPayment(bookingId: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>('/payments/process-provider-payment', {
      bookingId,
    });
    return response.data.data;
  },
};

