import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal as RNModal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { providerService, ProviderDetail, Service } from '../services/provider';
import { bookingService, CreateBookingData, BookingDetail } from '../services/booking';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './ui/AlertModal';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { generateTimeSlots, getDayOfWeek, isTimeSlotAvailable, formatTime12Hour } from '../utils/timeUtils';

interface CreateBookingModalProps {
  visible: boolean;
  providerId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateBookingModal({
  visible,
  providerId,
  onClose,
  onSuccess,
}: CreateBookingModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const modal = useModal();
  const themeHook = useTheme();
  const insets = useSafeAreaInsets();

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<BookingDetail[]>([]);

  useEffect(() => {
    if (visible && providerId) {
      loadProvider();
    } else {
      // Reset state when modal closes
      setProvider(null);
      setSelectedService(null);
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      setIsLoading(true);
      setIsSubmitting(false);
      setExistingBookings([]);
    }
  }, [visible, providerId]);

  // Fetch existing bookings for the provider when date changes
  useEffect(() => {
    if (visible && providerId && selectedDate) {
      loadExistingBookings();
    } else {
      setExistingBookings([]);
    }
  }, [visible, providerId, selectedDate]);

  const loadProvider = async () => {
    if (!providerId) return;

    setIsLoading(true);
    try {
      const data = await providerService.getById(providerId);
      setProvider(data);
    } catch (error: any) {
      console.error('Error loading provider:', error);
      modal.showAlert({
        title: 'Error',
        message: 'Failed to load provider details',
        type: 'error',
        onButtonPress: () => onClose(),
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
          onClose();
          if (onSuccess) {
            onSuccess();
          } else {
            router.replace('/(tabs)/bookings');
          }
        },
      });

      // Navigate directly after a short delay (works on both web and native)
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
          router.replace('/(tabs)/bookings');
        }
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
    return [...new Set(allSlots)].sort((a, b) => a.localeCompare(b));
  };

  const timeSlots = getAvailableTimeSlots();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            >
              <View style={[styles.modalContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary, maxHeight: '90%' }]}>
              {/* Close Button */}
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: themeHook.colors.surfaceElevated }]} onPress={onClose}>
                <Ionicons name="close" size={28} color={themeHook.colors.text} />
              </TouchableOpacity>

              {isLoading || !provider ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={themeHook.colors.primary} />
                </View>
              ) : (
                <>
                  <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Header */}
                    <View style={styles.header}>
                      <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Book Session</Text>
                      <View style={styles.backButton} />
                    </View>
                    <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />

                    {/* Provider Info */}
                    <View style={[styles.providerCard, { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.primary }]}>
                      <Text style={[styles.providerName, { color: themeHook.colors.text }]}>{provider.name}</Text>
                      {selectedService && (
                        <Text style={[styles.serviceName, { color: themeHook.colors.textSecondary }]}>{selectedService.name}</Text>
                      )}
                    </View>

                    {/* Service Selection */}
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select Service</Text>
                      <View style={styles.serviceGrid}>
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
                                { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border },
                                selectedService?.id === service.id && { borderColor: themeHook.colors.primary, backgroundColor: themeHook.colors.primaryLight },
                              ]}
                              onPress={() => {
                                // Toggle selection: if already selected, deselect; otherwise select
                                if (selectedService?.id === service.id) {
                                  setSelectedService(null);
                                } else {
                                  setSelectedService(service);
                                }
                              }}
                            >
                              <View style={styles.serviceOptionHeader}>
                                <Text style={[styles.serviceOptionName, { color: themeHook.colors.text }]}>{service.name}</Text>
                                {selectedService?.id === service.id && (
                                  <Ionicons name="checkmark-circle" size={24} color={themeHook.colors.primary} />
                                )}
                              </View>
                              <Text style={[styles.serviceOptionDetails, { color: themeHook.colors.textSecondary }]}>
                                {service.duration} min • ${service.price}/session
                              </Text>
                            </TouchableOpacity>
                          ));
                        })()}
                      </View>
                    </View>

                    {/* Date Selection */}
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Select Date</Text>
                      <View style={[styles.calendarContainer, { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.primary }]}>
                        <Calendar
                          onDayPress={(day: { dateString: string }) => {
                            // Toggle selection: if already selected, deselect; otherwise select
                            if (selectedDate === day.dateString) {
                              setSelectedDate('');
                              setSelectedTime(''); // Also clear time when date is deselected
                            } else {
                              setSelectedDate(day.dateString);
                              setSelectedTime(''); // Clear time when date changes
                            }
                          }}
                          markedDates={
                            selectedDate
                              ? {
                                  [selectedDate]: {
                                    selected: true,
                                    selectedColor: themeHook.colors.primary,
                                  },
                                }
                              : {}
                          }
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
                            backgroundColor: themeHook.colors.surfaceElevated,
                            calendarBackground: themeHook.colors.surfaceElevated,
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
                                { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border },
                                selectedTime === time && { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primary },
                              ]}
                              onPress={() => {
                                // Toggle selection: if already selected, deselect; otherwise select
                                if (selectedTime === time) {
                                  setSelectedTime('');
                                } else {
                                  setSelectedTime(time);
                                }
                              }}
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
                        style={[styles.notesInput, { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border, color: themeHook.colors.text }]}
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
                      <View style={[styles.summaryCard, { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.primary }]}>
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
                          <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                            {selectedService.duration} minutes
                          </Text>
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
                </>
              )}

              {/* Alert Modal */}
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
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92.5%',
    maxWidth: 600,
    height: '90%',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: '#2563eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceOption: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    minHeight: 100,
  },
  serviceOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  serviceOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  serviceOptionContent: {
    flex: 1,
    width: '100%',
  },
  serviceOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  serviceOptionDetails: {
    fontSize: 13,
    color: '#64748b',
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
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    width: '31%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  timeSlotTextSelected: {
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
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
  summaryTotal: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
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
