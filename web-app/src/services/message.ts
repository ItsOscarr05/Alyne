import apiClient from './api';
import type { MessageCardData } from '../components/cards/MessageCard';

interface RawConversation {
  id?: string;
  otherUser?: { id?: string; firstName?: string; lastName?: string; profilePhoto?: string | null };
  lastMessage?: { id?: string; content?: string; createdAt?: string; senderId?: string };
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  isOwn: boolean;
}

function mapToMessageCard(raw: RawConversation): MessageCardData {
  const other = raw.otherUser;
  const name = other
    ? `${other.firstName ?? ''} ${other.lastName ?? ''}`.trim() || 'User'
    : 'User';
  return {
    id: String(raw.id ?? raw.otherUser?.id ?? ''),
    otherUserId: String(raw.id ?? raw.otherUser?.id ?? ''),
    otherUserName: name,
    otherUserPhoto: other?.profilePhoto ? String(other.profilePhoto) : undefined,
    lastMessage: raw.lastMessage?.content,
    lastMessageAt: raw.lastMessage?.createdAt,
    unreadCount: raw.unreadCount ?? 0,
  };
}

export const messageService = {
  async getConversations(): Promise<MessageCardData[]> {
    const { data } = await apiClient.get<{
      success: boolean;
      data: RawConversation[];
    }>('/messages/conversations');
    const body = data as { success?: boolean; data?: RawConversation[] };
    const items = body.data ?? [];
    return items.map(mapToMessageCard);
  },

  async getMessages(otherUserId: string, limit = 50): Promise<{
    messages: ChatMessage[];
    otherUser: { id: string; name: string; photo?: string };
  }> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const { data } = await apiClient.get<{
      success: boolean;
      data: {
        messages: Array<{
          id?: string;
          content?: string;
          createdAt?: string;
          senderId?: string;
          sender?: { id?: string };
        }>;
        otherUser?: { id?: string; firstName?: string; lastName?: string; profilePhoto?: string | null };
      };
    }>(`/messages/${otherUserId}?${params.toString()}`);

    const body = data as { success?: boolean; data?: { messages: unknown[]; otherUser?: unknown } };
    const res = body.data;
    if (!res) return { messages: [], otherUser: { id: otherUserId, name: 'User' } };

    const other = res.otherUser as RawConversation['otherUser'];
    const otherName = other
      ? `${other.firstName ?? ''} ${other.lastName ?? ''}`.trim() || 'User'
      : 'User';

    const messages: ChatMessage[] = (res.messages ?? []).map(
      (m: { id?: string; content?: string; createdAt?: string; senderId?: string }) => ({
        id: String(m.id ?? ''),
        content: String(m.content ?? ''),
        createdAt: String(m.createdAt ?? ''),
        senderId: String(m.senderId ?? ''),
        isOwn: false,
      })
    );

    return {
      messages,
      otherUser: {
        id: String(other?.id ?? otherUserId),
        name: otherName,
        photo: other?.profilePhoto ? String(other.profilePhoto) : undefined,
      },
    };
  },

  async sendMessage(receiverId: string, content: string): Promise<void> {
    await apiClient.post('/messages/send', { receiverId, content });
  },

  async markAsRead(otherUserId: string): Promise<void> {
    await apiClient.post(`/messages/${otherUserId}/read`);
  },
};
