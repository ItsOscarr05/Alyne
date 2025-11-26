import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeSocket = async () => {
      const token = await storage.getItem('auth_token');
      if (!token) {
        return;
      }

      // Create socket connection
      const newSocket = io(API_BASE_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        if (mounted) {
          console.log('Socket connected');
          setIsConnected(true);
        }
      });

      newSocket.on('disconnect', () => {
        if (mounted) {
          console.log('Socket disconnected');
          setIsConnected(false);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (mounted) {
          setIsConnected(false);
        }
      });

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
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, []);

  const joinConversation = (otherUserId: string) => {
    if (socket) {
      socket.emit('join-conversation', otherUserId);
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

  return {
    socket,
    isConnected,
    joinConversation,
    sendMessage,
    onMessage,
  };
};

