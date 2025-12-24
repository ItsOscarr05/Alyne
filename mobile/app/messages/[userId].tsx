import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { messageService, Message } from '../../services/message';

export default function ChatScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { socket, joinConversation, leaveConversation, sendMessage, onMessage, onMessagesRead, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [failedMessages, setFailedMessages] = useState<Array<{ content: string; timestamp: number }>>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to ensure messages array has no duplicates
  const deduplicateMessages = (messages: Message[]): Message[] => {
    const seen = new Set<string>();
    return messages.filter((msg) => {
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  };

  // Redirect to login if not authenticated (must be before any conditional returns)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Separate function for actually sending the message (used by both handleSend and retry logic)
  const handleSendMessage = useCallback(async (content: string, isRetry: boolean = false) => {
    if (!userId || !user) {
      throw new Error('User or userId not available');
    }

    // Check if a temp message with this content already exists (prevent duplicates)
    const existingTempMessage = messages.find(
      (m) => m.id.startsWith('temp-') && m.content === content && m.senderId === user.id
    );

    let tempMessage: Message;
    let shouldAddTemp = false;

    if (existingTempMessage && !isRetry) {
      // If temp message already exists and this is not a retry, use the existing one
      console.log('Temp message already exists for this content, using existing:', existingTempMessage.id);
      tempMessage = existingTempMessage;
    } else {
      // Create new temp message only if it doesn't exist or this is a retry
      tempMessage = {
        id: `temp-${Date.now()}`,
        senderId: user.id,
        receiverId: userId,
        content,
        status: 'SENT',
        createdAt: new Date().toISOString(),
        sender: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePhoto: user.profilePhoto,
        },
      };
      shouldAddTemp = true;
    }

    // Add temp message immediately so user sees it (only if new)
    if (shouldAddTemp) {
      setMessages((prev) => {
        // Check again to prevent race conditions
        const alreadyExists = prev.some(
          (m) => m.id.startsWith('temp-') && m.content === content && m.senderId === user.id
        );
        if (alreadyExists) {
          console.log('Temp message already exists, skipping add');
          return prev;
        }
        console.log('Adding temp message:', tempMessage.id, tempMessage.content);
        return [...prev, tempMessage];
      });
    }

    // Small delay to ensure temp message renders before network operations
    await new Promise(resolve => setTimeout(resolve, 50));

    // Send via socket (with fallback to API)
    let realMessage;
    try {
      // Try socket first with timeout (don't check navigator.onLine here - let it fail naturally)
      const socketPromise = sendMessage({
        receiverId: userId,
        content,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Socket timeout - network may be unavailable')), 5000)
      );
      
      const sentMessage = await Promise.race([socketPromise, timeoutPromise]) as any;
      // Socket returns message directly with updated status
      logger.debug('Message sent via socket', { status: sentMessage?.status });
      realMessage = sentMessage;
    } catch (socketError: any) {
      // Fallback to API if socket fails or times out
      logger.debug('Socket failed, using API fallback', socketError);
      
      try {
        const apiResponse = await messageService.sendMessage({
          receiverId: userId,
          content,
        });
        // API returns { data: message } or just message
        realMessage = apiResponse.data || apiResponse;
        logger.debug('Message sent via API', { status: realMessage?.status });
      } catch (apiError: any) {
        logger.error('API fallback also failed', apiError);
        // Enhance error message for network issues
        if (apiError?.message?.includes('fetch') || apiError?.message?.includes('network')) {
          throw new Error('Network error - unable to connect to server');
        }
        throw apiError;
      }
    }

    // Replace temp message with real one, and ensure no duplicates
    setMessages((prev) => {
      // Remove temp message and any existing message with the same ID
      const withoutTemp = prev.filter((m) => m.id !== tempMessage.id && m.id !== realMessage.id);
      // Add the real message and deduplicate
      return deduplicateMessages([...withoutTemp, realMessage]);
    });

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Refocus input after sending (only if not a retry)
    if (!isRetry) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }

    return realMessage;
  }, [userId, user, sendMessage, messages]);

  // Retry failed messages when connection is restored
  const isRetryingRef = useRef(false);
  useEffect(() => {
    if (isConnected && failedMessages.length > 0 && user && userId && !isRetryingRef.current) {
      console.log(`[Chat ${userId}] Connection restored, retrying ${failedMessages.length} failed messages`);
      
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      // Set retrying flag to prevent multiple retries
      isRetryingRef.current = true;

      // Retry failed messages after a short delay
      retryTimeoutRef.current = setTimeout(async () => {
        const messagesToRetry = [...failedMessages];
        setFailedMessages([]); // Clear queue immediately to prevent duplicates

        for (const failedMsg of messagesToRetry) {
          try {
            console.log(`[Chat ${userId}] Retrying message:`, failedMsg.content);
            await handleSendMessage(failedMsg.content, true); // true = isRetry
          } catch (error) {
            console.error('Error retrying message:', error);
            // Re-add to queue if retry fails (only if not already there)
            setFailedMessages((prev) => {
              const alreadyQueued = prev.some((msg) => msg.content === failedMsg.content);
              if (alreadyQueued) {
                return prev;
              }
              return [...prev, failedMsg];
            });
          }
        }
        
        // Reset retrying flag after all retries complete
        isRetryingRef.current = false;
      }, 1000); // Wait 1 second after connection before retrying
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isConnected, failedMessages.length, user, userId, handleSendMessage]);

  useEffect(() => {
    if (!userId || !user) return;

    // Join conversation room
    joinConversation(userId);

    // Load messages
    loadMessages();

    // Listen for read receipts (when other user reads your messages)
    const unsubscribeRead = onMessagesRead((data: { messages: Message[]; readBy: string }) => {
      // Only process if the read receipt is from the current conversation
      if (data.readBy !== userId) {
        return;
      }

      console.log(`[Chat ${userId}] Received read receipts for ${data.messages.length} messages`);

      // Update message statuses to READ
      setMessages((prev) => {
        const updated = prev.map((msg) => {
          // Check if this message was marked as read
          const readMessage = data.messages.find((readMsg) => readMsg.id === msg.id);
          if (readMessage && msg.senderId === user.id) {
            // This is your message that was read
            console.log(`[Chat ${userId}] Updating message ${msg.id} status to READ`);
            return { ...msg, status: 'READ' as const };
          }
          return msg;
        });
        // Only update if something actually changed
        const hasChanges = updated.some((msg, index) => msg.status !== prev[index]?.status);
        if (hasChanges) {
          console.log(`[Chat ${userId}] Status updates applied, re-rendering messages`);
          return deduplicateMessages(updated);
        }
        return prev;
      });
    });

    // Listen for new messages and status updates
    // IMPORTANT: Filter messages to only this conversation AND current authenticated user
    const unsubscribe = onMessage((message: Message) => {
      // CRITICAL: First check - message must involve the current authenticated user
      // This prevents messages from other users' sessions from appearing
      if (message.senderId !== user.id && message.receiverId !== user.id) {
        console.log(`[Chat ${userId}] Ignoring message - not for current user (user.id: ${user.id}, sender: ${message.senderId}, receiver: ${message.receiverId})`);
        return;
      }

      // CRITICAL: Second check - message must be between current user and the other user in THIS conversation
      // This prevents messages from other conversations from appearing
      const isForThisConversation =
        (message.senderId === userId && message.receiverId === user.id) ||
        (message.senderId === user.id && message.receiverId === userId);
      
      if (!isForThisConversation) {
        // Ignore messages not for this conversation - this is critical for multi-user scenarios
        console.log(`[Chat ${userId}] Ignoring message from ${message.senderId} to ${message.receiverId} (not for this conversation)`);
        return;
      }

      console.log(`[Chat ${userId}] Processing message for this conversation:`, message.id);

      setMessages((prev) => {
        // Check if message already exists (update it) or add new one
        const existingIndex = prev.findIndex((m) => m.id === message.id);
        if (existingIndex !== -1) {
          // Update existing message (e.g., status update)
          const updated = [...prev];
          updated[existingIndex] = message;
          return deduplicateMessages(updated);
        }
        // Add new message and ensure no duplicates
        return deduplicateMessages([...prev, message]);
      });
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      // Cleanup: leave conversation room and unsubscribe from message listeners
      leaveConversation(userId);
      unsubscribe();
      unsubscribeRead();
    };
  }, [userId, user]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await messageService.getMessages(userId);
      const messages = response.data.messages || [];
      
      // Deduplicate messages by ID to prevent duplicate keys
      setMessages(deduplicateMessages(messages));
      setOtherUser(response.data.otherUser);
      
      // Mark as read via Socket.io (real-time)
      if (socket) {
        socket.emit('mark-as-read', { otherUserId: userId });
      } else {
        // Fallback to REST API if socket not connected
        await messageService.markAsRead(userId);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !userId || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await handleSendMessage(content, false);
    } catch (error: any) {
      logger.error('Error sending message', error);
      
      // Check if it's a network error
      const isNetworkError = 
        error?.message?.includes('Network') ||
        error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('fetch') ||
        error?.code === 'NETWORK_ERROR' ||
        (typeof navigator !== 'undefined' && !navigator.onLine);
      
      // Keep temp message visible for a bit so user can see the attempt
      // Remove it after a delay (after user has seen the error)
      setTimeout(() => {
        logger.debug('Removing temp message after error');
        setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      }, 2000); // Keep visible for 2 seconds so user can see it
      
      // Queue message for retry if it's a network error
      if (isNetworkError) {
        logger.debug('Queueing message for retry', { content });
        setFailedMessages((prev) => {
          // Check if this message is already in the queue to prevent duplicates
          const alreadyQueued = prev.some((msg) => msg.content === content);
          if (alreadyQueued) {
            console.log('Message already in retry queue, skipping');
            return prev;
          }
          return [...prev, { content, timestamp: Date.now() }];
        });
        
        Alert.alert(
          'Connection Error',
          'Unable to send message. It will be sent automatically when your connection is restored.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ],
          { cancelable: true }
        );
      } else {
        setInputText(content); // Restore input text for non-network errors
        Alert.alert(
          'Error',
          'Failed to send message. Please try again.',
          [
            {
              text: 'OK',
              style: 'default',
            },
          ],
          { cancelable: true }
        );
      }
      
      // Refocus input on error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } finally {
      // Always reset sending state so button works again
      setSending(false);
    }
  };

  const handleKeyPress = (e: any) => {
    // On web, Enter sends, Shift+Enter creates new line
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      if (inputText.trim() && !sending) {
        handleSend();
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    // Ensure user is loaded before determining message alignment
    if (!user || !user.id) {
      console.warn('Chat: User not loaded, defaulting to other message alignment');
    }
    
    const isMe = user?.id && item.senderId === user.id;
    const senderName = item.sender
      ? `${item.sender.firstName} ${item.sender.lastName}`
      : 'Unknown';

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.myMessage : styles.otherMessage,
        ]}
      >
        {!isMe ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.sender?.firstName[0] || 'U'}
              {item.sender?.lastName[0] || ''}
            </Text>
          </View>
        ) : null}
        <View style={isMe ? styles.messageBubbleWrapper : styles.otherMessageBubbleWrapper}>
          <View
            style={[
              styles.messageBubble,
              isMe ? styles.myBubble : styles.otherBubble,
            ]}
          >
            {!isMe && (
              <Text style={styles.senderName}>{senderName}</Text>
            )}
            <Text style={[styles.messageText, isMe && styles.myMessageText]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          {isMe && (
            <Text style={styles.statusText}>
              {item.id.startsWith('temp-') ? 'Sending' : 
               item.status === 'READ' ? 'Read' :
               item.status === 'DELIVERED' ? 'Delivered' :
               'Sending'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Show loading while auth is loading or messages are loading
  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  // Early return if not authenticated (after all hooks)
  if (!authLoading && !isAuthenticated) {
    return null;
  }

  // If user is not available after auth loaded, show error
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.headerDivider} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#ef4444', marginBottom: 16 }}>
            Unable to load user data
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#2563eb',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600' }}>
              Go to Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {otherUser?.firstName[0] || 'U'}
              {otherUser?.lastName[0] || ''}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.headerDivider} />
      
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        extraData={messages.map(m => `${m.id}-${m.status}`).join(',')} // Force re-render on status changes
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start the conversation by sending a message
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={!sending}
          onSubmitEditing={Platform.OS !== 'web' ? handleSend : undefined}
          onKeyPress={handleKeyPress}
          blurOnSubmit={false}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    zIndex: 10,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    width: '100%',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    width: '100%',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  messageBubbleWrapper: {
    maxWidth: '75%',
    alignItems: 'flex-end',
  },
  otherMessageBubbleWrapper: {
    maxWidth: '75%',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#64748b',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    paddingRight: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.5,
  },
});

