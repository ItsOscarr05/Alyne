import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { providerService, ProviderDetail } from '../../services/provider';
import { bookingService, BookingDetail } from '../../services/booking';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { generateTimeSlots, getDayOfWeek, formatTime12Hour } from '../../utils/timeUtils';

export default function RescheduleBookingScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const modal = useModal();

  // Redirect providers - they can't reschedule
  useEffect(() => {
    if (user?.userType === 'PROVIDER' && id) {
      router.replace(`/booking/${id}`);
    }
  }, [user, router, id]);

  if (user?.userType === 'PROVIDER') {
    return null;
  }

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    setIsLoading(true);
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
      modal.showAlert({
        title: 'Error',
        message: 'Failed to load booking details',
        type: 'error',
        onButtonPress: () => router.back(),
      });
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

  if (isLoading || !booking || !provider) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule Booking</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule Booking</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerDivider} />

        {/* Current vs New Comparison */}
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>Reschedule Details</Text>
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonSection}>
              <Text style={styles.comparisonLabel}>Current Schedule</Text>
              <Text style={styles.comparisonValue}>
                {currentDate ? formatDate(currentDate) : 'N/A'}
              </Text>
              <Text style={styles.comparisonValue}>
                {currentTime ? formatTime12Hour(currentTime) : 'N/A'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#64748b" style={styles.arrowIcon} />
            <View style={styles.comparisonSection}>
              <Text style={styles.comparisonLabel}>New Schedule</Text>
              <Text style={styles.comparisonValue}>
                {selectedDate ? formatDate(selectedDate) : 'Select date'}
              </Text>
              <Text style={styles.comparisonValue}>
                {selectedTime ? formatTime12Hour(selectedTime) : 'Select time'}
              </Text>
            </View>
          </View>
        </View>

        {/* Provider Info */}
        <View style={styles.providerCard}>
          <Text style={styles.providerName}>
            {provider.name}
          </Text>
          {booking.service && (
            <Text style={styles.serviceName}>{booking.service.name}</Text>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select New Date</Text>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setSelectedTime(''); // Reset time when date changes
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#2563eb',
                },
                ...(currentDate && currentDate !== selectedDate
                  ? {
                      [currentDate]: {
                        marked: true,
                        dotColor: '#64748b',
                      },
                    }
                  : {}),
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                todayTextColor: '#2563eb',
                arrowColor: '#2563eb',
                selectedDayBackgroundColor: '#2563eb',
              }}
            />
          </View>
          {currentDate && (
            <Text style={styles.hintText}>
              Gray dot indicates current booking date
            </Text>
          )}
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select New Time</Text>
            {timeSlots.length === 0 ? (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
                <Text style={styles.noSlotsText}>
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
                      selectedTime === time && styles.timeSlotSelected,
                      currentTime === time && styles.timeSlotCurrent,
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        selectedTime === time && styles.timeSlotTextSelected,
                        currentTime === time && styles.timeSlotTextCurrent,
                      ]}
                    >
                      {formatTime12Hour(time)}
                    </Text>
                    {currentTime === time && (
                      <Text style={styles.currentLabel}>(Current)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Booking Summary */}
        {selectedDate && selectedTime && booking.service && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>New Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{booking.service.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>New Date:</Text>
              <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>New Time:</Text>
              <Text style={styles.summaryValue}>{formatTime12Hour(selectedTime)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>{booking.service.duration} minutes</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedDate || !selectedTime || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleReschedule}
          disabled={!selectedDate || !selectedTime || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
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
    paddingHorizontal: 16,
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  arrowIcon: {
    marginHorizontal: 16,
  },
  providerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  providerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#64748b',
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
  calendarContainer: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2563eb',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  hintText: {
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeSlotCurrent: {
    borderColor: '#64748b',
    borderStyle: 'dashed',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
  timeSlotTextCurrent: {
    color: '#64748b',
  },
  currentLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

