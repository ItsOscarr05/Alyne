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
import { bookingService, BookingDetail } from '../../services/booking';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

// Animated bar component for smooth transitions
function AnimatedBar({
  height,
  color,
  monthName,
}: {
  height: number;
  color: string;
  monthName: string;
}) {
  const animatedHeight = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: height,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [height, animatedHeight]);

  return (
    <View style={styles.chartBarContainer}>
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
            },
          ]}
        />
      </View>
      <Text style={styles.chartLabel}>{monthName}</Text>
    </View>
  );
}

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.firstName}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Section - Key Metrics */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={styles.heroMain}>
                <Text style={styles.heroLabel}>Total Earnings</Text>
                <Text style={styles.heroValue}>
                  ${stats.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
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
                  ${stats.thisMonthEarnings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricLabel}>Avg. Booking</Text>
                <Text style={styles.heroMetricValue}>
                  ${stats.averageBookingValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPrimary]}
              onPress={() => router.push('/(tabs)/bookings')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={28} color={theme.colors.primary[500]} />
              <Text style={styles.actionText}>View Bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPrimary]}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={28} color={theme.colors.primary[500]} />
              <Text style={styles.actionText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPrimary]}
              onPress={() => router.push('/(tabs)/messages')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles-outline" size={28} color={theme.colors.primary[500]} />
              <Text style={styles.actionText}>Messages</Text>
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
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
    padding: theme.spacing.xl,
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
  actionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderWidth: 2,
    ...theme.shadows.card,
  },
  actionCardPrimary: {
    borderColor: theme.colors.primary[500],
  },
  actionText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.neutral[700],
    textAlign: 'center',
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
