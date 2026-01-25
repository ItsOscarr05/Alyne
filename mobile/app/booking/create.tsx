import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { providerService, ProviderDetail, Service } from '../../services/provider';
import { bookingService, CreateBookingData, BookingDetail } from '../../services/booking';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { generateTimeSlots, getDayOfWeek, formatTime12Hour } from '../../utils/timeUtils';
import { useTheme } from '../../contexts/ThemeContext';

export default function CreateBookingScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const modal = useModal();
  const themeHook = useTheme();
  const insets = useSafeAreaInsets();
  
  // Redirect providers - they can't create bookings
  useEffect(() => {
    if (user?.userType === 'PROVIDER') {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, router]);
  
  if (user?.userType === 'PROVIDER') {
    return null;
  }
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<BookingDetail[]>([]);

  useEffect(() => {
    if (providerId) {
      loadProvider();
    }
  }, [providerId]);

  // Fetch existing bookings for the provider when date changes
  useEffect(() => {
    if (providerId && selectedDate) {
      loadExistingBookings();
    } else {
      setExistingBookings([]);
    }
  }, [providerId, selectedDate]);

  const loadProvider = async () => {
    if (!providerId) return;

    setIsLoading(true);
    try {
      const data = await providerService.getById(providerId);
      setProvider(data);
      // Auto-select first service if available
      if (data.services && data.services.length > 0) {
        setSelectedService(data.services[0]);
      }
    } catch (error: any) {
      console.error('Error loading provider:', error);
      modal.showAlert({
        title: 'Error',
        message: 'Failed to load provider details',
        type: 'error',
        onButtonPress: () => router.back(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingBookings = async () => {
    if (!providerId || !selectedDate) return;

    try {
      // Fetch all bookings for the provider
      const bookings = await bookingService.getMyBookings(undefined, 'provider');
      
      // Filter bookings for the selected date and provider
      const selectedDateObj = new Date(selectedDate + 'T00:00:00');
      const filteredBookings = bookings.filter(booking => {
        if (booking.providerId !== providerId) return false;
        if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') return false;
        
        const bookingDate = new Date(booking.scheduledDate);
        return bookingDate.toDateString() === selectedDateObj.toDateString();
      });

      setExistingBookings(filteredBookings);
    } catch (error: any) {
      logger.error('Error loading existing bookings', error);
      // Don't show error to user, just log it - filtering will still work
      setExistingBookings([]);
    }
  };

  const handleCreateBooking = async () => {
    logger.debug('handleCreateBooking called', {
      providerId,
      selectedService: selectedService?.id,
      selectedDate,
      selectedTime,
    });

    if (!providerId || !selectedService || !selectedDate || !selectedTime) {
      logger.warn('Validation failed - missing required fields');
      modal.showAlert({
        title: 'Error',
        message: 'Please fill in all required fields',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      logger.debug('Creating booking', {
        providerId,
        serviceId: selectedService.id,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
      });

      const bookingData: CreateBookingData = {
        providerId,
        serviceId: selectedService.id,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        notes: notes || undefined,
      };

      const result = await bookingService.create(bookingData);
      logger.info('Booking created successfully', { bookingId: result.id });
      
      // Show success message
      modal.showAlert({
        title: 'Success',
        message: 'Booking confirmed!',
        type: 'success',
        onButtonPress: () => {
          router.replace('/(tabs)/bookings');
        },
      });
      
      // Navigate directly after a short delay (works on both web and native)
      setTimeout(() => {
        router.replace('/(tabs)/bookings');
      }, 1500);
    } catch (error: any) {
      logger.error('Error creating booking', error);
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
  // Filter out slots that conflict with existing bookings
  const getAvailableTimeSlots = () => {
    if (!provider || !selectedDate) {
      // Default slots if no provider or date selected
      return generateTimeSlots('09:00', '17:00', 30);
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
      return []; // No availability for this date
    }

    // Generate slots for all matching availability periods
    const allSlots: string[] = [];
    matchingSlots.forEach(slot => {
      const slots = generateTimeSlots(slot.startTime, slot.endTime, 30);
      allSlots.push(...slots);
    });

    // Remove duplicates and sort
    const uniqueSlots = [...new Set(allSlots)].sort((a, b) => a.localeCompare(b));

    // Filter out slots that conflict with existing bookings
    if (existingBookings.length === 0 || !selectedService) {
      return uniqueSlots;
    }

    const serviceDuration = selectedService.duration;
    const availableSlots = uniqueSlots.filter(slot => {
      const [slotHour, slotMinute] = slot.split(':').map(Number);
      const slotStartMinutes = slotHour * 60 + slotMinute;
      const slotEndMinutes = slotStartMinutes + serviceDuration;

      // Check if this slot conflicts with any existing booking
      const hasConflict = existingBookings.some(booking => {
        const [bookingHour, bookingMinute] = booking.scheduledTime.split(':').map(Number);
        const bookingStartMinutes = bookingHour * 60 + bookingMinute;
        const bookingDuration = booking.service?.duration || 30; // Default to 30 if not available
        const bookingEndMinutes = bookingStartMinutes + bookingDuration;

        // Check if time ranges overlap
        return (
          (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes)
        );
      });

      return !hasConflict;
    });

    return availableSlots;
  };

  const timeSlots = getAvailableTimeSlots();

  if (isLoading || !provider) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Book Session</Text>
          <View style={styles.backButton} />
        </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeHook.colors.primary} />
          </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : insets.top}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) }]}>
        {/* Header (scrolls with content) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Book Session</Text>
          <View style={styles.backButton} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />

        {/* Provider Info */}
        <View style={[styles.providerCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.providerName, { color: themeHook.colors.text }]}>{provider.name}</Text>
          {selectedService && (
            <Text style={[styles.serviceName, { color: themeHook.colors.textSecondary }]}>{selectedService.name}</Text>
          )}
        </View>

        {/* Service Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select Service</Text>
          {(() => {
            // Remove potential duplicates (e.g., from seeding or syncing)
            const seenIds = new Set<string>();
            const seenKeys = new Set<string>();
            const uniqueServices = provider.services.filter((service) => {
              if (seenIds.has(service.id)) return false;
              seenIds.add(service.id);

              const key = `${service.name}|${service.price}|${service.duration}`;
              if (seenKeys.has(key)) return false;
              seenKeys.add(key);

              return true;
            });

            return uniqueServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceOption,
                  { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border },
                  selectedService?.id === service.id && { borderColor: themeHook.colors.primary, backgroundColor: themeHook.colors.primaryLight },
                ]}
                onPress={() => setSelectedService(service)}
              >
                <View style={styles.serviceOptionContent}>
                  <Text style={[styles.serviceOptionName, { color: themeHook.colors.text }]}>{service.name}</Text>
                  <Text style={[styles.serviceOptionDetails, { color: themeHook.colors.textSecondary }]}>
                    {service.duration} min • ${service.price}/session
                  </Text>
                </View>
                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark-circle" size={24} color={themeHook.colors.primary} />
                )}
              </TouchableOpacity>
            ));
          })()}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select Date</Text>
          <View style={[styles.calendarContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: themeHook.colors.primary,
                },
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
                todayTextColor: themeHook.colors.primary,
                arrowColor: themeHook.colors.primary,
                selectedDayBackgroundColor: themeHook.colors.primary,
                backgroundColor: themeHook.colors.surface,
                calendarBackground: themeHook.colors.surface,
                textSectionTitleColor: themeHook.colors.text,
                dayTextColor: themeHook.colors.text,
                monthTextColor: themeHook.colors.text,
                textDayFontWeight: '400',
                textMonthFontWeight: '600',
                textDayHeaderFontWeight: '600',
                textDisabledColor: themeHook.colors.textTertiary,
              }}
            />
          </View>
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select Time</Text>
            <View style={styles.timeSlots}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border },
                    selectedTime === time && { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primary },
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      { color: themeHook.colors.text },
                      selectedTime === time && { color: themeHook.colors.white },
                    ]}
                  >
                    {formatTime12Hour(time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border, color: themeHook.colors.text }]}
            placeholder="Add any special requirements or notes..."
            placeholderTextColor={themeHook.colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Booking Summary */}
        {selectedService && selectedDate && selectedTime && (
          <View style={[styles.summaryCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
            <Text style={[styles.summaryTitle, { color: themeHook.colors.text }]}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Service:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{selectedService.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Date:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                {(() => {
                  // Parse date string (YYYY-MM-DD) without timezone conversion
                  const [year, month, day] = selectedDate.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                })()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Time:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{formatTime12Hour(selectedTime)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Duration:</Text>
              <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>{selectedService.duration} minutes</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal, { borderTopColor: themeHook.colors.border }]}>
              <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Total:</Text>
              <Text style={[styles.summaryTotalValue, { color: themeHook.colors.primary }]}>
                ${selectedService.price}/session
              </Text>
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
            (!selectedService || !selectedDate || !selectedTime || isSubmitting) &&
              { backgroundColor: themeHook.colors.buttonDisabledBackground || themeHook.colors.textTertiary },
          ]}
          onPress={handleCreateBooking}
          disabled={!selectedService || !selectedDate || !selectedTime || isSubmitting}
          activeOpacity={(!selectedService || !selectedDate || !selectedTime || isSubmitting) ? 1 : 0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={themeHook.colors.white} />
          ) : (
            <Text style={[
              styles.submitButtonText,
              { color: (!selectedService || !selectedDate || !selectedTime) ? themeHook.colors.textSecondary : themeHook.colors.white }
            ]}>
              Book Session
            </Text>
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
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 2,
  },
  serviceOptionSelected: {
  },
  serviceOptionContent: {
    flex: 1,
  },
  serviceOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceOptionDetails: {
    fontSize: 14,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotSelected: {
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotTextSelected: {
  },
  notesInput: {
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 20,
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
  summaryTotal: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
  submitButtonDisabled: {
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

