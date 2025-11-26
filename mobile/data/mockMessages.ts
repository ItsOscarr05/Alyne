export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content: string;
  timestamp: string; // ISO date string
  isRead: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isProvider: boolean;
}

export const mockConversations: Conversation[] = [
  {
    id: '1',
    userId: '1',
    userName: 'Sarah Johnson',
    lastMessage: 'Looking forward to our session tomorrow!',
    lastMessageTime: '2025-11-09T14:30:00Z',
    unreadCount: 0,
    isProvider: true,
  },
  {
    id: '2',
    userId: '3',
    userName: 'Emily Rodriguez',
    lastMessage: 'Can we reschedule to next week?',
    lastMessageTime: '2025-11-09T10:15:00Z',
    unreadCount: 2,
    isProvider: true,
  },
  {
    id: '3',
    userId: '5',
    userName: 'Jessica Martinez',
    lastMessage: 'Thank you for the great session!',
    lastMessageTime: '2025-11-05T16:45:00Z',
    unreadCount: 0,
    isProvider: true,
  },
  {
    id: '4',
    userId: '2',
    userName: 'Michael Chen',
    lastMessage: 'See you at the gym!',
    lastMessageTime: '2025-11-08T20:00:00Z',
    unreadCount: 1,
    isProvider: true,
  },
];

