import type { MessageCardData } from '../components/cards/MessageCard';

export const mockMessages: MessageCardData[] = [
  {
    id: '1',
    otherUserId: '1',
    otherUserName: 'Sarah Johnson',
    lastMessage: 'See you tomorrow at 10am!',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 1,
  },
  {
    id: '2',
    otherUserId: '3',
    otherUserName: 'Emily Rodriguez',
    lastMessage: 'The yoga class was great. Looking forward to next session.',
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
  },
];
