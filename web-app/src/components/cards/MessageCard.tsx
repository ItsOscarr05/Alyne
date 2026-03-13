import { User } from 'lucide-react';
import styles from './MessageCard.module.css';

export interface MessageCardData {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface MessageCardProps {
  message: MessageCardData;
  isActive?: boolean;
  onPress: () => void;
}

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function MessageCard({ message, isActive, onPress }: MessageCardProps) {
  return (
    <article
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      onClick={onPress}
      onKeyDown={(e) => e.key === 'Enter' && onPress()}
      role="button"
      tabIndex={0}
    >
      <div className={styles.avatar}>
        {message.otherUserPhoto ? (
          <img src={message.otherUserPhoto} alt="" />
        ) : (
          <User size={24} />
        )}
        {message.unreadCount && message.unreadCount > 0 && (
          <span className={styles.unreadBadge}>{message.unreadCount}</span>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.name}>{message.otherUserName}</h3>
          {message.lastMessageAt && (
            <span className={styles.time}>{formatTime(message.lastMessageAt)}</span>
          )}
        </div>
        {message.lastMessage && (
          <p className={styles.preview}>{message.lastMessage}</p>
        )}
      </div>
    </article>
  );
}
