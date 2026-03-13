import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCard } from '../components/cards/MessageCard';
import { messageService } from '../services/message';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import type { MessageCardData } from '../components/cards/MessageCard';
import styles from './Messages.module.css';

export function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { onMessage } = useSocket();
  const [conversations, setConversations] = useState<MessageCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await messageService.getConversations();
      setConversations(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const unsubscribe = onMessage(() => {
      fetchConversations();
    });
    return unsubscribe;
  }, [onMessage, fetchConversations]);

  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          c.otherUserName.toLowerCase().includes(search.trim().toLowerCase())
      )
    : conversations;

  const handleCardPress = (userId: string) => {
    navigate(`/messages/${userId}`);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Messages</h1>

      {error && (
        <p className={styles.error} role="alert">
          {error}{' '}
          <button type="button" onClick={fetchConversations} className={styles.retryLink}>
            Try again
          </button>
        </p>
      )}

      {loading && !error && <p className={styles.loading}>Loading conversations…</p>}

      {!loading && !error && (
        <div className={styles.layout}>
          <div className={styles.list}>
            <input
              type="search"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
              aria-label="Search conversations"
            />
            {filtered.length > 0 ? (
              filtered.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  isActive={location.pathname === `/messages/${msg.id}`}
                  onPress={() => handleCardPress(msg.id)}
                />
              ))
            ) : (
              <p className={styles.empty}>
                {search.trim() ? 'No matching conversations.' : 'No conversations yet.'}
              </p>
            )}
          </div>

          <div className={styles.thread}>
            <div className={styles.threadEmpty}>
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
