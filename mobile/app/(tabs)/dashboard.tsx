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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { bookingService, BookingDetail } from '../../services/booking';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { formatTime12Hour } from '../../utils/timeUtils';
import { isSmallScreen, SCREEN_DIMENSIONS } from '../../utils/dimensions';

// Animated bar component for smooth transitions
function AnimatedBar({
  height,
  color,
  monthName,
  earnings,
  isFocused,
  onPressIn,
  onPressOut,
  textColor,
  barWrapperHeight,
  hasData,
  isCurrentMonth,
}: {
  height: number;
  color: string;
  monthName: string;
  earnings: number;
  isFocused: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  textColor: string;
  barWrapperHeight: number;
  hasData: boolean;
  isCurrentMonth?: boolean;
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
      toValue: isFocused ? 1.15 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, animatedScale]);

  return (
    <TouchableOpacity
      style={styles.chartBarContainer}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={hasData ? 0.8 : 1}
      disabled={!hasData}
    >
      <View style={[
        styles.chartBarWrapper, 
        { height: barWrapperHeight, maxHeight: barWrapperHeight }
      ]}>
        <Animated.View
          style={[
            styles.chartBar,
            {
              height: animatedHeight.interpolate({
                inputRange: [0, 100],
                outputRange: [0, barWrapperHeight],
              }),
              backgroundColor: color,
              transform: [{ scaleX: animatedScale }],
              opacity: hasData 
                ? (isCurrentMonth ? (isFocused ? 1 : 0.95) : (isFocused ? 1 : 0.9))
                : 0.4,
              ...(isCurrentMonth && hasData && {
                borderWidth: 1.5,
                borderColor: color,
                borderBottomWidth: 0,
              }),
            },
          ]}
        />
      </View>
      <Text style={[
        styles.chartLabel, 
        { color: textColor }, 
        isSmallScreen() && { fontSize: 9 },
        hasData && { fontWeight: '600' },
        isCurrentMonth && { fontWeight: '700' }
      ]}>
        {monthName}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProviderDashboardScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { onBookingUpdate } = useSocket();
  const { theme: themeHook } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    upcomingBookings: 0,
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
          if (
            booking.status !== data.status ||
            booking.payment?.status !== data.booking?.payment?.status
          ) {
            // Status or payment status changed, update the booking
            return prev.map((b) =>
              b.id === data.bookingId
                ? {
                    ...b,
                    status: data.status as any,
                    ...(data.booking?.payment && {
                      payment: { ...b.payment, ...data.booking.payment },
                    }),
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
          if (oldStatus && isUpcomingStatus(oldStatus, bookingDate)) {
            newStats.upcomingBookings = Math.max(0, newStats.upcomingBookings - 1);
          } else if (oldStatus === 'COMPLETED') {
            newStats.completedBookings = Math.max(0, newStats.completedBookings - 1);
          }

          // Increment new category
          if (isUpcomingStatus(data.status, bookingDate)) {
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

  // Redirect clients to discover immediately (same pattern as discover redirects providers)
  useEffect(() => {
    if (!authLoading && user?.userType !== 'PROVIDER') {
      router.replace('/(tabs)/');
    }
  }, [user, authLoading, router]);

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
        return themeHook.colors.primary;
    }
  };

  // Don't render dashboard for clients (but all hooks must still be called)
  // Wait for auth to load before making this decision
  if (!authLoading && user?.userType !== 'PROVIDER') {
    return null;
  }

  // Show loading state while auth is loading or data is loading
  if (authLoading || isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeHook.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.title, { color: themeHook.colors.text }]}>Dashboard</Text>
              <Text style={[styles.subtitle, { color: themeHook.colors.textSecondary }]}>
                Welcome back, {user?.firstName}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.headerSettingsButton, { backgroundColor: themeHook.colors.surface }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color={themeHook.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        {/* Hero Section - Key Metrics */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary },
            ]}
          >
            <View style={[styles.heroContent, isSmallScreen() && styles.heroContentMobile]}>
              <View style={[
                styles.heroMain, 
                isSmallScreen() && { width: '100%', flex: 0, marginBottom: theme.spacing.md, minWidth: '100%' }
              ]}>
                <View style={{ width: '100%' }}>
                  <Text 
                    style={[
                      styles.heroLabel, 
                      { color: themeHook.colors.textSecondary }
                    ]}
                    numberOfLines={1}
                  >
                    Total Earnings
                  </Text>
                </View>
                <View style={{ width: '100%' }}>
                  <Text 
                    style={[
                      styles.heroValue, 
                      { color: themeHook.colors.text },
                      isSmallScreen() && { fontSize: 24 }
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                  >
                    ${stats.totalEarnings.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
                {stats.averageRating > 0 && (
                  <View style={styles.heroRatingInline}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                    <Text
                      style={[
                        styles.heroRatingValueInline,
                        { marginLeft: theme.spacing.xs, color: themeHook.colors.text },
                      ]}
                    >
                      {stats.averageRating.toFixed(1)}
                    </Text>
                    <Text
                      style={[
                        styles.heroRatingLabelInline,
                        { marginLeft: theme.spacing.xs, color: themeHook.colors.textSecondary },
                      ]}
                    >
                      ({stats.totalReviews})
                    </Text>
                  </View>
                )}
              </View>
              <View style={[
                styles.heroChart,
                !isSmallScreen() && { marginLeft: theme.spacing.lg },
                isSmallScreen() && { marginTop: theme.spacing.md, width: '100%', alignItems: 'stretch' },
                !isSmallScreen() && { maxWidth: '50%', flex: 1 },
              ]}>
                <View style={[styles.chartHeader, isSmallScreen() && { alignItems: 'flex-start' }]}>
                  <Text style={[
                    styles.chartTitle, 
                    { color: themeHook.colors.text }, 
                    isSmallScreen() && { textAlign: 'left', fontSize: 11 }
                  ]}>
                    Last {timeRange}M
                  </Text>
                  <View style={styles.timeRangePills}>
                    {([1, 3, 6, 12] as const).map((months, index) => (
                      <TouchableOpacity
                        key={months}
                        style={[
                          styles.timeRangePill,
                          { backgroundColor: themeHook.colors.surface },
                          timeRange === months && styles.timeRangePillActive,
                          timeRange === months && {
                            backgroundColor: themeHook.colors.surfaceElevated,
                          },
                          index > 0 && { marginLeft: theme.spacing.xs },
                          isSmallScreen() && { paddingHorizontal: theme.spacing.xs, paddingVertical: 3 },
                        ]}
                        onPress={() => setTimeRange(months)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.timeRangePillText,
                            { color: themeHook.colors.textSecondary },
                            timeRange === months && styles.timeRangePillTextActive,
                            timeRange === months && { color: themeHook.colors.text },
                            isSmallScreen() && { fontSize: 10 },
                          ]}
                        >
                          {months}M
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[
                  styles.chartContainer,
                  isSmallScreen() && { 
                    height: 90, 
                    paddingHorizontal: theme.spacing.xs,
                    paddingLeft: theme.spacing.xs,
                    paddingRight: theme.spacing.xs,
                  }
                ]}>
                  {/* Baseline indicator */}
                  <View style={[
                    styles.chartBaseline,
                    { backgroundColor: themeHook.colors.border }
                  ]} />
                  
                  {tooltipData && (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          backgroundColor: themeHook.colors.surfaceElevated || themeHook.colors.surface,
                          borderColor: themeHook.colors.primary,
                          left: tooltipData.x - 50,
                          bottom: tooltipData.y + 15,
                        },
                      ]}
                    >
                      <Text style={[
                        styles.tooltipMonth,
                        { color: themeHook.colors.textSecondary }
                      ]}>
                        {tooltipData.monthName}
                      </Text>
                      <Text style={[
                        styles.tooltipAmount,
                        { color: themeHook.colors.text }
                      ]}>
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
                    const currentYear = currentDate.getFullYear();
                    const maxEarnings =
                      monthlyEarnings.length > 0 ? Math.max(...monthlyEarnings, 1) : 1;

                    // Helper function to format month labels with year when needed
                    const formatMonthLabel = (monthIndex: number, monthYear: number, currentYear: number) => {
                      const monthName = monthNames[monthIndex];
                      if (monthYear !== currentYear) {
                        return `${monthName} '${monthYear.toString().slice(-2)}`;
                      }
                      return monthName;
                    };

                    // Create array of 12 months, with earnings data for the selected range
                    const allMonths = Array.from({ length: 12 }, (_, index) => {
                      // Calculate actual date for this month (11 months ago + index)
                      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11 + index, 1);
                      const monthIndex = monthDate.getMonth();
                      const monthYear = monthDate.getFullYear();
                      const isCurrentMonth = monthDate.getMonth() === currentDate.getMonth() && 
                                           monthDate.getFullYear() === currentDate.getFullYear();
                      
                      // Check if this month is within the selected time range
                      const monthsFromEnd = 11 - index;
                      const hasData =
                        monthsFromEnd < timeRange && monthlyEarnings.length > monthsFromEnd;
                      const earnings = hasData
                        ? monthlyEarnings[monthlyEarnings.length - 1 - monthsFromEnd]
                        : 0;

                      return {
                        monthIndex,
                        monthYear,
                        monthName: formatMonthLabel(monthIndex, monthYear, currentYear),
                        earnings,
                        hasData,
                        isCurrentMonth,
                      };
                    });

                    return allMonths.map((month, index) => {
                      const height = maxEarnings > 0 ? (month.earnings / maxEarnings) * 100 : 0;
                      // Minimum bar height for visibility, but distinguish between zero and no data
                      const barHeight = month.hasData 
                        ? (month.earnings > 0 ? Math.max(height, 5) : 3) 
                        : 2;
                      
                      // Better color distinction: primary for earnings, muted for zero, border for no data
                      // Current month gets enhanced color (lighter/more saturated)
                      const basePrimaryColor = month.isCurrentMonth && month.hasData && month.earnings > 0
                        ? themeHook.colors.primaryLight || themeHook.colors.primary
                        : themeHook.colors.primary;
                      
                      const barColor =
                        month.hasData && month.earnings > 0
                          ? basePrimaryColor
                          : month.hasData && month.earnings === 0
                          ? themeHook.colors.textTertiary || themeHook.colors.border
                          : themeHook.colors.border;

                      const barSpacing = isSmallScreen() ? 2 : 4;
                      const barWidth = isSmallScreen() ? 20 : 28;
                      const barWrapperHeight = isSmallScreen() ? 70 : 85;

                      return (
                        <View 
                          key={index} 
                          style={[
                            styles.chartBarContainer,
                            index > 0 && { marginLeft: barSpacing },
                            isSmallScreen() && { minWidth: 20, maxWidth: 24 }
                          ]}
                        >
                          <AnimatedBar
                            height={barHeight}
                            color={barColor}
                            monthName={month.monthName}
                            earnings={month.earnings}
                            isFocused={focusedBarIndex === index}
                            textColor={month.hasData && month.earnings > 0 
                              ? (month.isCurrentMonth ? themeHook.colors.primary : themeHook.colors.text)
                              : themeHook.colors.textTertiary || themeHook.colors.textSecondary}
                            barWrapperHeight={barWrapperHeight}
                            hasData={month.hasData && month.earnings > 0}
                            isCurrentMonth={month.isCurrentMonth}
                            onPressIn={() => {
                              if (month.hasData) {
                                setFocusedBarIndex(index);
                                // Calculate tooltip position (approximate)
                                const spacing = isSmallScreen() ? 2 : 4;
                                const x = index * (barWidth + spacing) + barWidth / 2;
                                // Format full month name with year for tooltip
                                const fullMonthName = monthNames[month.monthIndex];
                                const tooltipMonthLabel = month.monthYear !== currentYear
                                  ? `${fullMonthName} ${month.monthYear}`
                                  : fullMonthName;
                                setTooltipData({
                                  monthName: tooltipMonthLabel,
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
                        </View>
                      );
                    });
                  })()}
                </View>
              </View>
            </View>
            <View style={[
              styles.heroMetrics,
              { borderTopColor: themeHook.colors.border }
            ]}>
              <View style={styles.heroMetric}>
                <Text style={[styles.heroMetricLabel, { color: themeHook.colors.textSecondary }]}>
                  This Month
                </Text>
                <Text style={[styles.heroMetricValue, { color: themeHook.colors.text }]}>
                  $
                  {stats.thisMonthEarnings.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              <View
                style={[styles.heroMetricDivider, { backgroundColor: themeHook.colors.border }]}
              />
              <View style={styles.heroMetric}>
                <Text style={[styles.heroMetricLabel, { color: themeHook.colors.textSecondary }]}>
                  Avg. Booking
                </Text>
                <Text style={[styles.heroMetricValue, { color: themeHook.colors.text }]}>
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
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>
            Booking Overview
          </Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={[
                styles.statCard,
                styles.statCardUpcoming,
                { backgroundColor: themeHook.colors.surface },
              ]}
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
              <Text style={[styles.statValue, { color: themeHook.colors.text }]}>
                {stats.upcomingBookings}
              </Text>
              <Text style={[styles.statLabel, { color: themeHook.colors.textSecondary }]}>
                Upcoming
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statCard,
                styles.statCardCompleted,
                { marginLeft: theme.spacing.md, backgroundColor: themeHook.colors.surface },
              ]}
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
              <Text style={[styles.statValue, { color: themeHook.colors.text }]}>
                {stats.completedBookings}
              </Text>
              <Text style={[styles.statLabel, { color: themeHook.colors.textSecondary }]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>
              Recent Bookings
            </Text>
            {recentBookings.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                <Text style={[styles.seeAllText, { color: themeHook.colors.text }]}>See All</Text>
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
                    {
                      backgroundColor: themeHook.colors.surface,
                      borderColor: getBookingBorderColor(booking.status),
                    },
                  ]}
                  onPress={() => handleBookingPress(booking.id)}
                  activeOpacity={0.8}
                >
                  {/* Client Avatar */}
                  <View style={styles.avatarContainer}>
                    {booking.client?.profilePhoto ? (
                      <View style={styles.avatarImage} />
                    ) : (
                      <View
                        style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: themeHook.colors.primaryLight },
                        ]}
                      >
                        <Text style={[styles.avatarText, { color: themeHook.colors.primary }]}>
                          {clientInitials}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.bookingInfo, { marginLeft: theme.spacing.md }]}>
                    <Text style={[styles.bookingService, { color: themeHook.colors.text }]}>
                      {booking.service?.name || 'Service'}
                      {providerAmount !== null && (
                        <Text style={[styles.bookingPrice, { color: themeHook.colors.primary }]}>
                          : ${providerAmount.toFixed(2)}
                        </Text>
                      )}
                    </Text>
                    <Text style={[styles.bookingClient, { color: themeHook.colors.text }]}>
                      {booking.client?.firstName} {booking.client?.lastName}
                    </Text>
                    <View style={styles.bookingMeta}>
                      <Ionicons name="calendar-outline" size={14} color={themeHook.colors.text} />
                      <Text style={[styles.bookingDate, { color: themeHook.colors.text }]}>
                        {dateText} at {formatTime12Hour(booking.scheduledTime)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bookingRight}>
                    <View style={[styles.statusBadge, styles[`status${booking.status}`]]}>
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              booking.status === 'COMPLETED' || booking.status === 'PENDING' || booking.status === 'CONFIRMED' || booking.status === 'DECLINED' ? '#000000' : themeHook.colors.text,
                          },
                        ]}
                      >
                        {booking.status}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={themeHook.colors.textTertiary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={[styles.emptyState, { backgroundColor: themeHook.colors.surface }]}>
              <Ionicons name="calendar-outline" size={48} color={themeHook.colors.textTertiary} />
              <Text style={[styles.emptyStateText, { color: themeHook.colors.text }]}>
                No bookings yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: themeHook.colors.textSecondary }]}>
                Your recent bookings will appear here
              </Text>
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
    marginBottom: theme.spacing.xs / 2,
  },
  subtitle: {
    ...theme.typography.body,
    fontSize: 14,
  },
  headerSettingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    ...theme.shadows.card,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  heroContentMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  heroMain: {
    flex: 1,
    minWidth: 120,
    flexShrink: 0,
  },
  heroLabel: {
    ...theme.typography.body,
    fontSize: 14,
    marginBottom: theme.spacing.xs,
    width: '100%',
  },
  heroValue: {
    ...theme.typography.display,
    fontSize: 36,
    fontWeight: '700',
    width: '100%',
    flexShrink: 1,
  },
  heroRatingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  heroRatingValueInline: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  heroRatingLabelInline: {
    ...theme.typography.caption,
    fontSize: 12,
  },
  heroChart: {
    flex: 1,
    maxWidth: 400,
    alignItems: 'flex-end',
    borderBottomWidth: 0,
  },
  chartHeader: {
    width: '100%',
    marginBottom: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  chartTitle: {
    ...theme.typography.caption,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
    textAlign: 'right',
  },
  timeRangePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeRangePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  timeRangePillActive: {
    ...theme.shadows.card,
  },
  timeRangePillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeRangePillTextActive: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 110,
    width: '100%',
    position: 'relative',
    borderBottomWidth: 0,
  },
  chartBaseline: {
    position: 'absolute',
    bottom: theme.spacing.xs + 11, // Align with label height
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  chartBarWrapper: {
    width: '100%',
    maxWidth: '100%',
    height: 85,
    justifyContent: 'flex-end',
    marginBottom: theme.spacing.xs,
  },
  chartBar: {
    width: '100%',
    minHeight: 2,
    borderRadius: theme.radii.md,
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
  },
  chartLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  tooltip: {
    position: 'absolute',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    minWidth: 90,
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  tooltipMonth: {
    ...theme.typography.caption,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tooltipAmount: {
    ...theme.typography.body,
    fontSize: 16,
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
  },
  heroMetrics: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  heroMetric: {
    flex: 1,
  },
  heroMetricLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  heroMetricValue: {
    ...theme.typography.h2,
    fontSize: 18,
    fontWeight: '600',
  },
  heroMetricDivider: {
    width: 1,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statCard: {
    flex: 1,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    ...theme.shadows.card,
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
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
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
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  seeAllText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    ...theme.shadows.card,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
    // Color is set via inline styles for theme support
  },
  bookingClient: {
    ...theme.typography.body,
    marginBottom: theme.spacing.xs,
    // Color is set via inline styles for theme support
  },
  bookingDate: {
    ...theme.typography.caption,
    // Color is set via inline styles for theme support
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
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
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  bookingRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
