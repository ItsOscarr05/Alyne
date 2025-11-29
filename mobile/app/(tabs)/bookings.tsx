import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BookingCard, BookingCardData } from '../../components/BookingCard';
import { bookingService, BookingDetail } from '../../services/booking';
import { reviewService } from '../../services/review';
import { paymentService } from '../../services/payment';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

export default function BookingsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { onBookingUpdate } = useSocket();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());

  const loadBookings = useCallback(async () => {
    try {
      console.log('Loading bookings for user:', {
        userId: user?.id,
        userType: user?.userType,
      });
      const role = user?.userType === 'PROVIDER' ? 'provider' : 'client';
      console.log('Fetching bookings with role:', role);
      const data = await bookingService.getMyBookings(undefined, role);
      console.log('Bookings loaded:', data.length, 'bookings');
      console.log('Bookings data:', data);
      setBookings(data);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      // Fallback to mock data if API fails
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        const { mockBookings } = await import('../../data/mockBookings');
        setBookings(mockBookings as any);
      } else {
        Alert.alert('Error', error.response?.data?.error?.message || 'Failed to load bookings');
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
      console.log('User available, loading bookings...');
      loadBookings();
    } else if (!authLoading && !user) {
      // User is not authenticated, clear bookings
      console.log('User not authenticated, clearing bookings');
      setBookings([]);
      setIsLoading(false);
    }
  }, [user, authLoading, loadBookings]);

  useEffect(() => {
    // Check which bookings have reviews
    const checkReviews = async () => {
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
    };

    if (bookings.length > 0 && user?.userType === 'CLIENT') {
      checkReviews();
    }
  }, [bookings, user]);

  // Listen for real-time booking updates
  useEffect(() => {
    const unsubscribe = onBookingUpdate((data) => {
      console.log('Booking updated via Socket.io:', data);
      // Refresh bookings when a booking status changes
      if (user && !authLoading) {
        loadBookings();
      }
    });

    return unsubscribe;
  }, [onBookingUpdate, user, authLoading, loadBookings]);

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'PENDING' || b.status === 'CONFIRMED'
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || b.status === 'DECLINED'
  );

  const handleBookingPress = (bookingId: string) => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: bookingId },
    });
  };

  const handleAccept = async (bookingId: string) => {
    try {
      await bookingService.accept(bookingId);
      Alert.alert('Success', 'Booking accepted!');
      loadBookings();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to accept booking');
    }
  };

  const handleDecline = async (bookingId: string) => {
    try {
      console.log('Declining booking:', bookingId);
      const result = await bookingService.decline(bookingId);
      console.log('Decline result:', result);
      console.log('Result status:', result?.status);
      Alert.alert('Success', 'Booking declined');
      // Force reload bookings
      await loadBookings();
    } catch (error: any) {
      console.error('Error declining booking:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.error?.message || 'Failed to decline booking');
    }
  };

  const handleComplete = async (bookingId: string) => {
    // On web, Alert.alert might not work properly, so use window.confirm as fallback
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to mark this booking as completed? The client will be able to leave a review.');
      if (!confirmed) {
        return;
      }
    } else {
      // Show confirmation dialog for native
      Alert.alert(
        'Mark as Completed',
        'Are you sure you want to mark this booking as completed? The client will be able to leave a review.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel'
          },
          {
            text: 'Complete',
            onPress: async () => {
              await completeBookingAction(bookingId);
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    // Execute the completion for web
    await completeBookingAction(bookingId);
  };

  const completeBookingAction = async (bookingId: string) => {
    try {
      await bookingService.complete(bookingId);
      if (Platform.OS === 'web') {
        alert('Success! Booking marked as completed!');
      } else {
        Alert.alert('Success', 'Booking marked as completed!');
      }
      await loadBookings();
    } catch (error: any) {
      console.error('Error completing booking:', error);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.message 
        || error.message 
        || 'Failed to complete booking';
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
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
        </View>
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              When you book a session with a provider, it will appear here
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {upcomingBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcomingBookings.map((booking) => {
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

              const showCompleteButton = user?.userType === 'PROVIDER' && booking.status === 'CONFIRMED';
              
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
                  {showCompleteButton && (
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => handleComplete(booking.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.completeButtonText}>Mark as Completed</Text>
                    </TouchableOpacity>
                  )}
                  {/* Show Paid badge for completed payments */}
                  {booking.payment?.status === 'completed' ? (
                    <View style={styles.paidBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.paidText}>Paid</Text>
                    </View>
                  ) : (
                    /* Show Pay Now button for clients with confirmed bookings that haven't been paid */
                    user?.userType === 'CLIENT' && 
                    booking.status === 'CONFIRMED' && (
                      <TouchableOpacity
                        style={styles.paymentButton}
                        onPress={() => handlePayment(booking.id)}
                      >
                        <Ionicons name="card-outline" size={18} color="#ffffff" />
                        <Text style={styles.paymentButtonText}>Pay Now</Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              );
            })}
          </View>
        )}

        {pastBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past</Text>
            {pastBookings.map((booking) => {
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
              const canReview = booking.status === 'COMPLETED' && user?.userType === 'CLIENT' && !hasReview;

              return (
                <View key={booking.id}>
                  <BookingCard
                    booking={bookingCardData}
                    onPress={() => handleBookingPress(booking.id)}
                  />
                  {canReview && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => handleReview(booking)}
                    >
                      <Ionicons name="star-outline" size={18} color="#2563eb" />
                      <Text style={styles.reviewButtonText}>Write a Review</Text>
                    </TouchableOpacity>
                  )}
                  {hasReview && (
                    <View style={styles.reviewedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.reviewedText}>Reviewed</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  declineButton: {
    backgroundColor: '#ffffff',
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
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reviewedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

