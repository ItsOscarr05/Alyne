import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Alert,
  Modal as RNModal,
  TouchableWithoutFeedback,
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
import { PaymentCheckoutModal } from '../../components/PaymentCheckoutModal';
import { SubmitReviewModal } from '../../components/SubmitReviewModal';
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
  const [hiddenBookings, setHiddenBookings] = useState<Set<string>>(new Set());
  const [optionsMenuVisible, setOptionsMenuVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'past' | 'declined'>(
    'pending'
  );
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTabRef = useRef<'pending' | 'upcoming' | 'past' | 'declined'>('pending');
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    upcoming: 1,
    past: 1,
    declined: 1,
  });
  const ITEMS_PER_PAGE = 10;

  // Animate tab switch
  const handleTabChange = (tab: 'pending' | 'upcoming' | 'past' | 'declined') => {
    setActiveTab(tab);
    // Reset to page 1 when switching tabs
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 }));
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
    if (params.tab && ['pending', 'upcoming', 'past', 'declined'].includes(params.tab)) {
      const tab = params.tab as 'pending' | 'upcoming' | 'past' | 'declined';
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
        paymentStatus: data.booking?.payment?.status,
      });

      // Update the specific booking in state for instant UI update
      setBookings((prevBookings) => {
        const bookingIndex = prevBookings.findIndex((b) => b.id === data.bookingId);
        
        if (bookingIndex !== -1) {
          // Booking exists, update it
          const updatedBookings = [...prevBookings];
          updatedBookings[bookingIndex] = {
            ...updatedBookings[bookingIndex],
            status: data.status as any,
            ...(data.booking && {
              ...data.booking,
              // Preserve existing payment data if new data doesn't include it
              payment: data.booking.payment || updatedBookings[bookingIndex].payment,
            }),
          };
          return updatedBookings;
        } else {
          // Booking doesn't exist in current list, might be a new booking
          // If we have the full booking data, add it
          if (data.booking) {
            return [data.booking, ...prevBookings];
          }
          // Otherwise, reload to get the updated list
          if (user && !authLoading) {
            loadBookings();
          }
        }
        return prevBookings;
      });
    });

    return unsubscribe;
  }, [onBookingUpdate, user, authLoading, loadBookings]);

  const pendingBookings = bookings.filter(
    (b) => b.status === 'PENDING' && !hiddenBookings.has(b.id)
  );
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && !hiddenBookings.has(b.id)
  );
  const declinedBookings = bookings.filter((b) => {
    const status: string = b.status;
    return status === 'DECLINED' && !hiddenBookings.has(b.id);
  });
  const pastBookings = bookings.filter((b) => {
    const status: string = b.status;
    return (status === 'COMPLETED' || status === 'CANCELLED') && !hiddenBookings.has(b.id);
  });

  // Pagination logic
  const getPaginatedBookings = (
    bookingsList: BookingDetail[],
    tab: 'pending' | 'upcoming' | 'past' | 'declined'
  ) => {
    const page = currentPage[tab];
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return bookingsList.slice(startIndex, endIndex);
  };

  const getTotalPages = (bookingsList: BookingDetail[]) => {
    return Math.ceil(bookingsList.length / ITEMS_PER_PAGE);
  };

  const handlePageChange = (tab: 'pending' | 'upcoming' | 'past' | 'declined', page: number) => {
    setCurrentPage((prev) => ({ ...prev, [tab]: page }));
  };

  const handleBookingPress = (bookingId: string) => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: bookingId },
    });
  };

  const handleMessage = (booking: BookingDetail) => {
    // Determine which user to message
    // If current user is a client, message the provider
    // If current user is a provider, message the client
    const otherUserId = user?.userType === 'CLIENT' ? booking.providerId : booking.clientId;
    
    if (otherUserId) {
      router.push(`/messages/${otherUserId}`);
    }
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

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<{
    bookingId: string;
    providerId: string;
    providerName: string;
  } | null>(null);

  const handleReview = (booking: BookingDetail) => {
    const providerName = booking.provider
      ? `${booking.provider.firstName} ${booking.provider.lastName}`
      : 'Provider';
    setSelectedBookingForReview({
      bookingId: booking.id,
      providerId: booking.providerId,
      providerName,
    });
    setReviewModalVisible(true);
  };

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBookingIdForPayment, setSelectedBookingIdForPayment] = useState<string | null>(
    null
  );

  const handlePayment = (bookingId: string) => {
    setSelectedBookingIdForPayment(bookingId);
    setPaymentModalVisible(true);
  };

  const handleOptionsPress = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setOptionsMenuVisible(true);
  };

  const handleRemoveFromHistory = () => {
    if (!selectedBookingId) return;
    setOptionsMenuVisible(false);
    modal.showConfirm({
      title: 'Remove from History',
      message:
        'Are you sure you want to remove this booking from your history? This action cannot be undone.',
      type: 'warning',
      confirmText: 'Remove',
      onConfirm: () => {
        setHiddenBookings((prev) => new Set(prev).add(selectedBookingId));
        setSelectedBookingId(null);
        modal.showAlert({
          title: 'Removed',
          message: 'Booking has been removed from your history.',
          type: 'success',
        });
      },
      onCancel: () => {
        setSelectedBookingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.content} contentContainerStyle={styles.listContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
            </Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'pending' && styles.tabActive,
                  activeTab === 'pending' && styles.tabActivePending,
                ]}
                onPress={() => handleTabChange('pending')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'pending' ? styles.tabActiveText : styles.tabText}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'upcoming' && styles.tabActive,
                  activeTab === 'upcoming' && styles.tabActiveUpcoming,
                ]}
                onPress={() => handleTabChange('upcoming')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'upcoming' ? styles.tabActiveText : styles.tabText}>
                  Upcoming
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'past' && styles.tabActive,
                  activeTab === 'past' && styles.tabActiveCompleted,
                ]}
                onPress={() => handleTabChange('past')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'past' ? styles.tabActiveText : styles.tabText}>
                  Completed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'declined' && styles.tabActive,
                  activeTab === 'declined' && styles.tabActiveDeclined,
                ]}
                onPress={() => handleTabChange('declined')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'declined' ? styles.tabActiveText : styles.tabText}>
                  Declined
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <Text style={styles.title}>
              {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
            </Text>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'pending' && styles.tabActive,
                  activeTab === 'pending' && styles.tabActivePending,
                ]}
                onPress={() => handleTabChange('pending')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'pending' ? styles.tabActiveText : styles.tabText}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'upcoming' && styles.tabActive,
                  activeTab === 'upcoming' && styles.tabActiveUpcoming,
                ]}
                onPress={() => handleTabChange('upcoming')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'upcoming' ? styles.tabActiveText : styles.tabText}>
                  Upcoming
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'past' && styles.tabActive,
                  activeTab === 'past' && styles.tabActiveCompleted,
                ]}
                onPress={() => handleTabChange('past')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'past' ? styles.tabActiveText : styles.tabText}>
                  Completed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'declined' && styles.tabActive,
                  activeTab === 'declined' && styles.tabActiveDeclined,
                ]}
                onPress={() => handleTabChange('declined')}
                activeOpacity={0.8}
              >
                <Text style={activeTab === 'declined' ? styles.tabActiveText : styles.tabText}>
                  Declined
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            {activeTab === 'pending' ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={160} color="#3B82F6" />
                <Text style={styles.emptyTitle}>No pending bookings</Text>
                <Text style={styles.emptyText}>
                  {user?.userType === 'PROVIDER'
                    ? 'When clients request sessions, they will appear here'
                    : 'When you request a session, it will appear here'}
                </Text>
              </View>
            ) : activeTab === 'upcoming' ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={160} color="#3B82F6" />
                <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                <Text style={styles.emptyText}>
                  When you schedule a session, it will appear here.
                </Text>
              </View>
            ) : activeTab === 'declined' ? (
              <View style={styles.emptyState}>
                <Ionicons name="close-circle-outline" size={160} color="#3B82F6" />
                <Text style={styles.emptyTitle}>No declined bookings</Text>
                <Text style={styles.emptyText}>
                  {user?.userType === 'PROVIDER'
                    ? 'Bookings that you declined will appear here.'
                    : 'Bookings that were declined by the provider will appear here.'}
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={160} color="#3B82F6" />
                <Text style={styles.emptyTitle}>No completed bookings yet</Text>
                <Text style={styles.emptyText}>
                  Completed and cancelled sessions will appear here.
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
          </Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'pending' && styles.tabActive,
                activeTab === 'pending' && styles.tabActivePending,
              ]}
              onPress={() => handleTabChange('pending')}
              activeOpacity={0.8}
            >
              <Text style={activeTab === 'pending' ? styles.tabActiveText : styles.tabText}>
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'upcoming' && styles.tabActive,
                activeTab === 'upcoming' && styles.tabActiveUpcoming,
              ]}
              onPress={() => handleTabChange('upcoming')}
              activeOpacity={0.8}
            >
              <Text style={activeTab === 'upcoming' ? styles.tabActiveText : styles.tabText}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'past' && styles.tabActive,
                activeTab === 'past' && styles.tabActiveCompleted,
              ]}
              onPress={() => handleTabChange('past')}
              activeOpacity={0.8}
            >
              <Text style={activeTab === 'past' ? styles.tabActiveText : styles.tabText}>
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'declined' && styles.tabActive,
                activeTab === 'declined' && styles.tabActiveDeclined,
              ]}
              onPress={() => handleTabChange('declined')}
              activeOpacity={0.8}
            >
              <Text style={activeTab === 'declined' ? styles.tabActiveText : styles.tabText}>
                Declined
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {activeTab === 'pending' ? (
            <View style={styles.section}>
              {pendingBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={160} color="#3B82F6" />
                  <Text style={styles.emptyTitle}>No pending bookings</Text>
                  <Text style={styles.emptyText}>
                    {user?.userType === 'PROVIDER'
                      ? 'When clients request sessions, they will appear here'
                      : 'When you request a session, it will appear here'}
                  </Text>
                </View>
              ) : (
                <>
                  {getPaginatedBookings(pendingBookings, 'pending').map((booking) => {
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
                          onAccept={
                            user?.userType === 'PROVIDER' && booking.status === 'PENDING'
                              ? () => handleAccept(booking.id)
                              : undefined
                          }
                          onDecline={
                            user?.userType === 'PROVIDER' && booking.status === 'PENDING'
                              ? () => handleDecline(booking.id)
                              : undefined
                          }
                          showMessageButton={true}
                          onMessagePress={() => handleMessage(booking)}
                        />
                      </View>
                    );
                  })}
                  {getTotalPages(pendingBookings) > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.pending === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('pending', currentPage.pending - 1)}
                        disabled={currentPage.pending === 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={currentPage.pending === 1 ? '#CBD5E1' : '#2563eb'}
                        />
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.pending === 1 && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.paginationInfo}>
                        Page {currentPage.pending} of {getTotalPages(pendingBookings)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.pending === getTotalPages(pendingBookings) &&
                            styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('pending', currentPage.pending + 1)}
                        disabled={currentPage.pending === getTotalPages(pendingBookings)}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.pending === getTotalPages(pendingBookings) &&
                              styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Next
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            currentPage.pending === getTotalPages(pendingBookings)
                              ? '#CBD5E1'
                              : '#2563eb'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : activeTab === 'upcoming' ? (
            <View style={styles.section}>
              {upcomingBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={160} color="#3B82F6" />
                  <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                  <Text style={styles.emptyText}>
                    When you schedule a session, it will appear here.
                  </Text>
                </View>
              ) : (
                <>
                  {getPaginatedBookings(upcomingBookings, 'upcoming').map((booking) => {
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
                          onComplete={
                            showCompleteButton ? () => handleComplete(booking.id) : undefined
                          }
                          showMessageButton={true}
                          onMessagePress={() => handleMessage(booking)}
                        />
                      </View>
                    );
                  })}
                  {getTotalPages(upcomingBookings) > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.upcoming === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('upcoming', currentPage.upcoming - 1)}
                        disabled={currentPage.upcoming === 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={currentPage.upcoming === 1 ? '#CBD5E1' : '#2563eb'}
                        />
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.upcoming === 1 && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.paginationInfo}>
                        Page {currentPage.upcoming} of {getTotalPages(upcomingBookings)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.upcoming === getTotalPages(upcomingBookings) &&
                            styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('upcoming', currentPage.upcoming + 1)}
                        disabled={currentPage.upcoming === getTotalPages(upcomingBookings)}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.upcoming === getTotalPages(upcomingBookings) &&
                              styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Next
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            currentPage.upcoming === getTotalPages(upcomingBookings)
                              ? '#CBD5E1'
                              : '#2563eb'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : activeTab === 'declined' ? (
            <View style={styles.section}>
              {declinedBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="close-circle-outline" size={160} color="#3B82F6" />
                  <Text style={styles.emptyTitle}>No declined bookings</Text>
                  <Text style={styles.emptyText}>
                    {user?.userType === 'PROVIDER'
                      ? 'Bookings that you declined will appear here.'
                      : 'Bookings that were declined by the provider will appear here.'}
                  </Text>
                </View>
              ) : (
                <>
                  {getPaginatedBookings(declinedBookings, 'declined').map((booking) => {
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
                          showOptions={true}
                          onOptionsPress={() => handleOptionsPress(booking.id)}
                          showMessageButton={true}
                          onMessagePress={() => handleMessage(booking)}
                        />
                      </View>
                    );
                  })}
                  {getTotalPages(declinedBookings) > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.declined === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('declined', currentPage.declined - 1)}
                        disabled={currentPage.declined === 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={currentPage.declined === 1 ? '#CBD5E1' : '#2563eb'}
                        />
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.declined === 1 && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.paginationInfo}>
                        Page {currentPage.declined} of {getTotalPages(declinedBookings)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.declined === getTotalPages(declinedBookings) &&
                            styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('declined', currentPage.declined + 1)}
                        disabled={currentPage.declined === getTotalPages(declinedBookings)}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.declined === getTotalPages(declinedBookings) &&
                              styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Next
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            currentPage.declined === getTotalPages(declinedBookings)
                              ? '#CBD5E1'
                              : '#2563eb'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            <View style={styles.section}>
              {pastBookings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={160} color="#3B82F6" />
                  <Text style={styles.emptyTitle}>No completed bookings yet</Text>
                  <Text style={styles.emptyText}>
                    Completed and cancelled sessions will appear here.
                  </Text>
                </View>
              ) : (
                <>
                  {getPaginatedBookings(pastBookings, 'past').map((booking) => {
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
                        <Ionicons name="star" size={18} color="#92400E" />
                        <Text style={styles.reviewedButtonText}>Reviewed</Text>
                      </View>
                    ) : undefined;

                    return (
                      <View key={booking.id}>
                        <BookingCard
                          booking={bookingCardData}
                          onPress={() => handleBookingPress(booking.id)}
                          actionButton={actionButton}
                          showOptions={true}
                          onOptionsPress={() => handleOptionsPress(booking.id)}
                        />
                      </View>
                    );
                  })}
                  {getTotalPages(pastBookings) > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.past === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('past', currentPage.past - 1)}
                        disabled={currentPage.past === 1}
                      >
                        <Ionicons
                          name="chevron-back"
                          size={20}
                          color={currentPage.past === 1 ? '#CBD5E1' : '#2563eb'}
                        />
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.past === 1 && styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Previous
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.paginationInfo}>
                        Page {currentPage.past} of {getTotalPages(pastBookings)}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage.past === getTotalPages(pastBookings) &&
                            styles.paginationButtonDisabled,
                        ]}
                        onPress={() => handlePageChange('past', currentPage.past + 1)}
                        disabled={currentPage.past === getTotalPages(pastBookings)}
                      >
                        <Text
                          style={[
                            styles.paginationButtonText,
                            currentPage.past === getTotalPages(pastBookings) &&
                              styles.paginationButtonTextDisabled,
                          ]}
                        >
                          Next
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={
                            currentPage.past === getTotalPages(pastBookings) ? '#CBD5E1' : '#2563eb'
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
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

      {/* Payment Checkout Modal */}
      <PaymentCheckoutModal
        visible={paymentModalVisible}
        bookingId={selectedBookingIdForPayment}
        onClose={() => {
          setPaymentModalVisible(false);
          setSelectedBookingIdForPayment(null);
        }}
      />

      {/* Submit Review Modal */}
      <SubmitReviewModal
        visible={reviewModalVisible}
        bookingId={selectedBookingForReview?.bookingId || null}
        providerId={selectedBookingForReview?.providerId || null}
        providerName={selectedBookingForReview?.providerName}
        onClose={() => {
          setReviewModalVisible(false);
          setSelectedBookingForReview(null);
        }}
        onSuccess={() => {
          // Reload bookings to refresh the review status
          loadBookings();
        }}
      />

      {/* Options Modal */}
      <RNModal
        visible={optionsMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOptionsMenuVisible(false);
          setSelectedBookingId(null);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setOptionsMenuVisible(false);
            setSelectedBookingId(null);
          }}
        >
          <View style={styles.optionsModalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.optionsModalContainer}>
                <TouchableOpacity
                  style={styles.optionsModalItem}
                  onPress={handleRemoveFromHistory}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  <Text style={styles.optionsModalText}>Remove from History</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>
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
    textAlign: 'center',
  },
  tabContainer: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[50],
  },
  tabActive: {
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderRadius: theme.radii.full,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  tabActivePending: {
    borderColor: '#FBBF24', // Yellow
    shadowColor: '#FBBF24',
  },
  tabActiveUpcoming: {
    borderColor: '#A855F7', // Purple
    shadowColor: '#A855F7',
  },
  tabActiveCompleted: {
    borderColor: theme.colors.semantic.success, // Green
    shadowColor: theme.colors.semantic.success,
  },
  tabActiveDeclined: {
    borderColor: '#EF4444', // Red
    shadowColor: '#EF4444',
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
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FBBF24',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
  },
  reviewedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
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
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  paginationButtonDisabled: {
    backgroundColor: theme.colors.neutral[50],
    borderColor: theme.colors.neutral[200],
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
  paginationButtonTextDisabled: {
    color: theme.colors.neutral[500],
  },
  paginationInfo: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[700],
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsModalContainer: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 4,
    borderTopColor: '#EF4444',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
  },
  optionsModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  optionsModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
