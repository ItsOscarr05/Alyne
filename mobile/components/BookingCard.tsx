import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { formatTime12Hour } from '../utils/timeUtils';
import { ANIMATION_DURATIONS } from '../utils/animations';

export interface BookingCardData {
  id: string;
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  serviceName: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';
  scheduledDate: string;
  scheduledTime: string;
  price: number;
  location?: string;
  notes?: string;
}

interface BookingCardProps {
  booking: BookingCardData;
  onPress: () => void;
  actionButton?: React.ReactNode;
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onOptionsPress?: () => void;
  showOptions?: boolean;
  onMessagePress?: () => void;
  showMessageButton?: boolean;
  customBackgroundColor?: string;
}

export function BookingCard({
  booking,
  onPress,
  actionButton,
  onAccept,
  onDecline,
  onComplete,
  onOptionsPress,
  showOptions = false,
  onMessagePress,
  showMessageButton = false,
  customBackgroundColor,
}: BookingCardProps) {
  const themeHook = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: ANIMATION_DURATIONS.FAST,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: ANIMATION_DURATIONS.FAST,
      useNativeDriver: true,
    }).start();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#9333EA';
      case 'PENDING':
        return '#f59e0b';
      case 'COMPLETED':
        return '#16A34A';
      case 'CANCELLED':
        return '#ef4444';
      case 'DECLINED':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'PENDING':
        return 'Pending';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'DECLINED':
        return 'Declined';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (time: string) => {
    return formatTime12Hour(time);
  };

  const formatAddress = (location?: string) => {
    if (!location) return '';

    try {
      // Try to parse as JSON first
      const parsed = typeof location === 'string' ? JSON.parse(location) : location;
      if (parsed.address) {
        // Return the full address
        return parsed.address;
      }
    } catch {
      // If not JSON, treat as string and return as is
      return location;
    }

    return location;
  };

  // Use blue outline for CONFIRMED (upcoming) bookings
  const borderColor = booking.status === 'CONFIRMED' ? themeHook.colors.primary : getStatusColor(booking.status);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: customBackgroundColor || themeHook.colors.surface, borderColor: borderColor, borderWidth: 2 }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
      <View style={styles.header}>
        <View style={styles.providerInfo}>
          <View style={[styles.avatar, { backgroundColor: themeHook.colors.primary }]}>
            {booking.providerPhoto ? (
              <Image
                source={{ uri: booking.providerPhoto }}
                style={styles.avatarImage}
                contentFit="cover"
                onError={() => {
                  // Silently handle image load errors
                }}
              />
            ) : (
              <Text style={[styles.avatarText, { color: themeHook.colors.white }]}>
                {booking.providerName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </Text>
            )}
          </View>
          <View style={styles.providerDetails}>
            <Text style={[styles.providerName, { color: themeHook.colors.text }]}>{booking.providerName}</Text>
            <Text style={[styles.serviceName, { color: themeHook.colors.textSecondary }]}>{booking.serviceName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.headerRightTop}>
            <View
              style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20', borderColor: getStatusColor(booking.status), borderWidth: 2 }]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                {getStatusText(booking.status)}
              </Text>
            </View>
            {showOptions && onOptionsPress && (
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onOptionsPress();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={themeHook.colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.details}>
        {!actionButton && (
          <>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={themeHook.colors.textTertiary} />
              <Text style={[styles.detailText, { color: themeHook.colors.textSecondary }]}>
                {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}
              </Text>
            </View>

            {booking.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={themeHook.colors.textTertiary} />
                <Text style={[styles.detailText, { color: themeHook.colors.textSecondary }]}>{formatAddress(booking.location)}</Text>
              </View>
            )}
          </>
        )}

        {!actionButton && (
          <View style={[styles.detailRow, styles.priceRow]}>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={themeHook.colors.textTertiary} />
              <Text style={[styles.detailText, { color: themeHook.colors.textSecondary }]}>${booking.price}/session</Text>
            </View>
            {(onAccept || onDecline || onComplete || (showMessageButton && onMessagePress)) && (
              <View style={styles.actionButtonsContainer}>
                {onAccept && (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={onAccept}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark" size={20} color="#16A34A" />
                  </TouchableOpacity>
                )}
                {onDecline && (
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={onDecline}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
                {onComplete && (
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={onComplete}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  </TouchableOpacity>
                )}
                {showMessageButton && onMessagePress && (
                  <TouchableOpacity
                    style={[styles.messageButton, { backgroundColor: themeHook.colors.primary + '20', borderColor: themeHook.colors.primary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onMessagePress();
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={themeHook.colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {actionButton && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={themeHook.colors.textTertiary} />
            <Text style={[styles.detailText, { color: themeHook.colors.textSecondary }]}>
              {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledTime)}
            </Text>
          </View>
          {booking.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={themeHook.colors.textTertiary} />
              <Text style={[styles.detailText, { color: themeHook.colors.textSecondary }]}>{formatAddress(booking.location)}</Text>
            </View>
          )}
          <View style={[styles.detailRow, styles.priceRow]}>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={themeHook.colors.textTertiary} />
              <Text style={[styles.detailText, { color: themeHook.colors.textSecondary }]}>${booking.price}/session</Text>
            </View>
            <View style={styles.actionButtonsContainer}>
              {actionButton}
              {onComplete && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={onComplete}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                </TouchableOpacity>
              )}
              {showMessageButton && onMessagePress && (
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onMessagePress();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={18} color="#2563eb" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {booking.notes && (
        <View style={[styles.notesContainer, { borderTopColor: themeHook.colors.border }]}>
          <Text style={[styles.notesLabel, { color: themeHook.colors.textSecondary }]}>Notes:</Text>
          <Text style={[styles.notesText, { color: themeHook.colors.text }]}>{booking.notes}</Text>
        </View>
      )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerRightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionsButton: {
    padding: 4,
    borderRadius: 8,
  },
  providerInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceRow: {
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 14,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRowLeft: {
    flex: 1,
    gap: 8,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF444420',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  messageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
