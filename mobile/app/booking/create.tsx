import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { providerService, ProviderDetail, Service } from '../../services/provider';
import { bookingService, CreateBookingData } from '../../services/booking';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';

export default function CreateBookingScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const modal = useModal();
  
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

  useEffect(() => {
    if (providerId) {
      loadProvider();
    }
  }, [providerId]);

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
        message: 'Booking request sent!',
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

  // Generate time slots (simplified - in real app, use provider availability)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  if (isLoading || !provider) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Session</Text>
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
        {/* Header (scrolls with content) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Session</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerDivider} />

        {/* Provider Info */}
        <View style={styles.providerCard}>
          <Text style={styles.providerName}>{provider.name}</Text>
          {selectedService && (
            <Text style={styles.serviceName}>{selectedService.name}</Text>
          )}
        </View>

        {/* Service Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Service</Text>
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
                  selectedService?.id === service.id && styles.serviceOptionSelected,
                ]}
                onPress={() => setSelectedService(service)}
              >
                <View style={styles.serviceOptionContent}>
                  <Text style={styles.serviceOptionName}>{service.name}</Text>
                  <Text style={styles.serviceOptionDetails}>
                    {service.duration} min • ${service.price}/session
                  </Text>
                </View>
                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
                )}
              </TouchableOpacity>
            ));
          })()}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Calendar
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: '#2563eb',
              },
            }}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              todayTextColor: '#2563eb',
              arrowColor: '#2563eb',
              selectedDayBackgroundColor: '#2563eb',
            }}
          />
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.timeSlots}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotSelected,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.timeSlotTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any special requirements or notes..."
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Booking Summary */}
        {selectedService && selectedDate && selectedTime && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{selectedService.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>
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
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration:</Text>
              <Text style={styles.summaryValue}>{selectedService.duration} minutes</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryTotalValue}>
                ${selectedService.price}/session
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedService || !selectedDate || !selectedTime || isSubmitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={() => {
            console.log('Button pressed!');
            handleCreateBooking();
          }}
          disabled={!selectedService || !selectedDate || !selectedTime || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {!selectedService || !selectedDate || !selectedTime
                ? 'Book Session'
                : 'Request Booking'}
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
  providerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  serviceOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  serviceOptionContent: {
    flex: 1,
  },
  serviceOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  serviceOptionDetails: {
    fontSize: 14,
    color: '#64748b',
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
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

