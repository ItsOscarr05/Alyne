import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { bookingService, BookingDetail } from '../../services/booking';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useAuth } from '../../hooks/useAuth';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
                <Text style={styles.metaText}>${booking.price}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Provider/Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {user?.userType === 'CLIENT' ? 'Provider' : 'Client'}
          </Text>
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
        {booking.payment && (
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
                <Text style={styles.paymentAmount}>${booking.payment.amount}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Booking ID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Booking ID</Text>
            <Text style={styles.infoValue}>{booking.id}</Text>
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.infoValue}>{formatDate(booking.createdAt)}</Text>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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

