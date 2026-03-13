import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (
  import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '')
    : 'http://localhost:3000'
);

function decodeJWT(token: string): { userId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const decoded = decodeJWT(token);
    const userId = decoded?.userId ?? null;
    if (!userId) return;

    if (tokenRef.current && tokenRef.current !== token && socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    if (socketRef.current && tokenRef.current === token) return;

    tokenRef.current = token;

    const newSocket = io(SOCKET_URL, {
      path: '/socket.io/',
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    const checkInterval = setInterval(() => {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken !== token && socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        tokenRef.current = null;
      }
    }, 2000);

    return () => {
      clearInterval(checkInterval);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        tokenRef.current = null;
      }
    };
  }, []);

  const joinConversation = (otherUserId: string) => {
    socket?.emit('join-conversation', otherUserId);
  };

  const leaveConversation = (otherUserId: string) => {
    socket?.emit('leave-conversation', otherUserId);
  };

  const sendMessage = (data: { receiverId: string; content: string; bookingId?: string }) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit('send-message', data);
      socket.once('message-sent', resolve);
      socket.once('message-error', reject);
    });
  };

  const onMessage = (callback: (message: unknown) => void) => {
    if (!socket) return () => {};
    socket.on('receive-message', callback);
    socket.on('new-message', callback);
    return () => {
      socket.off('receive-message', callback);
      socket.off('new-message', callback);
    };
  };

  const onMessagesRead = (callback: (data: { messages: unknown[]; readBy: string }) => void) => {
    if (!socket) return () => {};
    socket.on('messages-read', callback);
    return () => socket.off('messages-read', callback);
  };

  const onBookingUpdate = (callback: (data: { bookingId: string; status: string; booking: unknown }) => void) => {
    if (!socket) return () => {};
    socket.on('booking-updated', callback);
    return () => socket.off('booking-updated', callback);
  };

  const onProviderRatingUpdate = (callback: (data: { providerId: string; rating: number; reviewCount: number }) => void) => {
    if (!socket) return () => {};
    socket.on('provider-rating-updated', callback);
    return () => socket.off('provider-rating-updated', callback);
  };

  const onReviewDeleted = (callback: (data: { bookingId: string; reviewId: string }) => void) => {
    if (!socket) return () => {};
    socket.on('review-deleted', callback);
    return () => socket.off('review-deleted', callback);
  };

  return {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    onMessage,
    onMessagesRead,
    onBookingUpdate,
    onProviderRatingUpdate,
    onReviewDeleted,
  };
}
