import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';
import { logger } from '../utils/logger';

// Simple JWT decode (just the payload, no verification)
const decodeJWT = (token: string): { userId?: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64 decode (handle URL-safe base64)
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    logger.error('Failed to decode JWT', error);
    return null;
  }
};

// Socket.io connects to the server root, NOT /api
const SOCKET_URL =
  (Constants.expoConfig?.extra?.API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000')
    .replace('/api', '') || 'http://localhost:3000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    const initializeSocket = async () => {
      const token = await storage.getItem('auth_token');
      if (!token) {
        logger.debug('No auth token found, skipping socket connection');
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
          setSocket(null);
          setIsConnected(false);
          setAuthenticatedUserId(null);
        }
        return;
      }

      // Decode token to get userId
      const decoded = decodeJWT(token);
      const userId = decoded?.userId || null;
      if (!userId) {
        logger.error('Failed to decode userId from token');
        return;
      }

      // If token changed, disconnect old socket
      if (tokenRef.current && tokenRef.current !== token && socketRef.current) {
        logger.debug('Token changed, disconnecting old socket');
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setAuthenticatedUserId(null);
      }

      // If socket already exists and token is the same, don't reconnect
      if (socketRef.current && tokenRef.current === token) {
        logger.debug('Already connected with same token');
        return;
      }

      tokenRef.current = token;

      logger.debug('Attempting to connect socket', { userId, tokenPreview: token.substring(0, 20) + '...' });

      // Create socket connection
      // IMPORTANT: Connect to server root, not /api
      const newSocket = io(SOCKET_URL, {
        path: '/socket.io/',
        auth: {
          token,
        },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true, // Force new connection to ensure fresh auth
        autoConnect: true,
      });
      
      logger.debug('Socket connecting', { url: SOCKET_URL, userId });

      newSocket.on('connect', () => {
        if (mounted) {
          logger.info('Socket connected', { userId });
          setIsConnected(true);
          setAuthenticatedUserId(userId);
        }
      });

      newSocket.on('disconnect', () => {
        if (mounted) {
          logger.debug('Socket disconnected');
          setIsConnected(false);
          setAuthenticatedUserId(null);
        }
      });

      newSocket.on('connect_error', (error) => {
        logger.error('Socket connection error', error, { errorType: error.type });
        if (mounted) {
          setIsConnected(false);
          setAuthenticatedUserId(null);
        }
      });

      // Monitor token changes
      checkInterval = setInterval(async () => {
        const currentToken = await storage.getItem('auth_token');
        if (currentToken !== token && socketRef.current) {
          logger.debug('Token changed in storage, reconnecting socket');
          socketRef.current.close();
          socketRef.current = null;
          setSocket(null);
          setIsConnected(false);
          setAuthenticatedUserId(null);
          tokenRef.current = null;
          // Reinitialize with new token
          setTimeout(() => initializeSocket(), 100);
        }
      }, 1000);

      if (mounted) {
        socketRef.current = newSocket;
        setSocket(newSocket);
      } else {
        newSocket.close();
      }
    };

    initializeSocket();

    return () => {
      mounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setAuthenticatedUserId(null);
        tokenRef.current = null;
      }
    };
  }, []);

  const joinConversation = (otherUserId: string) => {
    if (socket) {
      socket.emit('join-conversation', otherUserId);
    }
  };

  const leaveConversation = (otherUserId: string) => {
    if (socket) {
      socket.emit('leave-conversation', otherUserId);
    }
  };

  const sendMessage = (data: {
    receiverId: string;
    content: string;
    bookingId?: string;
  }) => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit('send-message', data);

      socket.once('message-sent', (message) => {
        resolve(message);
      });

      socket.once('message-error', (error) => {
        reject(error);
      });
    });
  };

  const onMessage = (callback: (message: any) => void) => {
    if (!socket) return () => {};

    socket.on('receive-message', callback);
    socket.on('new-message', callback);

    return () => {
      socket.off('receive-message', callback);
      socket.off('new-message', callback);
    };
  };

  const onMessagesRead = (callback: (data: { messages: any[]; readBy: string }) => void) => {
    if (!socket) return () => {};

    socket.on('messages-read', callback);

    return () => {
      socket.off('messages-read', callback);
    };
  };

  const onBookingUpdate = (callback: (data: { bookingId: string; status: string; booking: any }) => void) => {
    if (!socket) return () => {};

    socket.on('booking-updated', callback);

    return () => {
      socket.off('booking-updated', callback);
    };
  };

  const onProviderRatingUpdate = (callback: (data: { providerId: string; rating: number; reviewCount: number }) => void) => {
    if (!socket) return () => {};

    socket.on('provider-rating-updated', callback);

    return () => {
      socket.off('provider-rating-updated', callback);
    };
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
  };
};

