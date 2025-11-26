import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../../services/payment';
import { bookingService } from '../../services/booking';

// Conditionally import Stripe hooks (native-only)
let useStripe: any = () => ({ initPaymentSheet: () => ({ error: null }), presentPaymentSheet: () => ({ error: { message: 'Stripe not available on web' } }) });
if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    useStripe = stripeModule.useStripe;
  } catch (e) {
    // Stripe not available
  }
}

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const stripe = useStripe();
  const { initPaymentSheet, presentPaymentSheet } = stripe;
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (bookingId) {
      initializePayment();
    }
  }, [bookingId]);

  const initializePayment = async () => {
    try {
      setLoading(true);
      
      // Get booking details
      const bookingData = await bookingService.getById(bookingId!);
      setBooking(bookingData);

      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent(bookingId!);
      const { clientSecret } = paymentIntent.data;

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Alyne',
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        router.back();
        return;
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error initializing payment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to initialize payment');
      router.back();
    }
  };

  const handlePayment = async () => {
    try {
      setProcessing(true);

      const { error } = await presentPaymentSheet();

      if (error) {
        Alert.alert('Payment Failed', error.message);
        setProcessing(false);
        return;
      }

      // Payment succeeded - confirm on backend
      const bookingData = await bookingService.getById(bookingId!);
      const payment = bookingData.payment;
      
      if (payment?.stripePaymentId) {
        await paymentService.confirmPayment(bookingId!, payment.stripePaymentId);
      }

      Alert.alert('Success', 'Payment completed successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/bookings'),
        },
      ]);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>{booking.service?.name || 'Service'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Provider</Text>
            <Text style={styles.summaryValue}>
              {booking.provider
                ? `${booking.provider.firstName} ${booking.provider.lastName}`
                : 'Provider'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date & Time</Text>
            <Text style={styles.summaryValue}>
              {new Date(booking.scheduledDate).toLocaleDateString()} at {booking.scheduledTime}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${booking.price.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="lock-closed" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            Your payment is secured by Stripe. We never store your card details.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay ${booking.price.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
    padding: 24,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  payButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

