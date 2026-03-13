import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { messageService } from '../services/message';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import styles from './ChatThread.module.css';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

export function ChatThread() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinConversation, leaveConversation, sendMessage: socketSend, onMessage, isConnected } = useSocket();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [otherUser, setOtherUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!userId || !user?.id) return;

    joinConversation(userId);

    return () => {
      leaveConversation(userId);
    };
  }, [userId, user?.id, joinConversation, leaveConversation]);

  useEffect(() => {
    if (!userId || !user?.id) return;

    setLoading(true);
    setError(null);
    messageService
      .getMessages(userId)
      .then(({ messages: msgs, otherUser: ou }) => {
        setOtherUser({ name: ou.name });
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt,
            isOwn: m.senderId === user.id,
          }))
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [userId, user?.id]);

  useEffect(() => {
    if (!userId) return;
    messageService.markAsRead(userId).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId || !user?.id) return;

    const unsubscribe = onMessage((msg: unknown) => {
      const m = msg as { id?: string; content?: string; createdAt?: string; senderId?: string; receiverId?: string };
      const isForThisThread =
        m.senderId === userId || m.receiverId === userId;
      if (isForThisThread) {
        setMessages((prev) => {
          if (prev.some((p) => p.id === m.id)) return prev;
          return [
            ...prev,
            {
              id: String(m.id ?? `new-${Date.now()}`),
              content: String(m.content ?? ''),
              createdAt: String(m.createdAt ?? new Date().toISOString()),
              isOwn: m.senderId === user.id,
            },
          ];
        });
      }
    });

    return unsubscribe;
  }, [userId, user?.id, onMessage]);

  const handleSend = async () => {
    if (!userId || !newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const optimistic: MessageItem = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      if (isConnected) {
        await socketSend({ receiverId: userId, content });
      } else {
        await messageService.sendMessage(userId, content);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, id: `sent-${m.id}` } : m
        )
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  if (!userId) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>Invalid conversation</p>
        <button type="button" onClick={() => navigate('/messages')}>
          Back to Messages
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/messages')}
        >
          <ArrowLeft size={24} />
          Back
        </button>
        <h1 className={styles.title}>{otherUser?.name ?? 'Loading…'}</h1>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className={styles.loading}>Loading messages…</div>
      ) : (
        <>
          <div className={styles.messages}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.bubble} ${m.isOwn ? styles.own : styles.other}`}
              >
                <p>{m.content}</p>
                <span className={styles.time}>{formatTime(m.createdAt)}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form
            className={styles.compose}
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message…"
              className={styles.input}
              disabled={sending}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!newMessage.trim() || sending}
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
