import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { bookingService, BookingDetail } from '../../services/booking';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

// Animated bar component for smooth transitions
function AnimatedBar({
  height,
  color,
  monthName,
  earnings,
  isFocused,
  onPressIn,
  onPressOut,
}: {
  height: number;
  color: string;
  monthName: string;
  earnings: number;
  isFocused: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  const animatedHeight = useRef(new Animated.Value(height)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: height,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [height, animatedHeight]);

  useEffect(() => {
    Animated.timing(animatedScale, {
      toValue: isFocused ? 1.1 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, animatedScale]);

  return (
    <TouchableOpacity
      style={styles.chartBarContainer}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <View style={styles.chartBarWrapper}>
        <Animated.View
          style={[
            styles.chartBar,
            {
              height: animatedHeight.interpolate({
                inputRange: [0, 100],
                outputRange: [0, 80], // 80 is the chartBarWrapper height
              }),
              backgroundColor: color,
              transform: [{ scaleX: animatedScale }],
            },
          ]}
        />
      </View>
      <Text style={styles.chartLabel}>{monthName}</Text>
    </TouchableOpacity>
  );
}

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { onBookingUpdate } = useSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    upcomingBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    averageBookingValue: 0,
    averageRating: 0,
    totalReviews: 0,
  });
  const [recentBookings, setRecentBookings] = useState<BookingDetail[]>([]);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<1 | 3 | 6 | 12>(6);
  const [focusedBarIndex, setFocusedBarIndex] = useState<number | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    monthName: string;
    earnings: number;
    x: number;
    y: number;
  } | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Load bookings
      const bookings = await bookingService.getMyBookings(undefined, 'provider');

      // Calculate stats
      const upcoming = bookings.filter(
        (b) => b.status === 'CONFIRMED' && new Date(b.scheduledDate) >= new Date()
      );
      const pending = bookings.filter((b) => b.status === 'PENDING');
      const completed = bookings.filter((b) => b.status === 'COMPLETED');

      // Calculate earnings from completed bookings with payments
      // Use provider amount (what provider actually receives) instead of total price
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalEarnings = 0;
      let thisMonthEarnings = 0;
      let completedWithPayments = 0;

      completed.forEach((booking) => {
        if (booking.payment?.status === 'completed') {
          // Calculate provider amount: use providerAmount if available, otherwise calculate
          const providerAmount = booking.payment.providerAmount
            ? booking.payment.providerAmount
            : booking.payment.amount -
              (booking.payment.platformFee || booking.payment.amount * 0.075);

          totalEarnings += providerAmount;
          completedWithPayments++;

          // Check if booking was completed this month
          const bookingDate = new Date(booking.scheduledDate);
          if (bookingDate >= startOfMonth) {
            thisMonthEarnings += providerAmount;
          }
        }
      });

      const averageBookingValue =
        completedWithPayments > 0 ? totalEarnings / completedWithPayments : 0;

      // Calculate monthly earnings for the last 12 months (always calculate all 12)
      // Look at all bookings with completed payments, not just completed bookings
      const monthlyData: number[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        let monthEarnings = 0;
        // Check all bookings, not just completed ones
        bookings.forEach((booking) => {
          if (booking.payment?.status === 'completed') {
            const bookingDate = new Date(booking.scheduledDate);
            if (bookingDate >= monthStart && bookingDate <= monthEnd) {
              const providerAmount = booking.payment.providerAmount
                ? booking.payment.providerAmount
                : booking.payment.amount -
                  (booking.payment.platformFee || booking.payment.amount * 0.075);
              monthEarnings += providerAmount;
            }
          }
        });
        monthlyData.push(monthEarnings);
      }
      setMonthlyEarnings(monthlyData);

      // Load provider profile for rating/reviews
      let rating = 0;
      let reviewCount = 0;
      try {
        const profile = await providerService.getById(user.id);
        rating = profile.rating || 0;
        reviewCount = profile.reviewCount || 0;
        setProviderProfile(profile);
      } catch (error) {
        logger.error('Error loading provider profile', error);
      }

      setStats({
        upcomingBookings: upcoming.length,
        pendingBookings: pending.length,
        completedBookings: completed.length,
        totalEarnings,
        thisMonthEarnings,
        averageBookingValue,
        averageRating: rating,
        totalReviews: reviewCount,
      });

      // Get recent bookings (last 5)
      const recent = bookings
        .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
        .slice(0, 5);
      setRecentBookings(recent);
    } catch (error: any) {
      logger.error('Error loading dashboard data', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]); // Remove timeRange from dependencies - we calculate all 12 months always

  // Listen for real-time booking updates
  useEffect(() => {
    const unsubscribe = onBookingUpdate((data) => {
      logger.debug('Booking updated via Socket.io in dashboard', {
        bookingId: data.bookingId,
        status: data.status,
        paymentStatus: data.booking?.payment?.status,
      });

      // Update recent bookings and get old status/payment status
      let oldStatus: string | undefined;
      let oldPaymentStatus: string | undefined;
      let scheduledDate: string | undefined;
      setRecentBookings((prev) => {
        const booking = prev.find((b) => b.id === data.bookingId);
        if (booking) {
          oldStatus = booking.status;
          oldPaymentStatus = booking.payment?.status;
          scheduledDate = booking.scheduledDate;
          if (booking.status !== data.status || booking.payment?.status !== data.booking?.payment?.status) {
            // Status or payment status changed, update the booking
            return prev.map((b) =>
              b.id === data.bookingId
                ? {
                    ...b,
                    status: data.status as any,
                    ...(data.booking?.payment && { payment: { ...b.payment, ...data.booking.payment } }),
                  }
                : b
            );
          }
        }
        return prev;
      });

      // Check if payment status changed to completed (this affects earnings)
      const newPaymentStatus = data.booking?.payment?.status;
      const paymentJustCompleted =
        oldPaymentStatus !== 'completed' && newPaymentStatus === 'completed';

      // Update stats based on status change
      if (oldStatus && oldStatus !== data.status) {
        setStats((prev) => {
          const newStats = { ...prev };

          // Helper to check if booking is upcoming (CONFIRMED and future date)
          const isUpcomingStatus = (status: string, date?: string) => {
            if (status !== 'CONFIRMED') return false;
            if (!date) return false;
            return new Date(date) >= new Date();
          };

          // Use scheduledDate from recent bookings, or fallback to booking data
          const bookingDate = scheduledDate || data.booking?.scheduledDate;

          // Decrement old category
          if (oldStatus === 'PENDING') {
            newStats.pendingBookings = Math.max(0, newStats.pendingBookings - 1);
          } else if (oldStatus && isUpcomingStatus(oldStatus, bookingDate)) {
            newStats.upcomingBookings = Math.max(0, newStats.upcomingBookings - 1);
          } else if (oldStatus === 'COMPLETED') {
            newStats.completedBookings = Math.max(0, newStats.completedBookings - 1);
          }

          // Increment new category
          if (data.status === 'PENDING') {
            newStats.pendingBookings += 1;
          } else if (isUpcomingStatus(data.status, bookingDate)) {
            newStats.upcomingBookings += 1;
          } else if (data.status === 'COMPLETED') {
            newStats.completedBookings += 1;
          }

          return newStats;
        });

        // If booking was just completed or payment just completed, reload to update earnings
        if (data.status === 'COMPLETED' || paymentJustCompleted) {
          setTimeout(() => loadDashboardData(), 0);
        }
      } else if (paymentJustCompleted) {
        // Payment status changed to completed, reload to update earnings
        setTimeout(() => loadDashboardData(), 0);
      } else if (!oldStatus) {
        // Booking not in recent bookings, reload to get accurate stats
        loadDashboardData();
      }
    });

    return unsubscribe;
  }, [onBookingUpdate, loadDashboardData]);

  // Redirect clients to discover
  useEffect(() => {
    // Wait a tick to ensure router is mounted
    const timer = setTimeout(() => {
      if (user?.userType !== 'PROVIDER') {
        router.replace('/(tabs)/');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    if (user && user.userType === 'PROVIDER') {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleBookingPress = (bookingId: string) => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: bookingId },
    });
  };

  const getBookingBorderColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#f59e0b';
      case 'CONFIRMED':
        return '#9333EA';
      case 'COMPLETED':
        return '#16A34A';
      case 'CANCELLED':
      case 'DECLINED':
        return '#ef4444';
      default:
        return theme.colors.primary[500];
    }
  };

  // Don't render dashboard for clients (but all hooks must still be called)
  if (user?.userType !== 'PROVIDER') {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Welcome back, {user?.firstName}</Text>
            </View>
            <TouchableOpacity
              style={styles.headerSettingsButton}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerDivider} />
        {/* Hero Section - Key Metrics */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroMain}>
                <Text style={styles.heroLabel}>Total Earnings</Text>
                <Text style={styles.heroValue}>
                  $
                  {stats.totalEarnings.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                {stats.averageRating > 0 && (
                  <View style={styles.heroRatingInline}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text style={styles.heroRatingValueInline}>
                      {stats.averageRating.toFixed(1)}
                    </Text>
                    <Text style={styles.heroRatingLabelInline}>({stats.totalReviews})</Text>
                  </View>
                )}
              </View>
              <View style={styles.heroChart}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>Last {timeRange}M</Text>
                  <View style={styles.timeRangePills}>
                    {([1, 3, 6, 12] as const).map((months) => (
                      <TouchableOpacity
                        key={months}
                        style={[
                          styles.timeRangePill,
                          timeRange === months && styles.timeRangePillActive,
                        ]}
                        onPress={() => setTimeRange(months)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeRangePillText,
                            timeRange === months && styles.timeRangePillTextActive,
                          ]}
                        >
                          {months}M
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  {tooltipData && (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          left: tooltipData.x - 50,
                          bottom: tooltipData.y + 10,
                        },
                      ]}
                    >
                      <Text style={styles.tooltipMonth}>{tooltipData.monthName}</Text>
                      <Text style={styles.tooltipAmount}>
                        $
                        {tooltipData.earnings.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                    </View>
                  )}
                  {(() => {
                    // Always render 12 bars, but only show data for the selected time range
                    const monthNames = [
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec',
                    ];
                    const currentDate = new Date();
                    const maxEarnings =
                      monthlyEarnings.length > 0 ? Math.max(...monthlyEarnings, 1) : 1;

                    // Create array of 12 months, with earnings data for the selected range
                    const allMonths = Array.from({ length: 12 }, (_, index) => {
                      const monthIndex = (currentDate.getMonth() - 11 + index + 12) % 12;
                      // Check if this month is within the selected time range
                      const monthsFromEnd = 11 - index;
                      const hasData =
                        monthsFromEnd < timeRange && monthlyEarnings.length > monthsFromEnd;
                      const earnings = hasData
                        ? monthlyEarnings[monthlyEarnings.length - 1 - monthsFromEnd]
                        : 0;

                      return {
                        monthIndex,
                        monthName: monthNames[monthIndex],
                        earnings,
                        hasData,
                      };
                    });

                    return allMonths.map((month, index) => {
                      const height = maxEarnings > 0 ? (month.earnings / maxEarnings) * 100 : 0;
                      const barHeight = month.hasData ? Math.max(height, 2) : 2;
                      const barColor =
                        month.hasData && month.earnings > 0
                          ? theme.colors.primary[500]
                          : theme.colors.neutral[200];

                      return (
                        <AnimatedBar
                          key={index}
                          height={barHeight}
                          color={barColor}
                          monthName={month.monthName}
                          earnings={month.earnings}
                          isFocused={focusedBarIndex === index}
                          onPressIn={() => {
                            if (month.hasData && month.earnings > 0) {
                              setFocusedBarIndex(index);
                              // Calculate tooltip position (approximate)
                              const barWidth = 24; // Approximate bar width
                              const spacing = 4; // Gap between bars
                              const x = index * (barWidth + spacing) + barWidth / 2;
                              setTooltipData({
                                monthName: month.monthName,
                                earnings: month.earnings,
                                x,
                                y: barHeight, // Position above the bar
                              });
                            }
                          }}
                          onPressOut={() => {
                            setFocusedBarIndex(null);
                            setTooltipData(null);
                          }}
                        />
                      );
                    });
                  })()}
                </View>
              </View>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetrics}>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>This Month</Text>
                <Text style={styles.heroMetricValue}>
                  $
                  {stats.thisMonthEarnings.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Avg. Booking</Text>
                <Text style={styles.heroMetricValue}>
                  $
                  {stats.averageBookingValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Booking Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Overview</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[styles.statCard, styles.statCardPending]}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/bookings',
                  params: { tab: 'pending' },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="time-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.pendingBookings}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardUpcoming]}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/bookings',
                  params: { tab: 'upcoming' },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar-outline" size={22} color="#9333EA" />
              </View>
              <Text style={styles.statValue}>{stats.upcomingBookings}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statCard, styles.statCardCompleted]}
              onPress={() => {
                router.push({
                  pathname: '/(tabs)/bookings',
                  params: { tab: 'past' },
                });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#16A34A" />
              </View>
              <Text style={styles.statValue}>{stats.completedBookings}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            {recentBookings.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => {
              // Calculate provider amount for display
              const providerAmount =
                booking.payment?.status === 'completed' && booking.payment
                  ? booking.payment.providerAmount
                    ? booking.payment.providerAmount
                    : booking.payment.amount -
                      (booking.payment.platformFee || booking.payment.amount * 0.075)
                  : null;

              // Format date
              const bookingDate = new Date(booking.scheduledDate);
              const isToday = bookingDate.toDateString() === new Date().toDateString();
              const isTomorrow =
                bookingDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

              let dateText = '';
              if (isToday) {
                dateText = 'Today';
              } else if (isTomorrow) {
                dateText = 'Tomorrow';
              } else {
                dateText = bookingDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year:
                    bookingDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                });
              }

              // Get client initials
              const clientInitials = booking.client
                ? `${booking.client.firstName?.[0] || ''}${booking.client.lastName?.[0] || ''}`.toUpperCase()
                : '??';

              return (
                <TouchableOpacity
                  key={booking.id}
                  style={[
                    styles.bookingItem,
                    { borderColor: getBookingBorderColor(booking.status) },
                  ]}
                  onPress={() => handleBookingPress(booking.id)}
                  activeOpacity={0.8}
                >
                  {/* Client Avatar */}
                  <View style={styles.avatarContainer}>
                    {booking.client?.profilePhoto ? (
                      <View style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{clientInitials}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingService}>
                      {booking.service?.name || 'Service'}
                      {providerAmount !== null && (
                        <Text style={styles.bookingPrice}>: ${providerAmount.toFixed(2)}</Text>
                      )}
                    </Text>
                    <Text style={styles.bookingClient}>
                      {booking.client?.firstName} {booking.client?.lastName}
                    </Text>
                    <View style={styles.bookingMeta}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={theme.colors.neutral[500]}
                      />
                      <Text style={styles.bookingDate}>
                        {dateText} at {booking.scheduledTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingRight}>
                    <View style={[styles.statusBadge, styles[`status${booking.status}`]]}>
                      <Text style={styles.statusText}>{booking.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.neutral[500]} />
              <Text style={styles.emptyStateText}>No bookings yet</Text>
              <Text style={styles.emptyStateSubtext}>Your recent bookings will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  header: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs / 2,
  },
  subtitle: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  headerSettingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  heroSection: {
    marginBottom: theme.spacing.xl,
  },
  heroCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    ...theme.shadows.card,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  heroMain: {
    flex: 1,
  },
  heroLabel: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.xs,
  },
  heroValue: {
    ...theme.typography.display,
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  heroRatingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  heroRatingValueInline: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[700],
    fontWeight: '600',
  },
  heroRatingLabelInline: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  heroChart: {
    width: 400,
    alignItems: 'flex-end',
  },
  chartHeader: {
    width: '100%',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  chartTitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.xs,
    textAlign: 'right',
  },
  timeRangePills: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  timeRangePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.neutral[50],
  },
  timeRangePillActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.card,
  },
  timeRangePillText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.neutral[500],
  },
  timeRangePillTextActive: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: theme.spacing.sm,
    width: '100%',
    position: 'relative',
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarWrapper: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.xs,
  },
  chartBar: {
    width: '100%',
    minHeight: 2,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.radii.sm,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
  },
  chartLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: theme.colors.neutral[900],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.md,
    minWidth: 80,
    alignItems: 'center',
    zIndex: 1000,
    ...theme.shadows.card,
  },
  tooltipMonth: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.white,
    marginBottom: 2,
    fontWeight: '600',
  },
  tooltipAmount: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.white,
    fontWeight: '700',
  },
  chartEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartEmptyText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.neutral[500],
  },
  heroDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: theme.spacing.lg,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  heroMetric: {
    flex: 1,
  },
  heroMetricLabel: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.xs,
  },
  heroMetricValue: {
    ...theme.typography.h2,
    fontSize: 18,
    color: theme.colors.neutral[900],
    fontWeight: '600',
  },
  heroMetricDivider: {
    width: 1,
    backgroundColor: theme.colors.neutral[200],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    ...theme.shadows.card,
  },
  statCardPending: {
    borderColor: '#F59E0B',
  },
  statCardUpcoming: {
    borderColor: '#9333EA',
  },
  statCardCompleted: {
    borderColor: '#16A34A',
  },
  statIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    ...theme.typography.h1,
    fontSize: 24,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h2,
    fontSize: 18,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  seeAllText: {
    ...theme.typography.body,
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    borderWidth: 2,
    ...theme.shadows.card,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  bookingClient: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.xs,
  },
  bookingDate: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
  },
  statusPENDING: {
    backgroundColor: '#FEF3C7',
  },
  statusCONFIRMED: {
    backgroundColor: theme.colors.primary[50],
  },
  statusCOMPLETED: {
    backgroundColor: '#DCFCE7',
  },
  statusCANCELLED: {
    backgroundColor: '#FEE2E2',
  },
  statusDECLINED: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  avatarContainer: {
    marginRight: theme.spacing.sm,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neutral[200],
  },
  bookingPrice: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  bookingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  emptyState: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    ...theme.shadows.card,
  },
  emptyStateText: {
    ...theme.typography.h2,
    fontSize: 18,
    color: theme.colors.neutral[700],
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyStateSubtext: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
});
