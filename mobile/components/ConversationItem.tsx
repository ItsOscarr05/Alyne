import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '../services/message';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { theme: themeHook, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animate in when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const userName = `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`;
  const isProvider = conversation.otherUser.userType === 'PROVIDER';
  const isClient = conversation.otherUser.userType === 'CLIENT';

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
      <TouchableOpacity style={[styles.container, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primaryLight }]}>
        {conversation.otherUser.profilePhoto ? (
          <Image
            source={{ uri: conversation.otherUser.profilePhoto }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.avatarText, { color: themeHook.colors.white }]}>
            {getInitials(conversation.otherUser.firstName, conversation.otherUser.lastName)}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: themeHook.colors.text }]} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={[styles.time, { color: themeHook.colors.textSecondary }]}>{formatTime(conversation.lastMessage.createdAt)}</Text>
        </View>

        <View style={styles.messageRow}>
          <Text style={[styles.message, { color: themeHook.colors.textSecondary }]} numberOfLines={1}>
            {conversation.lastMessage.content}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: themeHook.colors.primary }]}>
              <Text style={[styles.unreadText, { color: themeHook.colors.white }]}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {isProvider && (
        <View style={[styles.providerBadge, { backgroundColor: isDark ? themeHook.colors.success + '20' : '#f0fdf4', borderColor: themeHook.colors.success, borderWidth: 1 }]}>
          <Ionicons name="checkmark-circle" size={14} color={themeHook.colors.success} />
          <Text style={[styles.providerBadgeText, { color: themeHook.colors.success }]}>Provider</Text>
        </View>
      )}
      {isClient && (
        <View style={[styles.clientBadge, { backgroundColor: isDark ? themeHook.colors.primaryLight : themeHook.colors.primaryLight, borderColor: themeHook.colors.primary, borderWidth: 1 }]}>
          <Ionicons name="person" size={14} color={themeHook.colors.primary} />
          <Text style={[styles.clientBadgeText, { color: themeHook.colors.primary }]}>Client</Text>
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '600',
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  clientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
  },
  clientBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

