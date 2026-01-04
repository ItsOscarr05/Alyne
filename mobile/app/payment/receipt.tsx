import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/payment';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { formatTime12Hour } from '../../utils/timeUtils';
import { bookingService } from '../../services/booking';
import { AlertModal } from '../../components/ui/AlertModal';
import { useTheme } from '../../contexts/ThemeContext';

export default function ReceiptScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const themeHook = useTheme();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
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
    if (bookingId) {
      loadReceiptData();
    }
  }, [bookingId]);

  const loadReceiptData = async () => {
    try {
      setLoading(true);
      const [bookingData, paymentData] = await Promise.all([
        bookingService.getById(bookingId!),
        paymentService.getByBooking(bookingId!),
      ]);
      setBooking(bookingData);
      setPayment(paymentData);
    } catch (error: any) {
      logger.error('Error loading receipt', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      setAlertModal({
        visible: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return formatTime12Hour(timeString);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Receipt</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeHook.colors.primary} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!booking || !payment) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Receipt</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={themeHook.colors.error} />
            <Text style={[styles.errorText, { color: themeHook.colors.textSecondary }]}>Receipt not found</Text>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: themeHook.colors.primary }]}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Payment Receipt</Text>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/bookings')}>
            <Ionicons name="close" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        {/* Receipt Header */}
        <View style={styles.receiptHeader}>
          <View style={[styles.logoContainer, { backgroundColor: themeHook.colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={48} color={themeHook.colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: themeHook.colors.text }]}>Payment Successful</Text>
          <Text style={[styles.receiptNumber, { color: themeHook.colors.textSecondary }]}>
            Receipt #{payment.id ? payment.id.slice(-8).toUpperCase() : 'N/A'}
          </Text>
        </View>

        {/* Payment Details */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Payment Details</Text>
          
          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Amount Paid</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>
              ${payment.amount ? payment.amount.toFixed(2) : '0.00'}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Payment Method</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>Card ending in ••••</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Payment Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: themeHook.colors.success }]}>
              <Text style={styles.statusText}>
                {payment.status ? payment.status.toUpperCase() : 'UNKNOWN'}
              </Text>
            </View>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Date Paid</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>
              {payment.paidAt ? formatDate(payment.paidAt) : 'N/A'}
            </Text>
          </View>

          {payment.stripePaymentId && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Transaction ID</Text>
              <Text style={[styles.detailValue, styles.transactionId, { color: themeHook.colors.text }]}>
                {payment.stripePaymentId ? payment.stripePaymentId.slice(-12) : 'N/A'}
              </Text>
            </View>
          )}
        </View>

        {/* Booking Details */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Booking Details</Text>
          
          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Service</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>{booking.service?.name || 'Service'}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Provider</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>
              {booking.provider
                ? `${booking.provider.firstName} ${booking.provider.lastName}`
                : 'Provider'}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Date</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>
              {formatDate(booking.scheduledDate)}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: themeHook.colors.border }]}>
            <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Time</Text>
            <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>
              {formatTime(booking.scheduledTime)}
            </Text>
          </View>

          {booking.location && typeof booking.location === 'object' && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: themeHook.colors.textSecondary }]}>Location</Text>
              <Text style={[styles.detailValue, { color: themeHook.colors.text }]}>
                {booking.location.address || 'Location details'}
              </Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Service Price</Text>
            <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
              ${payment.providerAmount ? payment.providerAmount.toFixed(2) : booking.price.toFixed(2)}
            </Text>
          </View>
          {payment.platformFee && payment.platformFee > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Platform Fee (Alyne)</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>+${payment.platformFee.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: themeHook.colors.border }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: themeHook.colors.text }]}>Total Paid</Text>
            <Text style={[styles.totalAmount, { color: themeHook.colors.primary }]}>
              ${(() => {
                // Calculate total: service price + platform fee
                const servicePrice = payment.providerAmount || booking.price;
                const platformFee = payment.platformFee || 0;
                return (servicePrice + platformFee).toFixed(2);
              })()}
            </Text>
          </View>
        </View>

        {/* Footer Info */}
        <View style={[styles.footerInfo, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}>
          <Ionicons name="shield-checkmark" size={20} color={themeHook.colors.primary} />
          <Text style={[styles.footerText, { color: themeHook.colors.primary }]}>
            This payment was processed securely by Stripe. Your card details were never stored.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: themeHook.colors.surface, borderTopColor: themeHook.colors.border }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: themeHook.colors.primary }]}
          onPress={() => router.replace('/(tabs)/bookings')}
        >
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerDivider: {
    height: 1,
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  receiptNumber: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  section: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  transactionId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  primaryButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

