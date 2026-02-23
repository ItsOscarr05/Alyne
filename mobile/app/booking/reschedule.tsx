import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { providerService, ProviderDetail } from '../../services/provider';
import { bookingService, BookingDetail } from '../../services/booking';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { generateTimeSlots, getDayOfWeek, formatTime12Hour } from '../../utils/timeUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';

export default function RescheduleBookingScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id as string | undefined;
  const router = useRouter();
  const { user } = useAuth();
  const modal = useModal();
  const { theme: themeHook } = useTheme();
  const insets = useSafeAreaInsets();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (id) {
      router.replace(`/booking/${id}`);
    }
  };

  // Redirect providers - they can't reschedule
  useEffect(() => {
    if (user?.userType === 'PROVIDER' && id) {
      router.replace(`/booking/${id}`);
    }
  }, [user, router, id]);

  useEffect(() => {
    if (id) {
      loadData();
    } else {
      setIsLoading(false);
      setLoadError('No booking ID provided.');
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      // Load booking data
      const bookingData = await bookingService.getById(id);
      setBooking(bookingData);

      // Pre-populate with current booking date/time
      if (bookingData.scheduledDate) {
        const date = new Date(bookingData.scheduledDate);
        const dateString = date.toISOString().split('T')[0];
        setSelectedDate(dateString);
      }
      if (bookingData.scheduledTime) {
        setSelectedTime(bookingData.scheduledTime);
      }

      // Load provider data for availability
      if (bookingData.providerId) {
        const providerData = await providerService.getById(bookingData.providerId);
        setProvider(providerData);
      }
    } catch (error: any) {
      logger.error('Error loading booking data', error);
      setLoadError(getUserFriendlyError(error) || 'Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!id || !selectedDate || !selectedTime) {
      modal.showAlert({
        title: 'Error',
        message: 'Please select a new date and time',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await bookingService.reschedule(id, selectedDate, selectedTime);
      
      logger.info('Booking rescheduled successfully', { bookingId: id });
      
      modal.showAlert({
        title: 'Success',
        message: 'Booking rescheduled successfully!',
        type: 'success',
        onButtonPress: () => {
          router.replace(`/booking/${id}`);
        },
      });
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.replace(`/booking/${id}`);
      }, 1500);
    } catch (error: any) {
      logger.error('Error rescheduling booking', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      modal.showAlert({
        title: errorTitle,
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time slots based on provider availability for selected date
  const getAvailableTimeSlots = () => {
    if (!provider || !selectedDate) {
      return [];
    }

    const dayOfWeek = getDayOfWeek(selectedDate);
    const matchingSlots = provider.availability.filter(slot => {
      if (slot.specificDate) {
        const specificDate = new Date(slot.specificDate);
        const selectedDateObj = new Date(selectedDate + 'T00:00:00');
        return specificDate.toDateString() === selectedDateObj.toDateString();
      } else if (slot.isRecurring) {
        return slot.dayOfWeek === dayOfWeek;
      }
      return false;
    });

    if (matchingSlots.length === 0) {
      return [];
    }

    // Generate slots for all matching availability periods
    const allSlots: string[] = [];
    matchingSlots.forEach(slot => {
      const slots = generateTimeSlots(slot.startTime, slot.endTime, 30);
      allSlots.push(...slots);
    });

    // Remove duplicates and sort
    return [...new Set(allSlots)].sort((a, b) => a.localeCompare(b));
  };

  const timeSlots = getAvailableTimeSlots();

  // Format date for display
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get current booking date/time for comparison
  const currentDate = booking?.scheduledDate
    ? (() => {
        const date = new Date(booking.scheduledDate);
        return date.toISOString().split('T')[0];
      })()
    : '';
  const currentTime = booking?.scheduledTime || '';

  // Redirect providers (render nothing while redirecting)
  if (user?.userType === 'PROVIDER') {
    return null;
  }

  if (isLoading) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : insets.top}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Reschedule Booking</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeHook.colors.primary} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (loadError || !booking || !provider) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : insets.top}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Reschedule Booking</Text>
          <View style={styles.backButton} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        <View style={[styles.loadingContainer, { paddingHorizontal: 24 }]}>
          <Ionicons name="alert-circle-outline" size={48} color={themeHook.colors.textTertiary} style={{ marginBottom: 16 }} />
          <Text style={[styles.errorTitle, { color: themeHook.colors.text }]}>{!id ? 'Booking ID missing' : 'Unable to load booking'}</Text>
          <Text style={[styles.errorMessage, { color: themeHook.colors.textSecondary }]}>
            {loadError || 'This booking may have been cancelled or the link may be incorrect.'}
          </Text>
          {id && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: themeHook.colors.primary }]}
              onPress={() => loadData()}
            >
              <Text style={[styles.retryButtonText, { color: themeHook.colors.white }]}>Try again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.backLinkButton} onPress={handleBack}>
            <Text style={[styles.backLinkText, { color: themeHook.colors.primary }]}>Back to booking</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : insets.top}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Reschedule Booking</Text>
          <View style={styles.backButton} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />

        {/* Current vs New Comparison */}
        <View style={[styles.comparisonCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.comparisonTitle, { color: themeHook.colors.text }]}>Reschedule Details</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonLabel, { color: themeHook.colors.textSecondary }]}>Current Schedule</Text>
              <Text style={[styles.comparisonValue, { color: themeHook.colors.text }]}>
                {currentDate ? formatDate(currentDate) : 'N/A'}
              </Text>
              <Text style={[styles.comparisonValue, { color: themeHook.colors.text }]}>
                {currentTime ? formatTime12Hour(currentTime) : 'N/A'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color={themeHook.colors.textSecondary} style={styles.arrowIcon} />
            <View style={styles.comparisonSection}>
              <Text style={[styles.comparisonLabel, { color: themeHook.colors.textSecondary }]}>New Schedule</Text>
              <Text style={[styles.comparisonValue, { color: themeHook.colors.text }]}>
                {selectedDate ? formatDate(selectedDate) : 'Select date'}
              </Text>
              <Text style={[styles.comparisonValue, { color: themeHook.colors.text }]}>
                {selectedTime ? formatTime12Hour(selectedTime) : 'Select time'}
              </Text>
            </View>
          </View>
        </View>

        {/* Provider Info */}
        <View style={[styles.providerCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.providerName, { color: themeHook.colors.text }]}>
            {provider.name}
          </Text>
          {booking.service && (
            <Text style={[styles.serviceName, { color: themeHook.colors.textSecondary }]}>{booking.service.name}</Text>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select New Date</Text>
          <View style={[styles.calendarContainer, { borderColor: themeHook.colors.primary, backgroundColor: themeHook.colors.surface }]}>
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setSelectedTime(''); // Reset time when date changes
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: themeHook.colors.primary,
                },
                ...(currentDate && currentDate !== selectedDate
                  ? {
                      [currentDate]: {
                        marked: true,
                        dotColor: themeHook.colors.textSecondary,
                      },
                    }
                  : {}),
              }}
              minDate={new Date().toISOString().split('T')[0]}
              renderArrow={(direction) => (
                <Ionicons
                  name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
                  size={20}
                  color={themeHook.colors.primary}
                />
              )}
              theme={{
                backgroundColor: themeHook.colors.surface,
                calendarBackground: themeHook.colors.surface,
                textSectionTitleColor: themeHook.colors.text,
                selectedDayBackgroundColor: themeHook.colors.primary,
                selectedDayTextColor: themeHook.colors.white,
                todayTextColor: themeHook.colors.primary,
                dayTextColor: themeHook.colors.text,
                textDisabledColor: themeHook.colors.textTertiary,
                dotColor: themeHook.colors.primary,
                selectedDotColor: themeHook.colors.white,
                arrowColor: themeHook.colors.primary,
                monthTextColor: themeHook.colors.text,
                indicatorColor: themeHook.colors.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '500',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
            />
          </View>
          {currentDate && (
            <Text style={[styles.hintText, { color: themeHook.colors.textSecondary }]}>
              Gray dot indicates current booking date
            </Text>
          )}
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select New Time</Text>
            {timeSlots.length === 0 ? (
              <View style={[styles.noSlotsContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
                <Ionicons name="calendar-outline" size={48} color={themeHook.colors.textTertiary} />
                <Text style={[styles.noSlotsText, { color: themeHook.colors.textSecondary }]}>
                  No available time slots for this date
                </Text>
              </View>
            ) : (
              <View style={styles.timeSlots}>
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border },
                      selectedTime === time && { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primary },
                      currentTime === time && { borderColor: themeHook.colors.textSecondary, borderStyle: 'dashed' },
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        { color: themeHook.colors.text },
                        selectedTime === time && { color: themeHook.colors.white },
                        currentTime === time && { color: themeHook.colors.textSecondary },
                      ]}
                    >
                      {formatTime12Hour(time)}
                    </Text>
                    {currentTime === time && (
                      <Text style={[styles.currentLabel, { color: themeHook.colors.textSecondary }]}>(Current)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Booking Summary */}
        {selectedDate && selectedTime && booking.service && (
          <View style={[styles.summaryCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
            <Text style={[styles.summaryTitle, { color: themeHook.colors.text }]}>New Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Service:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{booking.service.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>New Date:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{formatDate(selectedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>New Time:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{formatTime12Hour(selectedTime)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Duration:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{booking.service.duration} minutes</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { backgroundColor: themeHook.colors.surface, borderTopColor: themeHook.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: themeHook.colors.primary },
            (!selectedDate || !selectedTime || isSubmitting) && { backgroundColor: themeHook.colors.textTertiary, opacity: 0.6 },
          ]}
          onPress={handleReschedule}
          disabled={!selectedDate || !selectedTime || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={themeHook.colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Confirm Reschedule</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal */}
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
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerDivider: {
    height: 1,
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonSection: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  arrowIcon: {
    marginHorizontal: 16,
  },
  providerCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  providerName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  calendarContainer: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  timeSlotSelected: {},
  timeSlotCurrent: {},
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotTextSelected: {},
  timeSlotTextCurrent: {},
  currentLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noSlotsText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {},
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backLinkButton: {
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

