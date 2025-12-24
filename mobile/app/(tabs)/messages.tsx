import { View, Text, StyleSheet, FlatList, RefreshControl, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConversationItem } from '../../components/ConversationItem';
import { SearchBar } from '../../components/SearchBar';
import { messageService, Conversation } from '../../services/message';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { useCallback } from 'react';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { theme } from '../../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { onMessage } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    // Animate layout changes when filtering
    LayoutAnimation.configureNext({
      duration: 400,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleY,
        springDamping: 0.7,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 0.7,
      },
    });

    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase().trim();
    return conversations.filter((conv) => {
      const firstName = conv.otherUser?.firstName?.toLowerCase() || '';
      const lastName = conv.otherUser?.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      return fullName.includes(query) || firstName.includes(query) || lastName.includes(query);
    });
  }, [conversations, searchQuery]);

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <FlatList
          data={[]}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
              </View>
              <View style={styles.headerDivider} />
              <View style={styles.searchContainer}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search conversations..."
                />
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={160} color="#3B82F6" />
              <Text style={styles.emptyTitle}>Loading conversations...</Text>
              <Text style={styles.emptyText}>
                We&apos;re fetching your recent chats with providers.
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.container}>
        <FlatList
          data={[]}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Messages</Text>
              </View>
              <View style={styles.headerDivider} />
              <View style={styles.searchContainer}>
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search conversations..."
                />
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={160} color="#3B82F6" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyText}>
                Start a conversation with a provider to discuss bookings and services
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => handleConversationPress(item.id)}
          />
        )}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Messages</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search conversations..."
              />
            </View>
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={80} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No conversations found</Text>
              <Text style={styles.emptyText}>
                No conversations match &quot;{searchQuery}&quot;
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  title: {
    ...theme.typography.display,
    fontSize: 28,
    color: theme.colors.neutral[900],
  },
  listContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.xl,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
});

