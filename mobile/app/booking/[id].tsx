import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { bookingService, BookingDetail } from '../../services/booking';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { formatTime12Hour } from '../../utils/timeUtils';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { AlertModal } from '../../components/ui/AlertModal';
import { useTheme } from '../../contexts/ThemeContext';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const themeHook = useTheme();
  const { onBookingUpdate } = useSocket();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

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
      setAlertModal({
        visible: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
      });
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
        return themeHook.colors.success;
      case 'PENDING':
        return themeHook.colors.warning;
      case 'COMPLETED':
        return themeHook.colors.primary;
      case 'CANCELLED':
      case 'DECLINED':
        return themeHook.colors.error;
      default:
        return themeHook.colors.textTertiary;
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
              <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Booking Details</Text>
            <View style={styles.backButton} />
          </View>
          <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeHook.colors.primary} />
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
            <Text style={[styles.errorText, { color: themeHook.colors.textSecondary }]}>Booking not found</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {getStatusLabel(booking.status)}
          </Text>
        </View>

        {/* Service Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Service</Text>
          <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
            <Text style={[styles.serviceName, { color: themeHook.colors.text }]}>{booking.service?.name || 'Service'}</Text>
            {booking.service?.description && (
              <Text style={[styles.serviceDescription, { color: themeHook.colors.textSecondary }]}>{booking.service.description}</Text>
            )}
            <View style={styles.serviceMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={themeHook.colors.textTertiary} />
                <Text style={[styles.metaText, { color: themeHook.colors.textSecondary }]}>{booking.service?.duration || 0} minutes</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color={themeHook.colors.textTertiary} />
                <Text style={[styles.metaText, { color: themeHook.colors.textSecondary }]}>${booking.price}/session</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Provider/Client Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>
              {user?.userType === 'CLIENT' ? 'Provider' : 'Client'}
            </Text>
            {/* Only providers can message from booking detail - clients must use provider detail */}
            {user?.userType === 'PROVIDER' && booking.clientId && (
              <TouchableOpacity
                style={[styles.messageButton, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}
                onPress={() => {
                  if (booking.clientId) {
                    router.push(`/messages/${booking.clientId}`);
                  }
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={themeHook.colors.primary} />
                <Text style={[styles.messageButtonText, { color: themeHook.colors.primary }]}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
            {user?.userType === 'CLIENT' && booking.provider ? (
              <>
                <Text style={[styles.name, { color: themeHook.colors.text }]}>
                  {booking.provider.firstName} {booking.provider.lastName}
                </Text>
                {booking.provider.email && (
                  <Text style={[styles.email, { color: themeHook.colors.textSecondary }]}>{booking.provider.email}</Text>
                )}
              </>
            ) : booking.client ? (
              <>
                <Text style={[styles.name, { color: themeHook.colors.text }]}>
                  {booking.client.firstName} {booking.client.lastName}
                </Text>
                {booking.client.email && <Text style={[styles.email, { color: themeHook.colors.textSecondary }]}>{booking.client.email}</Text>}
              </>
            ) : (
              <Text style={[styles.name, { color: themeHook.colors.text }]}>Unknown</Text>
            )}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Schedule</Text>
          <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
            <View style={styles.scheduleRow}>
              <Ionicons name="calendar-outline" size={20} color={themeHook.colors.primary} />
              <Text style={[styles.scheduleText, { color: themeHook.colors.text }]}>{formatDate(booking.scheduledDate)}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={20} color={themeHook.colors.primary} />
              <Text style={[styles.scheduleText, { color: themeHook.colors.text }]}>{formatTime12Hour(booking.scheduledTime)}</Text>
            </View>
            {booking.location && (
              <View style={styles.scheduleRow}>
                <Ionicons name="location-outline" size={20} color={themeHook.colors.primary} />
                <Text style={[styles.scheduleText, { color: themeHook.colors.text }]}>
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
            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Notes</Text>
            <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
              <Text style={[styles.notesText, { color: themeHook.colors.text }]}>{booking.notes}</Text>
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
                <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Payment</Text>
                <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { color: themeHook.colors.textSecondary }]}>Status:</Text>
                    <Text
                      style={[
                        styles.paymentStatus,
                        { color: booking.payment.status === 'completed' ? themeHook.colors.success : themeHook.colors.warning },
                      ]}
                    >
                      {booking.payment.status === 'completed' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Text style={[styles.paymentLabel, { color: themeHook.colors.textSecondary }]}>Amount:</Text>
                    <Text style={[styles.paymentAmount, { color: themeHook.colors.text }]}>${providerAmount.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

        {/* Booking ID */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Booking Information</Text>
          <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
            <Text style={[styles.infoLabel, { color: themeHook.colors.textSecondary }]}>Booking ID</Text>
            <Text style={[styles.infoValue, { color: themeHook.colors.text }]}>{booking.id}</Text>
            <Text style={[styles.infoLabel, { color: themeHook.colors.textSecondary }]}>Created</Text>
            <Text style={[styles.infoValue, { color: themeHook.colors.text }]}>
              {booking.createdAt ? formatDate(booking.createdAt) : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Action Buttons - Reschedule (Client only, for PENDING/CONFIRMED bookings) */}
        {user?.userType === 'CLIENT' &&
          (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.rescheduleButton, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}
                onPress={() => router.push({ pathname: '/booking/reschedule', params: { id } })}
              >
                <Ionicons name="calendar-outline" size={20} color={themeHook.colors.primary} />
                <Text style={[styles.rescheduleButtonText, { color: themeHook.colors.primary }]}>Reschedule Booking</Text>
              </TouchableOpacity>
            </View>
          )}
      </ScrollView>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        onClose={() => setAlertModal({ ...alertModal, visible: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    gap: 10,
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
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
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  scheduleText: {
    fontSize: 16,
    flex: 1,
  },
  notesText: {
    fontSize: 14,
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
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
});
