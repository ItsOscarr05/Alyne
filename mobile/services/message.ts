import apiClient from './api';

export interface SendMessageData {
  receiverId: string;
  content: string;
  bookingId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
    userType: string;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export const messageService = {
  async sendMessage(data: SendMessageData) {
    const response = await apiClient.post('/messages/send', data);
    return response.data;
  },

  async getConversations() {
    const response = await apiClient.get('/messages/conversations');
    return response.data;
  },

  async getMessages(otherUserId: string, limit: number = 50, cursor?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);

    const response = await apiClient.get(
      `/messages/${otherUserId}${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data;
  },

  async markAsRead(otherUserId: string) {
    const response = await apiClient.post(`/messages/${otherUserId}/read`);
    return response.data;
  },
};

