import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { bookingService, BookingDetail } from '../../services/booking';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { onBookingUpdate } = useSocket();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  // Listen for real-time booking updates
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onBookingUpdate((data) => {
      // Only update if this is the booking we're viewing
      if (data.bookingId === id) {
        logger.debug('Booking updated via Socket.io in detail screen', {
          bookingId: data.bookingId,
          status: data.status,
        });

        // Update the booking with new status
        if (booking) {
          setBooking({
            ...booking,
            status: data.status as any,
            ...(data.booking && { ...data.booking }),
          });
        } else {
          // If booking not loaded yet, reload it
          loadBooking();
        }
      }
    });

    return unsubscribe;
  }, [id, booking, onBookingUpdate]);

  const loadBooking = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      logger.debug('Loading booking', { bookingId: id });
      const data = await bookingService.getById(id);
      logger.debug('Booking data loaded', { bookingId: id, status: data?.status });
      setBooking(data);
    } catch (error: any) {
      logger.error('Error loading booking', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#10b981';
      case 'PENDING':
        return '#f59e0b';
      case 'COMPLETED':
        return '#2563eb';
      case 'CANCELLED':
      case 'DECLINED':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking Details</Text>
            <View style={styles.backButton} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking Details</Text>
            <View style={styles.backButton} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>Booking not found</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerDivider} />
        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {getStatusLabel(booking.status)}
          </Text>
        </View>

        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <View style={styles.infoCard}>
            <Text style={styles.serviceName}>{booking.service?.name || 'Service'}</Text>
            {booking.service?.description && (
              <Text style={styles.serviceDescription}>{booking.service.description}</Text>
            )}
            <View style={styles.serviceMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#64748b" />
                <Text style={styles.metaText}>{booking.service?.duration || 0} minutes</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color="#64748b" />
                <Text style={styles.metaText}>${booking.price}/session</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Provider/Client Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {user?.userType === 'CLIENT' ? 'Provider' : 'Client'}
            </Text>
            {((user?.userType === 'CLIENT' && booking.providerId) ||
              (user?.userType === 'PROVIDER' && booking.clientId)) && (
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => {
                  const otherUserId =
                    user?.userType === 'CLIENT' ? booking.providerId : booking.clientId;
                  if (otherUserId) {
                    router.push(`/messages/${otherUserId}`);
                  }
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#2563eb" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.infoCard}>
            {user?.userType === 'CLIENT' && booking.provider ? (
              <>
                <Text style={styles.name}>
                  {booking.provider.firstName} {booking.provider.lastName}
                </Text>
                {booking.provider.email && (
                  <Text style={styles.email}>{booking.provider.email}</Text>
                )}
              </>
            ) : booking.client ? (
              <>
                <Text style={styles.name}>
                  {booking.client.firstName} {booking.client.lastName}
                </Text>
                {booking.client.email && <Text style={styles.email}>{booking.client.email}</Text>}
              </>
            ) : (
              <Text style={styles.name}>Unknown</Text>
            )}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.infoCard}>
            <View style={styles.scheduleRow}>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
              <Text style={styles.scheduleText}>{formatDate(booking.scheduledDate)}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={20} color="#2563eb" />
              <Text style={styles.scheduleText}>{booking.scheduledTime}</Text>
            </View>
            {booking.location && (
              <View style={styles.scheduleRow}>
                <Ionicons name="location-outline" size={20} color="#2563eb" />
                <Text style={styles.scheduleText}>
                  {typeof booking.location === 'string'
                    ? booking.location
                    : booking.location.address || 'Location TBD'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {booking.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.infoCard}>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </View>
        )}

        {/* Payment Info */}
        {booking.payment &&
          (() => {
            // Calculate provider amount: use providerAmount if available, otherwise calculate from total - platform fee
            const providerAmount = booking.payment.providerAmount
              ? booking.payment.providerAmount
              : booking.payment.amount -
                (booking.payment.platformFee || booking.payment.amount * 0.075);

            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment</Text>
                <View style={styles.infoCard}>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.paymentStatus,
                        { color: booking.payment.status === 'completed' ? '#10b981' : '#f59e0b' },
                      ]}
                    >
                      {booking.payment.status === 'completed' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Amount:</Text>
                    <Text style={styles.paymentAmount}>${providerAmount.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

        {/* Booking ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Booking ID</Text>
            <Text style={styles.infoValue}>{booking.id}</Text>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>
              {booking.createdAt ? formatDate(booking.createdAt) : 'N/A'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
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
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ecfeff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#64748b',
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  scheduleText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontFamily: 'monospace',
  },
});
