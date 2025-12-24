import apiClient from './api';

export interface SubmitReviewData {
  bookingId: string;
  providerId: string;
  rating: number;
  comment?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment?: string;
  isVisible: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  booking?: {
    id: string;
    service?: {
      name: string;
    };
  };
}

export const reviewService = {
  async submitReview(data: SubmitReviewData) {
    const response = await apiClient.post('/reviews/submit', data);
    return response.data;
  },

  async getReviewByBooking(bookingId: string) {
    const response = await apiClient.get(`/reviews/booking/${bookingId}`);
    return response.data;
  },

  async updateReview(reviewId: string, data: {
    rating?: number;
    comment?: string;
    isVisible?: boolean;
  }) {
    const response = await apiClient.put(`/reviews/${reviewId}`, data);
    return response.data;
  },

  async flagReview(reviewId: string, reason?: string) {
    const response = await apiClient.post(`/reviews/${reviewId}/flag`, { reason });
    return response.data;
  },

  async deleteReview(reviewId: string) {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response.data;
  },
};

