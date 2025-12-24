import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/payment';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useAuth } from '../../hooks/useAuth';
import { ReceiptModal } from '../../components/ReceiptModal';

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

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type FilterOption = 'all' | 'completed' | 'pending' | 'failed' | 'refunded';

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedReceiptBookingId, setSelectedReceiptBookingId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Animation values for dropdowns
  const filterMenuAnimation = useRef(new Animated.Value(0)).current;
  const sortMenuAnimation = useRef(new Animated.Value(0)).current;
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

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
      const paymentsArray = Array.isArray(payments) ? payments : [];
      setAllPayments(paymentsArray);
      applyFiltersAndSort(paymentsArray, filterOption, sortOption);
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

  const applyFiltersAndSort = (
    paymentsToFilter: PaymentWithBooking[],
    filter: FilterOption,
    sort: SortOption
  ) => {
    // Apply filter
    let filtered = paymentsToFilter;
    if (filter !== 'all') {
      filtered = paymentsToFilter.filter((p) => p.status === filter);
    }

    // Apply sort
    let sorted = [...filtered];
    switch (sort) {
      case 'date-desc':
        sorted.sort((a, b) => {
          const dateA = new Date(a.paidAt || a.createdAt).getTime();
          const dateB = new Date(b.paidAt || b.createdAt).getTime();
          return dateB - dateA;
        });
        break;
      case 'date-asc':
        sorted.sort((a, b) => {
          const dateA = new Date(a.paidAt || a.createdAt).getTime();
          const dateB = new Date(b.paidAt || b.createdAt).getTime();
          return dateA - dateB;
        });
        break;
      case 'amount-desc':
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case 'amount-asc':
        sorted.sort((a, b) => a.amount - b.amount);
        break;
    }

    setPayments(sorted);
  };

  useEffect(() => {
    if (allPayments.length > 0) {
      applyFiltersAndSort(allPayments, filterOption, sortOption);
    }
  }, [filterOption, sortOption]);

  // Animate filter menu
  useEffect(() => {
    if (showFilterMenu) {
      setFilterMenuVisible(true);
    }
    Animated.timing(filterMenuAnimation, {
      toValue: showFilterMenu ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start(() => {
      if (!showFilterMenu) {
        setFilterMenuVisible(false);
      }
    });
  }, [showFilterMenu, filterMenuAnimation]);

  // Animate sort menu
  useEffect(() => {
    if (showSortMenu) {
      setSortMenuVisible(true);
    }
    Animated.timing(sortMenuAnimation, {
      toValue: showSortMenu ? 1 : 0,
      duration: 400,
      useNativeDriver: false,
    }).start(() => {
      if (!showSortMenu) {
        setSortMenuVisible(false);
      }
    });
  }, [showSortMenu, sortMenuAnimation]);

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
    const { formatTime12Hour } = require('../../utils/timeUtils');
    return formatTime12Hour(timeString);
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
        onPress={() => {
          setSelectedReceiptBookingId(item.bookingId);
          setShowReceiptModal(true);
        }}
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
      {allPayments.length === 0 ? (
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
              
              {/* Filter and Sort Controls */}
              <View style={styles.controlsContainer}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => {
                    setShowSortMenu(false); // Close sort menu if open
                    setShowFilterMenu(!showFilterMenu);
                  }}
                >
                  <Ionicons name="filter-outline" size={18} color="#2563eb" />
                  <Text style={styles.controlButtonText}>
                    {filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#2563eb" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => {
                    setShowFilterMenu(false); // Close filter menu if open
                    setShowSortMenu(!showSortMenu);
                  }}
                >
                  <Ionicons name="swap-vertical-outline" size={18} color="#2563eb" />
                  <Text style={styles.controlButtonText}>
                    {sortOption === 'date-desc' ? 'Newest' : 
                     sortOption === 'date-asc' ? 'Oldest' :
                     sortOption === 'amount-desc' ? 'Amount: High' : 'Amount: Low'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#2563eb" />
                </TouchableOpacity>
              </View>

              {/* Filter Dropdown */}
              {filterMenuVisible && (
                <Animated.View
                  style={[
                    styles.dropdownMenu,
                    {
                      opacity: filterMenuAnimation,
                      maxHeight: filterMenuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 300],
                      }),
                      transform: [
                        {
                          translateY: filterMenuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents={showFilterMenu ? 'auto' : 'none'}
                >
                  {(['all', 'completed', 'pending', 'failed', 'refunded'] as FilterOption[]).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        filterOption === option && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setFilterOption(option);
                        setShowFilterMenu(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          filterOption === option && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option === 'all' ? 'All Payments' : option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                      {filterOption === option && (
                        <Ionicons name="checkmark" size={18} color="#2563eb" />
                      )}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}

              {/* Sort Dropdown */}
              {sortMenuVisible && (
                <Animated.View
                  style={[
                    styles.dropdownMenu,
                    {
                      opacity: sortMenuAnimation,
                      maxHeight: sortMenuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 300],
                      }),
                      transform: [
                        {
                          translateY: sortMenuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                  pointerEvents={showSortMenu ? 'auto' : 'none'}
                >
                  {([
                    { value: 'date-desc' as SortOption, label: 'Newest First' },
                    { value: 'date-asc' as SortOption, label: 'Oldest First' },
                    { value: 'amount-desc' as SortOption, label: 'Amount: High to Low' },
                    { value: 'amount-asc' as SortOption, label: 'Amount: Low to High' },
                  ]).map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        sortOption === option.value && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSortOption(option.value);
                        setShowSortMenu(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          sortOption === option.value && styles.dropdownItemTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {sortOption === option.value && (
                        <Ionicons name="checkmark" size={18} color="#2563eb" />
                      )}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              )}
            </>
          }
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            payments.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            payments.length === 0 && allPayments.length > 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="filter-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyText}>No payments match your filter</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filter to see more payments.
                </Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        bookingId={selectedReceiptBookingId}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReceiptBookingId(null);
        }}
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
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 400,
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
  controlsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1e293b',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#2563eb',
  },
});

