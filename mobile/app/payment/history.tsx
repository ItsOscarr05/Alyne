import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/payment';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useAuth } from '../../hooks/useAuth';

interface PaymentWithBooking {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  stripePaymentId?: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  paidAt?: string;
  createdAt: string;
  booking: {
    id: string;
    service: {
      name: string;
    };
    client: {
      firstName: string;
      lastName: string;
    };
    provider: {
      firstName: string;
      lastName: string;
    };
    scheduledDate: string;
    scheduledTime: string;
    status: string;
  };
}

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Only load payments if auth has finished loading
    // Don't redirect immediately - let the API call handle 401 errors
    if (!authLoading) {
      loadPayments();
    }
  }, [authLoading]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const payments = await paymentService.getPaymentHistory();
      logger.debug('Payment history loaded', { count: payments?.length || 0 });
      setPayments(Array.isArray(payments) ? payments : []);
    } catch (error: any) {
      logger.error('Error loading payment history', error);
      
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        logger.warn('Unauthorized - redirecting to login');
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'refunded':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  const renderPaymentItem = ({ item }: { item: PaymentWithBooking }) => {
    const isClient = user?.userType === 'CLIENT';
    const otherParty = isClient ? item.booking.provider : item.booking.client;
    const otherPartyName = `${otherParty.firstName} ${otherParty.lastName}`;

    return (
      <TouchableOpacity
        style={styles.paymentCard}
        onPress={() => router.push(`/payment/receipt?bookingId=${item.bookingId}`)}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.paymentInfo}>
            <Text style={styles.serviceName}>{item.booking.service.name}</Text>
            <Text style={styles.partyName}>
              {isClient ? 'Provider: ' : 'Client: '}
              {otherPartyName}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {formatDate(item.booking.scheduledDate)} at {formatTime(item.booking.scheduledTime)}
            </Text>
          </View>
          {item.paidAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Paid</Text>
              <Text style={styles.detailValue}>{formatDate(item.paidAt)}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.receiptLink}>View Receipt →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Show loading while checking auth or loading payments
  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment History</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {payments.length === 0 ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment History</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No payments yet</Text>
            <Text style={styles.emptySubtext}>
              Your payment history will appear here once you make a payment.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment History</Text>
                <View style={{ width: 24 }} />
              </View>
              <View style={styles.headerDivider} />
            </>
          }
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    paddingHorizontal: 24,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  partyName: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  paymentDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  receiptLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    textAlign: 'right',
  },
});

