import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { formatTime12Hour } from '../../utils/timeUtils';
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
  
  logger.debug('Starting to load Stripe web modules from CDN...');
  
  try {
    // Load Stripe.js from CDN
    if (!(window as any).Stripe) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = () => {
          logger.debug('Stripe.js CDN script loaded');
          resolve();
        };
        script.onerror = () => {
          logger.error('Failed to load Stripe.js from CDN');
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
      logger.debug('Using CDN Stripe directly');
      
      logger.debug('Stripe.js loaded successfully', {
        hasLoadStripe: !!loadStripe,
        hasElements: !!Elements,
        hasPaymentElement: !!PaymentElement,
      });
      return true;
    }
    
    return false;
  } catch (e: any) {
    logger.error('Failed to load Stripe.js from CDN', e);
    return false;
  }
};

// Native: Use Stripe React Native (loaded at module level)
if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    useStripeNative = stripeModule.useStripe;
  } catch (e) {
    logger.warn('Stripe React Native not available');
  }
}

// Get Stripe publishable key - check multiple sources
const getStripePublishableKey = () => {
  // Try Constants first (from app.config.js) - this is the main source
  const fromConstants = Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY;
  if (fromConstants && fromConstants.length > 0) {
    logger.debug('Stripe key found in Constants.expoConfig.extra');
    return fromConstants;
  }
  
  // Try EXPO_PUBLIC_ prefix (Expo convention for public env vars)
  const fromExpoPublic = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (fromExpoPublic && fromExpoPublic.length > 0) {
    logger.debug('Stripe key found in EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    return fromExpoPublic;
  }
  
  // Try process.env (for web, might not work at runtime)
  if (typeof process !== 'undefined' && process.env?.STRIPE_PUBLISHABLE_KEY) {
    logger.debug('Stripe key found in process.env');
    return process.env.STRIPE_PUBLISHABLE_KEY;
  }
  
  // TEMPORARY: Hardcode for testing (from your backend .env)
  // TODO: Fix .env loading and remove this
  const tempKey = 'pk_test_51RYelyBXiGe9D9aVI7EnVtfXkVjcBQjXMO27YlqPLh75eoakeV7SznlwD8vGgGt0l0KNMecIq1FONed1q16k1PDj00mwHDXmn1';
  logger.warn('Using temporary hardcoded key - please fix .env loading');
  return tempKey;
};

const STRIPE_PUBLISHABLE_KEY = getStripePublishableKey();

// Web payment component using Stripe.js directly (no React Stripe.js)
// Plaid Link initialization - exposes handler via window for parent to access
function initializePlaidLink(linkToken: string, onSuccess: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Check if Plaid script is already loaded
    if ((window as any).Plaid) {
      createPlaidHandler(linkToken, onSuccess);
    } else {
      // Load Plaid Link from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).Plaid) {
          createPlaidHandler(linkToken, onSuccess);
        }
      };
      script.onerror = () => {
        logger.error('Failed to load Plaid Link script');
        alert('Failed to load payment system. Please refresh the page.');
      };
      document.body.appendChild(script);
    }
  }
}

function createPlaidHandler(linkToken: string, onSuccess: () => void) {
  if ((window as any).Plaid && linkToken) {
    try {
      const handler = (window as any).Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string, metadata: any) => {
            logger.info('Plaid payment successful', { publicToken, metadata });
          // The payment is automatically processed by Plaid Payment Initiation
          onSuccess();
        },
        onExit: (err: any, metadata: any) => {
            logger.debug('Plaid exit', { err, metadata });
          if (err) {
            const errorMsg = err.error_message || err.message || 'Unknown error';
            alert(`Payment error: ${errorMsg}`);
          }
        },
        onEvent: (eventName: string, metadata: any) => {
            logger.debug('Plaid event', { eventName, metadata });
        },
      });
      (window as any).plaidHandler = handler;
    } catch (error: any) {
      logger.error('Error initializing Plaid', error);
      alert(`Failed to initialize payment: ${error.message || 'Unknown error'}`);
    }
  }
}

function WebPaymentForm({ 
  clientSecret, 
  booking, 
  bookingId, 
  onSuccess,
  stripeInstance,
  publishableKey,
  amount,
  onSubmitRef,
  hideButton = false
}: { 
  clientSecret: string; 
  booking: any; 
  bookingId: string;
  onSuccess: () => void;
  stripeInstance: any;
  publishableKey: string;
  amount: number;
  onSubmitRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  hideButton?: boolean;
}) {
  const [processing, setProcessing] = useState(false);
  const [elements, setElements] = useState<any>(null);
  const paymentElementRef = useRef<any>(null);

  // Initialize Stripe Elements when Stripe instance is ready
  useEffect(() => {
    if (Platform.OS === 'web' && stripeInstance && clientSecret && paymentElementRef.current) {
      logger.debug('Initializing Stripe Elements directly...');
      
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
      logger.debug('Stripe not ready', { stripe: !!stripeInstance, elements: !!elements });
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
          logger.info('Confirming payment on backend', { bookingId, paymentIntentId: paymentIntent.id });
          const confirmedPayment = await paymentService.confirmPayment(bookingId, paymentIntent.id);
          logger.info('Payment confirmed on backend', { paymentId: confirmedPayment.id });
        } catch (confirmError: any) {
          logger.error('Error confirming payment on backend', confirmError);
          logger.error('Error details', {
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
      logger.error('Error processing payment', error);
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

  // Expose submit function via ref
  useEffect(() => {
    if (onSubmitRef) {
      onSubmitRef.current = async () => {
        await handleSubmit(null);
      };
    }
  }, [stripeInstance, elements, clientSecret, bookingId, onSuccess, onSubmitRef]);

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
      {!hideButton && (
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
            <Text style={styles.payButtonText}>Pay ${amount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  
  // Redirect providers - they don't make payments
  useEffect(() => {
    if (user?.userType === 'PROVIDER') {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, router]);
  
  if (user?.userType === 'PROVIDER') {
    return null;
  }
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [stripeModulesLoaded, setStripeModulesLoaded] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<{
    total: number;
    providerAmount: number;
    platformFee: number;
  } | null>(null);
  const [requiresPlaidPayment, setRequiresPlaidPayment] = useState(false);
  const [stripePaymentComplete, setStripePaymentComplete] = useState(false);
  const [plaidPaymentComplete, setPlaidPaymentComplete] = useState(false);
  
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
      logger.debug('Web platform detected, loading Stripe modules...');
      logger.debug('STRIPE_PUBLISHABLE_KEY check', {
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
          logger.debug('Stripe.js CDN loaded result', loaded);
          if (loaded && loadStripe && STRIPE_PUBLISHABLE_KEY) {
            // Initialize Stripe instance
            logger.debug('Initializing Stripe instance...');
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

      // Create payment intent (platform fee only)
      const paymentIntent = await paymentService.createPaymentIntent(bookingId!);
      console.log('Payment intent response:', paymentIntent);
      
      // Handle different response structures
      const secret = paymentIntent?.clientSecret;
      
      if (!secret) {
        console.error('No client secret found in payment intent:', paymentIntent);
        throw new Error('Payment intent created but no client secret returned');
      }
      
      setClientSecret(secret);
      
      // Store payment amounts for fee breakdown display
      // Calculate platform fee if not provided (fallback to 7.5%)
      const calculatedPlatformFee = paymentIntent.platformFee ?? (bookingData.price * 0.075);
      const calculatedProviderAmount = paymentIntent.providerAmount ?? bookingData.price;
      const calculatedTotal = paymentIntent.amount ?? (calculatedProviderAmount + calculatedPlatformFee);
      
      setPaymentAmounts({
        total: calculatedTotal,
        providerAmount: calculatedProviderAmount,
        platformFee: calculatedPlatformFee,
      });
      
      // Check if Plaid payment is required
      // Note: Plaid Transfer API is used (not Payment Initiation), so no link token needed
      // The transfer will be processed automatically after Stripe payment succeeds
      if (paymentIntent.requiresPlaidPayment) {
        setRequiresPlaidPayment(true);
      }

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
      logger.error('Error initializing payment', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      
      if (Platform.OS === 'web') {
        alert(`${errorTitle}: ${errorMessage}`);
      } else {
        Alert.alert(errorTitle, errorMessage);
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

  const handleStripePaymentSuccess = async () => {
    // Stripe payment (platform fee) completed
    setStripePaymentComplete(true);
    
    // Automatically process Plaid transfer to provider (no user interaction needed)
    if (requiresPlaidPayment && !plaidPaymentComplete) {
      try {
        console.log('Automatically processing Plaid transfer to provider...');
        await paymentService.processProviderPayment(bookingId!);
        setPlaidPaymentComplete(true);
        console.log('Plaid transfer completed automatically');
      } catch (error: any) {
        console.error('Error processing Plaid transfer:', error);
        // Don't block the flow - Stripe payment succeeded
        // Show error but still allow completion
        if (Platform.OS === 'web') {
          alert(`Platform fee paid, but provider payment failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
        } else {
          Alert.alert('Provider Payment Error', `Platform fee paid, but provider payment failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
        }
      }
    }
    
    // Both payments complete (or only Stripe needed)
    if (!requiresPlaidPayment || plaidPaymentComplete) {
      handlePaymentSuccess();
    }
  };

  // Unified payment handler - initiates Stripe payment, then auto-processes Plaid
  const handleUnifiedPayment = async () => {
    if (Platform.OS === 'web') {
      setProcessing(true);
      
      // Submit Stripe payment form
      // After Stripe succeeds, handleStripePaymentSuccess will auto-process Plaid
      if (stripeSubmitRef.current) {
        stripeSubmitRef.current().catch((error) => {
          console.error('Stripe payment error:', error);
          setProcessing(false);
          if (Platform.OS === 'web') {
            alert(`Payment failed: ${error.message || 'Unknown error'}`);
          } else {
            Alert.alert('Payment Failed', error.message || 'Unknown error');
          }
        });
      } else {
        setProcessing(false);
        alert('Payment form is not ready. Please wait a moment and try again.');
      }
    } else {
      // For native, use existing flow
      handlePayment();
    }
  };

  const stripeSubmitRef = useRef<(() => Promise<void>) | null>(null);

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
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.headerDivider} />
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
              {new Date(booking.scheduledDate).toLocaleDateString()} at {formatTime12Hour(booking.scheduledTime)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Payment Breakdown */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Price</Text>
            <Text style={styles.summaryValue}>
              ${paymentAmounts?.providerAmount.toFixed(2) || booking.price.toFixed(2)}
            </Text>
          </View>

          {paymentAmounts && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee (Alyne)</Text>
              <Text style={styles.summaryValue}>+${paymentAmounts.platformFee.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount Due</Text>
            <Text style={styles.totalAmount}>
              ${paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)}
            </Text>
          </View>

          {requiresPlaidPayment && paymentAmounts && (
            <View style={styles.paymentBreakdownCard}>
              <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Platform Fee (Stripe)</Text>
                <Text style={styles.breakdownValue}>
                  ${paymentAmounts.platformFee.toFixed(2)}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Provider Payment (Plaid)</Text>
                <Text style={styles.breakdownValue}>
                  ${paymentAmounts.providerAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="lock-closed" size={20} color="#2563eb" />
          <Text style={styles.infoText}>
            Your payments are secured by Stripe and Plaid. We never store your payment details.
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
            <>
              {/* Stripe Payment Form - visible for card entry (only if no saved payment method) */}
              {!stripePaymentComplete && (
                <WebPaymentForm
                  clientSecret={clientSecret}
                  booking={booking}
                  bookingId={bookingId!}
                  onSuccess={handleStripePaymentSuccess}
                  stripeInstance={stripeInstance}
                  publishableKey={STRIPE_PUBLISHABLE_KEY}
                  amount={paymentAmounts?.platformFee || 0}
                  onSubmitRef={stripeSubmitRef}
                  hideButton={true}
                />
              )}
              
              {/* Unified Pay Now Button */}
              {!stripePaymentComplete && !plaidPaymentComplete && (
                <TouchableOpacity
                  style={[styles.payButton, (processing || !stripeInstance) && styles.payButtonDisabled]}
                  onPress={handleUnifiedPayment}
                  disabled={processing || !stripeInstance}
                >
                  {processing ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.payButtonText}>
                      Pay ${paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              
              {/* Show status while processing */}
              {processing && (
                <View style={styles.paymentStatus}>
                  <Text style={styles.paymentStatusText}>
                    {!stripePaymentComplete 
                      ? 'Processing platform fee...' 
                      : requiresPlaidPayment && !plaidPaymentComplete
                      ? 'Processing provider payment...'
                      : 'Payment completed!'}
                  </Text>
                  {requiresPlaidPayment && (
                    <Text style={[styles.paymentStatusText, { fontSize: 12, marginTop: 4 }]}>
                      Platform fee: {stripePaymentComplete ? '✓' : '...'} | Provider payment: {plaidPaymentComplete ? '✓' : '...'}
                    </Text>
                  )}
                </View>
              )}
            </>
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
                <Text style={styles.payButtonText}>
                  Pay ${paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)}
                </Text>
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
    paddingHorizontal: 24,
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
  paymentSection: {
    marginBottom: 24,
  },
  paymentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentSectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  paymentBreakdownCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatus: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
  },
});

