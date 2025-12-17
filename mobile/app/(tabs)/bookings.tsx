import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookingCard, BookingCardData } from '../../components/BookingCard';
import { bookingService, BookingDetail } from '../../services/booking';
import { reviewService } from '../../services/review';
import { paymentService } from '../../services/payment';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { theme } from '../../theme';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { mockBookings } from '../../data/mockBookings';

export default function BookingsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { onBookingUpdate } = useSocket();
  const modal = useModal();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'past'>('pending');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef<'pending' | 'upcoming' | 'past'>('pending');

  // Animate tab switch
  const handleTabChange = (tab: 'pending' | 'upcoming' | 'past') => {
    setActiveTab(tab);
  };

  // Animate when activeTab changes
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      prevTabRef.current = activeTab;
    }
  }, [activeTab, fadeAnim]);

  // Check for initial tab from route params
  useEffect(() => {
    if (params.tab && ['pending', 'upcoming', 'past'].includes(params.tab)) {
      const tab = params.tab as 'pending' | 'upcoming' | 'past';
      if (tab !== activeTab) {
        setActiveTab(tab);
      }
    }
  }, [params.tab]);

  const loadBookings = useCallback(async () => {
    try {
      logger.debug('Loading bookings for user', { userId: user?.id, userType: user?.userType });
      const role = user?.userType === 'PROVIDER' ? 'provider' : 'client';
      const data = await bookingService.getMyBookings(undefined, role);
      logger.debug('Bookings loaded', { count: data.length, role });
      setBookings(data);
    } catch (error: any) {
      logger.error('Error loading bookings', error);
      // Fallback to mock data if API fails
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        setBookings(mockBookings as any);
      } else {
        modal.showAlert({
          title: 'Error',
          message: error.response?.data?.error?.message || 'Failed to load bookings',
          type: 'error',
        });
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  useEffect(() => {
    // Only load bookings when user is available and auth is not loading
    if (user && !authLoading) {
      logger.debug('User available, loading bookings...');
      loadBookings();
    } else if (!authLoading && !user) {
      // User is not authenticated, clear bookings
      logger.debug('User not authenticated, clearing bookings');
      setBookings([]);
      setIsLoading(false);
    }
  }, [user, authLoading, loadBookings]);

  // Check which bookings have reviews
  const checkReviews = useCallback(async () => {
    if (bookings.length === 0 || user?.userType !== 'CLIENT') {
      return;
    }

    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
    const reviewed = new Set<string>();

    for (const booking of completedBookings) {
      try {
        const review = await reviewService.getReviewByBooking(booking.id);
        if (review.data) {
          reviewed.add(booking.id);
        }
      } catch (error) {
        // Review doesn't exist, that's fine
      }
    }

    setReviewedBookings(reviewed);
  }, [bookings, user]);

  useEffect(() => {
    checkReviews();
  }, [checkReviews]);

  // Refresh review status when screen comes into focus (e.g., after submitting a review)
  useFocusEffect(
    useCallback(() => {
      if (bookings.length > 0 && user?.userType === 'CLIENT') {
        checkReviews();
      }
    }, [bookings, user, checkReviews])
  );

  // Listen for real-time booking updates
  useEffect(() => {
    const unsubscribe = onBookingUpdate((data) => {
      logger.debug('Booking updated via Socket.io', {
        bookingId: data.bookingId,
        status: data.status,
      });
      // Refresh bookings when a booking status changes
      if (user && !authLoading) {
        loadBookings();
      }
    });

    return unsubscribe;
  }, [onBookingUpdate, user, authLoading, loadBookings]);

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING');
  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const pastBookings = bookings.filter((b) => {
    const status: string = b.status;
    return status === 'COMPLETED' || status === 'CANCELLED' || status === 'DECLINED';
  });

  const handleBookingPress = (bookingId: string) => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: bookingId },
    });
  };

  const handleAccept = async (bookingId: string) => {
    try {
      await bookingService.accept(bookingId);
      modal.showAlert({
        title: 'Success',
        message: 'Booking accepted!',
        type: 'success',
      });
      loadBookings();
    } catch (error: any) {
      modal.showAlert({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to accept booking',
        type: 'error',
      });
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      logger.info('Declining booking', { bookingId });
      const result = await bookingService.decline(bookingId);
      logger.info('Booking declined successfully', { bookingId, status: result?.status });
      modal.showAlert({
        title: 'Success',
        message: 'Booking declined',
        type: 'success',
      });
      // Force reload bookings
      await loadBookings();
    } catch (error: any) {
      logger.error('Error declining booking', error);
      const errorMessage = getUserFriendlyError(error);
      modal.showAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const handleComplete = async (bookingId: string) => {
    modal.showConfirm({
      title: 'Mark as Completed',
      message:
        'Are you sure you want to mark this booking as completed? The client will be able to leave a review.',
      type: 'info',
      confirmText: 'Complete',
      onConfirm: async () => {
        await completeBookingAction(bookingId);
      },
    });
  };

  const completeBookingAction = async (bookingId: string) => {
    try {
      await bookingService.complete(bookingId);
      modal.showAlert({
        title: 'Success',
        message: 'Booking marked as completed!',
        type: 'success',
      });
      await loadBookings();
    } catch (error: any) {
      logger.error('Error completing booking', error);
      const errorMessage = getUserFriendlyError(error);
      modal.showAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const handleReview = (booking: BookingDetail) => {
    const providerName = booking.provider
      ? `${booking.provider.firstName} ${booking.provider.lastName}`
      : 'Provider';
    router.push({
      pathname: '/review/submit',
      params: {
        bookingId: booking.id,
        providerId: booking.providerId,
        providerName,
      },
    });
  };

  const handlePayment = (bookingId: string) => {
    router.push({
      pathname: '/payment/checkout',
      params: { bookingId },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
          <View style={styles.tabContainer}>
            <View style={[styles.tab, styles.tabActive]}>
              <Text style={styles.tabActiveText}>Upcoming</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>Completed</Text>
            </View>
          </View>
        </View>
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={160} color="#93C5FD" />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              {user?.userType === 'PROVIDER'
                ? 'When clients request sessions, they will appear here'
                : 'When you book a session with a provider, it will appear here'}
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
        </Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => handleTabChange('pending')}
            activeOpacity={0.8}
          >
            <Text style={activeTab === 'pending' ? styles.tabActiveText : styles.tabText}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => handleTabChange('upcoming')}
            activeOpacity={0.8}
          >
            <Text style={activeTab === 'upcoming' ? styles.tabActiveText : styles.tabText}>
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => handleTabChange('past')}
            activeOpacity={0.8}
          >
            <Text style={activeTab === 'past' ? styles.tabActiveText : styles.tabText}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {activeTab === 'pending' ? (
            <View style={styles.section}>
              {pendingBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={160} color="#93C5FD" />
                  <Text style={styles.emptyTitle}>No pending bookings</Text>
                  <Text style={styles.emptyText}>
                    {user?.userType === 'PROVIDER'
                      ? 'When clients request sessions, they will appear here'
                      : 'When you request a session, it will appear here'}
                  </Text>
                </View>
              ) : (
                pendingBookings.map((booking) => {
                  const bookingCardData: BookingCardData = {
                    id: booking.id,
                    providerId: booking.providerId,
                    providerName: booking.provider
                      ? `${booking.provider.firstName} ${booking.provider.lastName}`
                      : 'Unknown Provider',
                    providerPhoto: booking.provider?.profilePhoto || undefined,
                    serviceName: booking.service?.name || 'Service',
                    status: booking.status,
                    scheduledDate: booking.scheduledDate,
                    scheduledTime: booking.scheduledTime,
                    price: booking.price,
                    location: booking.location
                      ? typeof booking.location === 'string'
                        ? booking.location
                        : booking.location.address
                      : undefined,
                    notes: booking.notes || undefined,
                  };

                  return (
                    <View key={booking.id}>
                      <BookingCard
                        booking={bookingCardData}
                        onPress={() => handleBookingPress(booking.id)}
                      />
                      {user?.userType === 'PROVIDER' && booking.status === 'PENDING' && (
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.acceptButton]}
                            onPress={() => handleAccept(booking.id)}
                          >
                            <Text style={styles.acceptButtonText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.declineButton]}
                            onPress={() => handleDecline(booking.id)}
                          >
                            <Text style={styles.declineButtonText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          ) : activeTab === 'upcoming' ? (
            <View style={styles.section}>
              {upcomingBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={160} color="#93C5FD" />
                  <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                  <Text style={styles.emptyText}>
                    When you schedule a session, it will appear here.
                  </Text>
                </View>
              ) : (
                upcomingBookings.map((booking) => {
                  const bookingCardData: BookingCardData = {
                    id: booking.id,
                    providerId: booking.providerId,
                    providerName: booking.provider
                      ? `${booking.provider.firstName} ${booking.provider.lastName}`
                      : 'Unknown Provider',
                    providerPhoto: booking.provider?.profilePhoto || undefined,
                    serviceName: booking.service?.name || 'Service',
                    status: booking.status,
                    scheduledDate: booking.scheduledDate,
                    scheduledTime: booking.scheduledTime,
                    price: booking.price,
                    location: booking.location
                      ? typeof booking.location === 'string'
                        ? booking.location
                        : booking.location.address
                      : undefined,
                    notes: booking.notes || undefined,
                  };

                  const showCompleteButton =
                    user?.userType === 'PROVIDER' && booking.status === 'CONFIRMED';

                  // Determine action button for client confirmed bookings
                  const actionButton =
                    user?.userType === 'CLIENT' && booking.status === 'CONFIRMED' ? (
                      booking.payment?.status === 'completed' ? (
                        <View style={styles.paidButton}>
                          <Ionicons name="checkmark-circle" size={18} color="#64748b" />
                          <Text style={styles.paidButtonText}>Paid</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.paymentButton}
                          onPress={() => handlePayment(booking.id)}
                        >
                          <Ionicons name="card-outline" size={18} color="#ffffff" />
                          <Text style={styles.paymentButtonText}>Pay Now</Text>
                        </TouchableOpacity>
                      )
                    ) : undefined;

                  return (
                    <View key={booking.id}>
                      <BookingCard
                        booking={bookingCardData}
                        onPress={() => handleBookingPress(booking.id)}
                        actionButton={actionButton}
                      />
                      {showCompleteButton && (
                        <TouchableOpacity
                          style={styles.completeButton}
                          onPress={() => handleComplete(booking.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                          <Text style={styles.completeButtonText}>Mark as Completed</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <View style={styles.section}>
              {pastBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={160} color="#93C5FD" />
                  <Text style={styles.emptyTitle}>No completed bookings yet</Text>
                  <Text style={styles.emptyText}>
                    Completed and cancelled sessions will appear here.
                  </Text>
                </View>
              ) : (
                pastBookings.map((booking) => {
                  const bookingCardData: BookingCardData = {
                    id: booking.id,
                    providerId: booking.providerId,
                    providerName: booking.provider
                      ? `${booking.provider.firstName} ${booking.provider.lastName}`
                      : 'Unknown Provider',
                    providerPhoto: booking.provider?.profilePhoto || undefined,
                    serviceName: booking.service?.name || 'Service',
                    status: booking.status,
                    scheduledDate: booking.scheduledDate,
                    scheduledTime: booking.scheduledTime,
                    price: booking.price,
                    location: booking.location
                      ? typeof booking.location === 'string'
                        ? booking.location
                        : booking.location.address
                      : undefined,
                    notes: booking.notes || undefined,
                  };

                  const hasReview = reviewedBookings.has(booking.id);
                  const canReview =
                    booking.status === 'COMPLETED' && user?.userType === 'CLIENT' && !hasReview;

                  // Determine action button for past bookings
                  const actionButton = canReview ? (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => handleReview(booking)}
                    >
                      <Ionicons name="star-outline" size={18} color="#2563eb" />
                      <Text style={styles.reviewButtonText}>Write a Review</Text>
                    </TouchableOpacity>
                  ) : hasReview ? (
                    <View style={styles.reviewedButton}>
                      <Ionicons name="checkmark-circle" size={18} color="#64748b" />
                      <Text style={styles.reviewedButtonText}>Reviewed</Text>
                    </View>
                  ) : undefined;

                  return (
                    <View key={booking.id}>
                      <BookingCard
                        booking={bookingCardData}
                        onPress={() => handleBookingPress(booking.id)}
                        actionButton={actionButton}
                      />
                    </View>
                  );
                })
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      {modal.alertOptions && (
        <AlertModal
          visible={modal.alertVisible}
          onClose={modal.hideAlert}
          title={modal.alertOptions.title}
          message={modal.alertOptions.message}
          type={modal.alertOptions.type}
          buttonText={modal.alertOptions.buttonText}
          onButtonPress={modal.alertOptions.onButtonPress}
        />
      )}
      {modal.confirmOptions && (
        <ConfirmModal
          visible={modal.confirmVisible}
          onClose={modal.hideConfirm}
          title={modal.confirmOptions.title}
          message={modal.confirmOptions.message}
          type={modal.confirmOptions.type}
          confirmText={modal.confirmOptions.confirmText}
          cancelText={modal.confirmOptions.cancelText}
          onConfirm={modal.confirmOptions.onConfirm}
          onCancel={modal.confirmOptions.onCancel}
        />
      )}
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
  title: {
    ...theme.typography.display,
    color: theme.colors.neutral[900],
  },
  tabContainer: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radii.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tabActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.card,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[500],
  },
  tabActiveText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.lg,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.semantic.success,
  },
  declineButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[50],
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
  reviewedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#cbd5e1',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
  },
  reviewedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary[500],
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  paidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#cbd5e1',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
  },
  paidButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.semantic.success,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
