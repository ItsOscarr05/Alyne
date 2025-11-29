import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { ConversationItem } from '../../components/ConversationItem';
import { messageService, Conversation } from '../../services/message';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { useCallback } from 'react';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { onMessage } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    if (!user) {
      logger.debug('No user, skipping conversation load');
      setConversations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await messageService.getConversations();
      const conversations = response.data || [];
      
      // CRITICAL: Filter conversations to ensure they belong to the current user
      // This prevents conversations from other users from appearing
      const validConversations = conversations.filter((conv) => {
        // Each conversation should have messages between current user and otherUser
        // The backend should already filter this, but we double-check here
        const isValid = conv.otherUser && conv.otherUser.id !== user.id;
        if (!isValid) {
          logger.debug('Filtering out invalid conversation', { conversationId: conv.id, userId: user.id });
        }
        return isValid;
      });
      
      // Deduplicate conversations by ID to prevent duplicate keys
      const uniqueConversations = validConversations.filter((conv, index, self) =>
        index === self.findIndex((c) => c.id === conv.id)
      );
      
      logger.debug('Loaded conversations', { count: uniqueConversations.length, userId: user.id });
      setConversations(uniqueConversations);
    } catch (error: any) {
      logger.error('Error loading conversations', error);
      // On error, clear conversations to prevent stale data
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }

    // Listen for new messages to refresh conversations
    // IMPORTANT: Only refresh if message is for current user
    const unsubscribe = onMessage((message) => {
      // Only refresh if the message involves the current user
      if (user && (message.senderId === user.id || message.receiverId === user.id)) {
        logger.debug('Refreshing conversations after message', { userId: user.id });
        loadConversations();
      } else {
        logger.debug('Ignoring message refresh - not for current user', { currentUserId: user?.id });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Refresh conversations when screen comes into focus (e.g., when navigating back from chat)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadConversations();
      }
    }, [user])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (otherUserId: string) => {
    router.push(`/messages/${otherUserId}`);
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation with a provider to discuss bookings and services
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => handleConversationPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  listContent: {
    backgroundColor: '#ffffff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

