import { useState, useEffect, useRef } from 'react';
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
import Constants from 'expo-constants';

// Import React Stripe.js - Metro has resolution issues, so we'll load it conditionally
// We can't use ES6 import (Metro can't find it) and require() resolves to wrong package
// Solution: Load it dynamically in useEffect for web only
let useStripe: any = null;
let useStripeNative: any = null;
let Elements: any = null;
let PaymentElement: any = null;
let useElements: any = null;
let loadStripe: any = null;

// Load Stripe.js and React Stripe.js from CDN for web
// Metro's web bundler has issues resolving @stripe/react-stripe-js correctly
const loadStripeWeb = async () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }
  
  console.log('Starting to load Stripe web modules from CDN...');
  
  try {
    // Load Stripe.js from CDN
    if (!(window as any).Stripe) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
          console.log('Stripe.js CDN script loaded');
          resolve();
        };
        script.onerror = () => {
          console.error('Failed to load Stripe.js from CDN');
          reject(new Error('Failed to load Stripe.js'));
        };
        document.head.appendChild(script);
      });
    }
    
    // Note: React Stripe.js will be loaded in useEffect
    // Metro's web bundler has issues resolving it at module level
    
    // Create loadStripe function using CDN Stripe
    if ((window as any).Stripe) {
      // Use CDN Stripe directly (more reliable than require for web)
      loadStripe = (publishableKey: string) => {
        return Promise.resolve((window as any).Stripe(publishableKey));
      };
      console.log('Using CDN Stripe directly');
      
      console.log('Stripe.js loaded successfully:', {
        hasLoadStripe: !!loadStripe,
        hasElements: !!Elements,
        hasPaymentElement: !!PaymentElement,
      });
      return true;
    }
    
    return false;
  } catch (e: any) {
    console.error('Failed to load Stripe.js from CDN:', e);
    return false;
  }
};

// Native: Use Stripe React Native (loaded at module level)
if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    useStripeNative = stripeModule.useStripe;
  } catch (e) {
    console.warn('Stripe React Native not available');
  }
}

// Get Stripe publishable key - check multiple sources
const getStripePublishableKey = () => {
  // Try Constants first (from app.config.js) - this is the main source
  const fromConstants = Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY;
  if (fromConstants && fromConstants.length > 0) {
    console.log('Stripe key found in Constants.expoConfig.extra');
    return fromConstants;
  }
  
  // Try EXPO_PUBLIC_ prefix (Expo convention for public env vars)
  const fromExpoPublic = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (fromExpoPublic && fromExpoPublic.length > 0) {
    console.log('Stripe key found in EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    return fromExpoPublic;
  }
  
  // Try process.env (for web, might not work at runtime)
  if (typeof process !== 'undefined' && process.env?.STRIPE_PUBLISHABLE_KEY) {
    console.log('Stripe key found in process.env');
    return process.env.STRIPE_PUBLISHABLE_KEY;
  }
  
  // TEMPORARY: Hardcode for testing (from your backend .env)
  // TODO: Fix .env loading and remove this
  const tempKey = 'pk_test_51RYelyBXiGe9D9aVI7EnVtfXkVjcBQjXMO27YlqPLh75eoakeV7SznlwD8vGgGt0l0KNMecIq1FONed1q16k1PDj00mwHDXmn1';
  console.warn('Using temporary hardcoded key - please fix .env loading');
  return tempKey;
};

const STRIPE_PUBLISHABLE_KEY = getStripePublishableKey();

// Web payment component using Stripe.js directly (no React Stripe.js)
function WebPaymentForm({ 
  clientSecret, 
  booking, 
  bookingId, 
  onSuccess,
  stripeInstance,
  publishableKey
}: { 
  clientSecret: string; 
  booking: any; 
  bookingId: string;
  onSuccess: () => void;
  stripeInstance: any;
  publishableKey: string;
}) {
  const [processing, setProcessing] = useState(false);
  const [elements, setElements] = useState<any>(null);
  const paymentElementRef = useRef<any>(null);

  // Initialize Stripe Elements when Stripe instance is ready
  useEffect(() => {
    if (Platform.OS === 'web' && stripeInstance && clientSecret && paymentElementRef.current) {
      console.log('Initializing Stripe Elements directly...');
      
      // Create Elements instance
      const elementsInstance = stripeInstance.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
        },
      });

      // Create and mount PaymentElement
      const paymentElement = elementsInstance.create('payment');
      paymentElement.mount(paymentElementRef.current);

      setElements(elementsInstance);

      return () => {
        // Cleanup
        if (paymentElement) {
          paymentElement.unmount();
        }
      };
    }
  }, [stripeInstance, clientSecret]);

  const handleSubmit = async (e: any) => {
    e?.preventDefault?.();
    
    if (!stripeInstance || !elements) {
      console.log('Stripe not ready:', { stripe: !!stripeInstance, elements: !!elements });
      if (Platform.OS === 'web') {
        alert('Payment form is not ready. Please wait a moment and try again.');
      }
      return;
    }

    setProcessing(true);

    try {
      // Submit the form
      const { error: submitError } = await elements.submit();
      if (submitError) {
        if (Platform.OS === 'web') {
          alert(`Error: ${submitError.message}`);
        } else {
          Alert.alert('Error', submitError.message);
        }
        setProcessing(false);
        return;
      }

      // Confirm payment
      const { error, paymentIntent } = await stripeInstance.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: typeof window !== 'undefined' ? window.location.origin + '/payment/success' : undefined,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (Platform.OS === 'web') {
          alert(`Payment failed: ${error.message}`);
        } else {
          Alert.alert('Payment Failed', error.message);
        }
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirm payment on backend using the payment intent ID from Stripe
        try {
          console.log('Confirming payment on backend:', { bookingId, paymentIntentId: paymentIntent.id });
          const confirmedPayment = await paymentService.confirmPayment(bookingId, paymentIntent.id);
          console.log('Payment confirmed on backend:', confirmedPayment);
        } catch (confirmError: any) {
          console.error('Error confirming payment on backend:', confirmError);
          console.error('Error details:', {
            message: confirmError.message,
            response: confirmError.response?.data,
            status: confirmError.response?.status,
          });
          if (Platform.OS === 'web') {
            alert(`Payment succeeded but failed to confirm on backend: ${confirmError.response?.data?.message || confirmError.message}`);
          } else {
            Alert.alert('Backend Error', `Payment succeeded but failed to confirm on backend: ${confirmError.response?.data?.message || confirmError.message}`);
          }
          // Still call onSuccess since payment succeeded on Stripe
        }

        onSuccess();
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process payment';
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.paymentForm}>
      {Platform.OS === 'web' && (
        <View 
          style={[styles.stripeElementContainer, { minHeight: 200 }]}
          ref={(el) => {
            if (Platform.OS === 'web' && el && typeof (el as any)._domNode !== 'undefined') {
              // React Native Web exposes _domNode
              paymentElementRef.current = (el as any)._domNode;
            } else if (Platform.OS === 'web' && el) {
              // Fallback: try to find the DOM node
              const findDOMNode = (node: any): any => {
                if (node && typeof node === 'object') {
                  if (node.nodeType === 1) return node; // Element node
                  if (node._domNode) return node._domNode;
                  if (node._nativeNode) return node._nativeNode;
                }
                return null;
              };
              paymentElementRef.current = findDOMNode(el);
            }
          }}
        />
      )}
      <TouchableOpacity
        style={[styles.payButton, (!stripeInstance || !elements || processing) && styles.payButtonDisabled]}
        onPress={(e) => {
          e?.preventDefault?.();
          handleSubmit(e);
        }}
        disabled={!stripeInstance || !elements || processing}
      >
        {processing ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.payButtonText}>Pay ${booking.price.toFixed(2)}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [stripeModulesLoaded, setStripeModulesLoaded] = useState(false);
  
  // Native Stripe hooks
  const stripeNative = useStripeNative ? useStripeNative() : null;

  useEffect(() => {
    if (bookingId) {
      initializePayment();
    }
  }, [bookingId]);

  // Initialize Stripe for web - load modules dynamically
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('Web platform detected, loading Stripe modules...');
      console.log('STRIPE_PUBLISHABLE_KEY check:', {
        hasKey: !!STRIPE_PUBLISHABLE_KEY,
        keyLength: STRIPE_PUBLISHABLE_KEY?.length,
        keyPreview: STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
        fromConstants: !!Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY,
        constantsValue: Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...',
        allConstants: Object.keys(Constants.expoConfig?.extra || {}),
      });
      
      // Load Stripe.js from CDN (we'll use it directly, no React Stripe.js needed)
      loadStripeWeb()
        .then((loaded) => {
          console.log('Stripe.js CDN loaded result:', loaded);
          if (loaded && loadStripe && STRIPE_PUBLISHABLE_KEY) {
            // Initialize Stripe instance
            console.log('Initializing Stripe instance...');
            try {
              const promise = loadStripe(STRIPE_PUBLISHABLE_KEY);
              setStripePromise(promise);
              promise
                .then((stripeInst: any) => {
                  console.log('Stripe instance created successfully:', !!stripeInst);
                  setStripeInstance(stripeInst);
                  // Mark as loaded - we don't need React Stripe.js, we'll use Stripe.js directly
                  setStripeModulesLoaded(true);
                })
                .catch((error: any) => {
                  console.error('Failed to create Stripe instance:', error);
                });
            } catch (error: any) {
              console.error('Error calling loadStripe:', error);
            }
          }
        })
        .catch((error) => {
          console.error('Error in loadStripeWeb:', error);
        });
    }
  }, []);

  const initializePayment = async () => {
    try {
      setLoading(true);
      
      // Get booking details
      const bookingData = await bookingService.getById(bookingId!);
      setBooking(bookingData);

      // Check if payment already completed
      if (bookingData.payment?.status === 'completed') {
        setLoading(false);
        // Redirect to receipt automatically
        router.replace(`/payment/receipt?bookingId=${bookingId}`);
        return;
      }

      // Check booking status
      if (bookingData.status !== 'CONFIRMED') {
        const statusMessage = `This booking is ${bookingData.status.toLowerCase()}. Only confirmed bookings can be paid.`;
        if (Platform.OS === 'web') {
          alert(statusMessage);
        } else {
          Alert.alert('Cannot Pay', statusMessage);
        }
        setLoading(false);
        router.back();
        return;
      }

      // Create payment intent
      const paymentIntent = await paymentService.createPaymentIntent(bookingId!);
      console.log('Payment intent response:', paymentIntent);
      
      // Handle different response structures
      const secret = paymentIntent?.data?.clientSecret || paymentIntent?.clientSecret;
      
      if (!secret) {
        console.error('No client secret found in payment intent:', paymentIntent);
        throw new Error('Payment intent created but no client secret returned');
      }
      
      setClientSecret(secret);

      // For native: Initialize payment sheet
      if (Platform.OS !== 'web' && stripeNative) {
        const { initPaymentSheet } = stripeNative;
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: secret,
          merchantDisplayName: 'Alyne',
        });

        if (initError) {
          if (Platform.OS === 'web') {
            alert(`Error: ${initError.message}`);
          } else {
            Alert.alert('Error', initError.message);
          }
          router.back();
          return;
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error initializing payment:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        bookingId: bookingId,
      });
      
      // Extract more detailed error message
      let errorMessage = 'Failed to initialize payment';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (Platform.OS === 'web') {
        alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
      setLoading(false);
      router.back();
    }
  };

  const handlePayment = async () => {
    // Native payment flow
    if (Platform.OS !== 'web' && stripeNative) {
      try {
        setProcessing(true);
        const { presentPaymentSheet } = stripeNative;

        const { error } = await presentPaymentSheet();

        if (error) {
          Alert.alert('Payment Failed', error.message);
          setProcessing(false);
          return;
        }

        // Payment succeeded - confirm on backend
        // Get the payment intent ID from the booking's payment record
        const bookingData = await bookingService.getById(bookingId!);
        const payment = bookingData.payment;
        
        if (payment?.stripePaymentId) {
          try {
            await paymentService.confirmPayment(bookingId!, payment.stripePaymentId);
            console.log('Payment confirmed on backend');
          } catch (confirmError: any) {
            console.error('Error confirming payment on backend:', confirmError);
            // Don't fail the whole flow if backend confirmation fails
          }
        } else {
          console.warn('No stripePaymentId found in payment record');
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
    }
    // Web payment is handled by WebPaymentForm component
  };

  const handlePaymentSuccess = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Payment completed successfully! View receipt?')) {
        router.replace(`/payment/receipt?bookingId=${bookingId}`);
      } else {
        router.replace('/(tabs)/bookings');
      }
    } else {
      Alert.alert('Success', 'Payment completed successfully!', [
        {
          text: 'View Receipt',
          onPress: () => router.replace(`/payment/receipt?bookingId=${bookingId}`),
        },
        {
          text: 'Done',
          style: 'cancel',
          onPress: () => router.replace('/(tabs)/bookings'),
        },
      ]);
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
        <ScrollView 
          style={styles.footerScrollView}
          contentContainerStyle={styles.footerScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {Platform.OS === 'web' && stripeModulesLoaded && stripeInstance && clientSecret ? (
            <WebPaymentForm
              clientSecret={clientSecret}
              booking={booking}
              bookingId={bookingId!}
              onSuccess={handlePaymentSuccess}
              stripeInstance={stripeInstance}
              publishableKey={STRIPE_PUBLISHABLE_KEY}
            />
          ) : Platform.OS === 'web' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loadingText}>
                {(() => {
                  const reasons = [];
                  if (!stripeModulesLoaded) reasons.push('Loading Stripe modules...');
                  if (!stripeInstance) reasons.push('Initializing Stripe...');
                  if (!clientSecret) reasons.push('Preparing payment...');
                  return reasons[0] || 'Loading payment form...';
                })()}
              </Text>
              {/* Debug info */}
              {__DEV__ && (
                <Text style={[styles.loadingText, { fontSize: 10, marginTop: 8 }]}>
                  Debug: modules={stripeModulesLoaded ? '✓' : '✗'} stripe={stripeInstance ? '✓' : '✗'} secret={clientSecret ? '✓' : '✗'}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.payButtonText}>Pay ${booking.price.toFixed(2)}</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
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
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    maxHeight: '50%',
    flex: 1,
  },
  footerScrollView: {
    flex: 1,
  },
  footerScrollContent: {
    padding: 24,
    paddingBottom: 40,
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
  paymentForm: {
    width: '100%',
  },
  stripeElementContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

