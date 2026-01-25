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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingCard, BookingCardData } from '../../components/BookingCard';
import { AnimatedCardWrapper } from '../../components/AnimatedCardWrapper';
import { AnimatedEmptyState } from '../../components/AnimatedEmptyState';
import { AnimatedLoadingState } from '../../components/AnimatedLoadingState';
import { bookingService, BookingDetail } from '../../services/booking';
import { reviewService } from '../../services/review';
import { paymentService } from '../../services/payment';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { usePaymentContext } from '../../contexts/PaymentContext';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { theme } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PaymentCheckoutModal } from '../../components/PaymentCheckoutModal';
import { SubmitReviewModal } from '../../components/SubmitReviewModal';
import { mockBookings } from '../../data/mockBookings';
import { storage } from '../../utils/storage';

const HIDDEN_BOOKINGS_KEY = 'hidden_bookings';

export default function BookingsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { theme: themeHook, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { onBookingUpdate, onReviewDeleted } = useSocket();
  const { isProcessing: paymentProcessing, currentBookingId } = usePaymentContext();
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

  // Load hidden bookings from storage
  useEffect(() => {
    const loadHiddenBookings = async () => {
      if (user?.id) {
        try {
          const stored = await storage.getItem(`${HIDDEN_BOOKINGS_KEY}_${user.id}`);
          if (stored) {
            const hiddenIds = JSON.parse(stored);
            setHiddenBookings(new Set(hiddenIds));
          }
        } catch (error) {
          logger.error('Error loading hidden bookings', error);
        }
      }
    };
    loadHiddenBookings();
  }, [user?.id]);

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
        hasFullBooking: !!data.booking,
      });

      // Update the specific booking in state for instant UI update
      setBookings((prevBookings) => {
        const bookingIndex = prevBookings.findIndex((b) => b.id === data.bookingId);
        
        if (bookingIndex !== -1) {
          // Booking exists, update it with new status and any other changes
          const existingBooking = prevBookings[bookingIndex];
          const oldStatus = existingBooking.status;
          
          logger.debug('Updating existing booking', {
            bookingId: data.bookingId,
            oldStatus,
            newStatus: data.status,
          });

          // If we have full booking data, use it; otherwise merge status update
          const updatedBooking = data.booking
            ? {
                ...data.booking,
                // Preserve nested objects that might not be in the update
                service: data.booking.service || existingBooking.service,
                provider: data.booking.provider || existingBooking.provider,
                client: data.booking.client || existingBooking.client,
                payment: data.booking.payment || existingBooking.payment,
              }
            : {
                ...existingBooking,
            status: data.status as any,
                // Update any other fields from data.booking if provided
            ...(data.booking && {
              ...data.booking,
                  service: data.booking.service || existingBooking.service,
                  provider: data.booking.provider || existingBooking.provider,
                  client: data.booking.client || existingBooking.client,
                  payment: data.booking.payment || existingBooking.payment,
            }),
          };

          const updatedBookings = [...prevBookings];
          updatedBookings[bookingIndex] = updatedBooking;
          
          // Log status change for debugging
          if (oldStatus !== data.status) {
            logger.info('Booking status changed', {
              bookingId: data.bookingId,
              oldStatus,
              newStatus: data.status,
              willMoveTab: true,
            });
          }
          
          return updatedBookings;
        } else {
          // Booking doesn't exist in current list, might be a new booking
          logger.debug('Booking not found in current list, adding or reloading', {
            bookingId: data.bookingId,
            hasFullBooking: !!data.booking,
          });
          
          // If we have the full booking data, add it
          if (data.booking) {
            return [data.booking, ...prevBookings];
          }
          // Otherwise, reload to get the updated list
          if (user && !authLoading) {
            logger.debug('Reloading bookings to get updated list');
            loadBookings();
          }
        }
        return prevBookings;
      });
    });

    return unsubscribe;
  }, [onBookingUpdate, user, authLoading, loadBookings]);

  // Listen for review deletion events to refresh reviewed bookings
  useEffect(() => {
    const unsubscribe = onReviewDeleted((data) => {
      logger.debug('Review deleted via Socket.io', {
        bookingId: data.bookingId,
        reviewId: data.reviewId,
      });

      // Remove the booking from reviewedBookings set so "Write a Review" button appears
      setReviewedBookings((prev) => {
        const updated = new Set(prev);
        updated.delete(data.bookingId);
        return updated;
      });
    });

    return unsubscribe;
  }, [onReviewDeleted]);

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
    // Only providers can message from bookings screen - clients must use provider detail
    // Clients should only be able to message through the provider detail modal
    if (user?.userType === 'PROVIDER' && booking.clientId) {
      router.push(`/messages/${booking.clientId}`);
    }
    // For clients, do nothing - they should use provider detail to start conversations
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
      type: 'success',
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
    // Check if another payment is already processing (only block if it's a different booking)
    if (paymentProcessing && currentBookingId !== bookingId) {
      modal.showAlert({
        title: 'Payment Already in Progress',
        message: `A payment for another booking is currently being processed. Please wait for it to complete before starting a new payment.${currentBookingId ? ` (Booking ID: ${currentBookingId.substring(0, 8)}...)` : ''}`,
        type: 'warning',
      });
      return;
    }
    
    setSelectedBookingIdForPayment(bookingId);
    setPaymentModalVisible(true);
  };

  const handleOptionsPress = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setOptionsMenuVisible(true);
  };

  // Helper function to create BookingCardData
  const createBookingCardData = (booking: BookingDetail): BookingCardData => {
    // For providers, show client info; for clients, show provider info
    const displayName = user?.userType === 'PROVIDER'
      ? (booking.client
          ? `${booking.client.firstName} ${booking.client.lastName}`
          : 'Unknown Client')
      : (booking.provider
          ? `${booking.provider.firstName} ${booking.provider.lastName}`
          : 'Unknown Provider');
    
    const displayPhoto = user?.userType === 'PROVIDER'
      ? booking.client?.profilePhoto
      : booking.provider?.profilePhoto;

    return {
      id: booking.id,
      providerId: booking.providerId,
      providerName: displayName,
      providerPhoto: displayPhoto || undefined,
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
  };

  const handleRemoveFromHistory = async () => {
    if (!selectedBookingId || !user?.id) return;
    setOptionsMenuVisible(false);
    modal.showConfirm({
      title: 'Remove from History',
      message:
        'Are you sure you want to permanently delete this booking from your history? This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await bookingService.delete(selectedBookingId);
          
          // Remove from local state
          setBookings((prev) => prev.filter((b) => b.id !== selectedBookingId));
          
          // Also remove from hidden bookings set (cleanup)
          const newHiddenBookings = new Set(hiddenBookings);
          newHiddenBookings.delete(selectedBookingId);
          setHiddenBookings(newHiddenBookings);
          
          // Clean up storage
          try {
            await storage.setItem(`${HIDDEN_BOOKINGS_KEY}_${user.id}`, JSON.stringify(Array.from(newHiddenBookings)));
          } catch (error) {
            logger.error('Error saving hidden bookings', error);
          }
          
          setSelectedBookingId(null);
          modal.showAlert({
            title: 'Deleted',
            message: 'Booking has been permanently deleted from your history.',
            type: 'success',
          });
        } catch (error: any) {
          logger.error('Error deleting booking', error);
          const errorMessage = getUserFriendlyError(error);
          modal.showAlert({
            title: 'Error',
            message: errorMessage || 'Failed to delete booking. Please try again.',
            type: 'error',
          });
        }
      },
      onCancel: () => {
        setSelectedBookingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}>
        <ScrollView style={styles.content} contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 80 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeHook.colors.text }]}>
              {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
            </Text>
            <View style={[styles.tabContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
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
          <AnimatedLoadingState 
            visible={isLoading}
            style={styles.loadingContainer}
          />
        </ScrollView>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeHook.colors.text }]}>
              {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
            </Text>
            <View style={[styles.tabContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
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
              <AnimatedEmptyState style={styles.emptyState}>
                <Ionicons name="time-outline" size={160} color="#FBBF24" />
                <Text style={styles.emptyTitle}>No pending bookings</Text>
                <Text style={styles.emptyText}>
                  {user?.userType === 'PROVIDER'
                    ? 'When clients request sessions, they will appear here'
                    : 'When you request a session, it will appear here'}
                </Text>
              </AnimatedEmptyState>
            ) : activeTab === 'upcoming' ? (
              <AnimatedEmptyState style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={160} color="#A855F7" />
                <Text style={styles.emptyTitle}>No upcoming bookings</Text>
                <Text style={styles.emptyText}>
                  When you schedule a session, it will appear here.
                </Text>
              </AnimatedEmptyState>
            ) : activeTab === 'declined' ? (
              <AnimatedEmptyState style={styles.emptyState}>
                <Ionicons name="close-circle-outline" size={160} color="#EF4444" />
                <Text style={styles.emptyTitle}>No declined bookings</Text>
                <Text style={styles.emptyText}>
                  {user?.userType === 'PROVIDER'
                    ? 'Bookings that you declined will appear here.'
                    : 'Bookings that were declined by the provider will appear here.'}
                </Text>
              </AnimatedEmptyState>
            ) : (
              <AnimatedEmptyState style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={160} color={theme.colors.semantic.success} />
                <Text style={styles.emptyTitle}>No completed bookings yet</Text>
                <Text style={styles.emptyText}>
                  Completed and cancelled sessions will appear here.
                </Text>
              </AnimatedEmptyState>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeHook.colors.text }]}>
            {user?.userType === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
          </Text>
          <View style={[styles.tabContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: themeHook.colors.surface },
                activeTab === 'pending' && styles.tabActive,
                activeTab === 'pending' && styles.tabActivePending,
                activeTab === 'pending' && { backgroundColor: isDark ? themeHook.colors.surfaceElevated : themeHook.colors.white },
              ]}
              onPress={() => handleTabChange('pending')}
              activeOpacity={0.8}
            >
              <Text style={[activeTab === 'pending' ? styles.tabActiveText : styles.tabText, { color: activeTab === 'pending' ? themeHook.colors.text : themeHook.colors.textSecondary }]}>
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: themeHook.colors.surface },
                activeTab === 'upcoming' && styles.tabActive,
                activeTab === 'upcoming' && styles.tabActiveUpcoming,
                activeTab === 'upcoming' && { backgroundColor: isDark ? themeHook.colors.surfaceElevated : themeHook.colors.white },
              ]}
              onPress={() => handleTabChange('upcoming')}
              activeOpacity={0.8}
            >
              <Text style={[activeTab === 'upcoming' ? styles.tabActiveText : styles.tabText, { color: activeTab === 'upcoming' ? themeHook.colors.text : themeHook.colors.textSecondary }]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: themeHook.colors.surface },
                activeTab === 'past' && styles.tabActive,
                activeTab === 'past' && styles.tabActiveCompleted,
                activeTab === 'past' && { backgroundColor: isDark ? themeHook.colors.surfaceElevated : themeHook.colors.white },
              ]}
              onPress={() => handleTabChange('past')}
              activeOpacity={0.8}
            >
              <Text style={[activeTab === 'past' ? styles.tabActiveText : styles.tabText, { color: activeTab === 'past' ? themeHook.colors.text : themeHook.colors.textSecondary }]}>
                Completed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                { backgroundColor: themeHook.colors.surface },
                activeTab === 'declined' && styles.tabActive,
                activeTab === 'declined' && styles.tabActiveDeclined,
                activeTab === 'declined' && { backgroundColor: isDark ? themeHook.colors.surfaceElevated : themeHook.colors.white },
              ]}
              onPress={() => handleTabChange('declined')}
              activeOpacity={0.8}
            >
              <Text style={[activeTab === 'declined' ? styles.tabActiveText : styles.tabText, { color: activeTab === 'declined' ? themeHook.colors.text : themeHook.colors.textSecondary }]}>
                Declined
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          {activeTab === 'pending' ? (
            <View style={styles.section}>
              {pendingBookings.length === 0 ? (
                <AnimatedEmptyState style={styles.emptyState}>
                  <Ionicons name="time-outline" size={160} color="#FBBF24" />
                  <Text style={[styles.emptyTitle, { color: themeHook.colors.text }]}>No pending bookings</Text>
                  <Text style={[styles.emptyText, { color: themeHook.colors.textSecondary }]}>
                    {user?.userType === 'PROVIDER'
                      ? 'When clients request sessions, they will appear here'
                      : 'When you request a session, it will appear here'}
                  </Text>
                </AnimatedEmptyState>
              ) : (
                <>
                  {getPaginatedBookings(pendingBookings, 'pending').map((booking, index) => {
                    const bookingCardData = createBookingCardData(booking);

                    return (
                      <AnimatedCardWrapper key={booking.id} index={index}>
                        <BookingCard
                          booking={bookingCardData}
                          onPress={() => handleBookingPress(booking.id)}
                          showMessageButton={user?.userType === 'PROVIDER' ? true : false}
                          onMessagePress={user?.userType === 'PROVIDER' ? () => handleMessage(booking) : undefined}
                        />
                      </AnimatedCardWrapper>
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
                <AnimatedEmptyState style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={160} color="#A855F7" />
                  <Text style={[styles.emptyTitle, { color: themeHook.colors.text }]}>No upcoming bookings</Text>
                  <Text style={[styles.emptyText, { color: themeHook.colors.textSecondary }]}>
                    When you schedule a session, it will appear here.
                  </Text>
                </AnimatedEmptyState>
              ) : (
                <>
                  <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Upcoming Bookings</Text>
                  {getPaginatedBookings(upcomingBookings, 'upcoming').map((booking, index) => {
                    const bookingCardData = createBookingCardData(booking);

                    const showCompleteButton =
                      user?.userType === 'PROVIDER' && booking.status === 'CONFIRMED';

                    // Determine action button for client confirmed bookings
                    const actionButton =
                      user?.userType === 'CLIENT' && booking.status === 'CONFIRMED' ? (
                        booking.payment?.status === 'completed' ? (
                          <View style={[styles.paidButton, { backgroundColor: themeHook.colors.success + '20', borderColor: themeHook.colors.success }]}>
                            <Ionicons name="cash" size={18} color={themeHook.colors.success} />
                            <Text style={[styles.paidButtonText, { color: themeHook.colors.success }]}>Paid</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.paymentButton, { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primary }]}
                            onPress={() => handlePayment(booking.id)}
                          >
                            <Ionicons name="card-outline" size={18} color={themeHook.colors.white} />
                            <Text style={styles.paymentButtonText}>Pay Now</Text>
                          </TouchableOpacity>
                        )
                      ) : undefined;

                    return (
                      <AnimatedCardWrapper key={booking.id} index={index}>
                        <BookingCard
                          booking={bookingCardData}
                          onPress={() => handleBookingPress(booking.id)}
                          actionButton={actionButton}
                          onComplete={
                            showCompleteButton ? () => handleComplete(booking.id) : undefined
                          }
                          showMessageButton={user?.userType === 'PROVIDER' ? true : false}
                          onMessagePress={user?.userType === 'PROVIDER' ? () => handleMessage(booking) : undefined}
                        />
                      </AnimatedCardWrapper>
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
                <AnimatedEmptyState style={styles.emptyState}>
                  <Ionicons name="close-circle-outline" size={160} color="#EF4444" />
                  <Text style={[styles.emptyTitle, { color: themeHook.colors.text }]}>No declined bookings</Text>
                  <Text style={[styles.emptyText, { color: themeHook.colors.textSecondary }]}>
                    {user?.userType === 'PROVIDER'
                      ? 'Bookings that you declined will appear here.'
                      : 'Bookings that were declined by the provider will appear here.'}
                  </Text>
                </AnimatedEmptyState>
              ) : (
                <>
                  {getPaginatedBookings(declinedBookings, 'declined').map((booking, index) => {
                    const bookingCardData = createBookingCardData(booking);

                    return (
                      <AnimatedCardWrapper key={booking.id} index={index}>
                        <BookingCard
                          booking={bookingCardData}
                          onPress={() => handleBookingPress(booking.id)}
                          showOptions={true}
                          onOptionsPress={() => handleOptionsPress(booking.id)}
                          showMessageButton={user?.userType === 'PROVIDER' ? true : false}
                          onMessagePress={user?.userType === 'PROVIDER' ? () => handleMessage(booking) : undefined}
                        />
                      </AnimatedCardWrapper>
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
                <AnimatedEmptyState style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={160} color={themeHook.colors.success} />
                  <Text style={[styles.emptyTitle, { color: themeHook.colors.text }]}>No completed bookings yet</Text>
                  <Text style={[styles.emptyText, { color: themeHook.colors.textSecondary }]}>
                    Completed and cancelled sessions will appear here.
                  </Text>
                </AnimatedEmptyState>
              ) : (
                <>
                  {getPaginatedBookings(pastBookings, 'past').map((booking, index) => {
                    const bookingCardData = createBookingCardData(booking);

                    const hasReview = reviewedBookings.has(booking.id);
                    const canReview =
                      booking.status === 'COMPLETED' && user?.userType === 'CLIENT' && !hasReview;

                    // Determine action button for past bookings
                    const actionButton = canReview ? (
                      <TouchableOpacity
                        style={[styles.reviewButton, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}
                        onPress={() => handleReview(booking)}
                      >
                        <Ionicons name="star-outline" size={18} color={isDark ? themeHook.colors.white : themeHook.colors.primary} />
                        <Text style={[styles.reviewButtonText, { color: isDark ? themeHook.colors.white : themeHook.colors.primary }]}>Write a Review</Text>
                      </TouchableOpacity>
                    ) : hasReview ? (
                      <View style={styles.reviewedButton}>
                        <Ionicons name="star" size={18} color="#92400E" />
                        <Text style={styles.reviewedButtonText}>Reviewed</Text>
                      </View>
                    ) : undefined;

                    return (
                      <AnimatedCardWrapper key={booking.id} index={index}>
                        <BookingCard
                          booking={bookingCardData}
                          onPress={() => handleBookingPress(booking.id)}
                          actionButton={actionButton}
                          showOptions={true}
                          onOptionsPress={() => handleOptionsPress(booking.id)}
                        />
                      </AnimatedCardWrapper>
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
          <View style={[styles.optionsModalOverlay, { backgroundColor: themeHook.colors.overlay }]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.optionsModalContainer, { backgroundColor: themeHook.colors.surface, borderTopColor: themeHook.colors.error, paddingBottom: Math.max(insets.bottom, theme.spacing.xl) }]}>
                <TouchableOpacity
                  style={styles.optionsModalItem}
                  onPress={handleRemoveFromHistory}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={22} color={themeHook.colors.error} />
                  <Text style={[styles.optionsModalText, { color: themeHook.colors.error }]}>Remove from History</Text>
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
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.display,
    textAlign: 'center',
  },
  tabContainer: {
    marginTop: theme.spacing.lg,
    marginHorizontal: -theme.spacing.xl + 4, // Extend beyond header padding to match card position (cards are at listContent padding + 4px margin)
    flexDirection: 'row',
    borderRadius: theme.radii.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tabActive: {
    borderWidth: 2,
    borderRadius: theme.radii.full,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
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
  },
  tabActiveText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.sm,
    marginTop: theme.spacing.sm,
    borderWidth: 2,
  },
  paidButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderWidth: 1,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paginationButtonTextDisabled: {
    // Color applied inline
  },
  paginationInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionsModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 4,
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
  },
});
