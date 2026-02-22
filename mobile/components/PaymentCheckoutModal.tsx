import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal as RNModal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { paymentService } from '../services/payment';
import { bookingService } from '../services/booking';
import { useAuth } from '../hooks/useAuth';
import { usePaymentContext } from '../contexts/PaymentContext';
import { useTheme } from '../contexts/ThemeContext';
import { logger } from '../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';
import { formatTime12Hour } from '../utils/timeUtils';
import Constants from 'expo-constants';
import { ReceiptModal } from './ReceiptModal';
import { AlertModal } from './ui/AlertModal';

// Import React Stripe.js - Metro has resolution issues, so we'll load it conditionally
let useStripeNative: any = null;
let loadStripe: any = null;

// Load Stripe.js and React Stripe.js from CDN for web
const loadStripeWeb = async () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return false;
  }

  // Check if Stripe is already loaded
  if ((window as any).Stripe) {
    logger.debug('Stripe.js already loaded');
    loadStripe = (publishableKey: string, options?: any) => {
      return Promise.resolve((window as any).Stripe(publishableKey, options));
    };
    return true;
  }

  // Check if script is already being loaded
  const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/"]');
  if (existingScript) {
    logger.debug('Stripe.js script already exists, waiting for load...');
    // Wait for existing script to load
    return new Promise<boolean>((resolve) => {
      const checkStripe = setInterval(() => {
        if ((window as any).Stripe) {
          clearInterval(checkStripe);
          loadStripe = (publishableKey: string, options?: any) => {
            return Promise.resolve((window as any).Stripe(publishableKey, options));
          };
          logger.debug('Stripe.js loaded from existing script');
          resolve(true);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkStripe);
        resolve(false);
      }, 5000);
    });
  }

  logger.debug('Starting to load Stripe web modules from CDN...');

  try {
    // Load Stripe.js from CDN
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

    // Create loadStripe function using CDN Stripe
    if ((window as any).Stripe) {
      loadStripe = (publishableKey: string, options?: any) => {
        return Promise.resolve((window as any).Stripe(publishableKey, options));
      };
      logger.debug('Using CDN Stripe directly');
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

// Get Stripe publishable key
const getStripePublishableKey = () => {
  const fromConstants = Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY;
  if (fromConstants && fromConstants.length > 0) {
    return fromConstants;
  }

  const fromExpoPublic = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (fromExpoPublic && fromExpoPublic.length > 0) {
    return fromExpoPublic;
  }

  if (typeof process !== 'undefined' && process.env?.STRIPE_PUBLISHABLE_KEY) {
    return process.env.STRIPE_PUBLISHABLE_KEY;
  }

  const tempKey =
    'pk_test_51RYelyBXiGe9D9aVI7EnVtfXkVjcBQjXMO27YlqPLh75eoakeV7SznlwD8vGgGt0l0KNMecIq1FONed1q16k1PDj00mwHDXmn1';
  logger.warn('Using temporary hardcoded key - please fix .env loading');
  return tempKey;
};

const STRIPE_PUBLISHABLE_KEY = getStripePublishableKey();

// Web payment component using Stripe.js directly
function WebPaymentForm({
  clientSecret,
  booking,
  bookingId,
  onSuccess,
  stripeInstance,
  publishableKey,
  amount,
  onSubmitRef,
  hideButton = false,
  onError,
  onInvalidClientSecret,
  themeHook,
  isDark,
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
  onError?: (title: string, message: string) => void;
  onInvalidClientSecret?: () => void;
  themeHook?: any;
  isDark?: boolean;
}) {
  const [processing, setProcessing] = useState(false);
  const [elements, setElements] = useState<any>(null);
  const paymentElementRef = useRef<any>(null);
  const paymentElementInstanceRef = useRef<any>(null);
  const elementsInstanceRef = useRef<any>(null);
  const isInitializingRef = useRef(false);
  const lastClientSecretRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  const onInvalidClientSecretRef = useRef(onInvalidClientSecret);
  
  // Keep refs updated without triggering re-initialization
  useEffect(() => {
    onErrorRef.current = onError;
    onInvalidClientSecretRef.current = onInvalidClientSecret;
  }, [onError, onInvalidClientSecret]);

  // Initialize Stripe Elements when Stripe instance is ready
  useEffect(() => {
    // Only initialize if clientSecret changed or element doesn't exist
    if (Platform.OS === 'web' && stripeInstance && clientSecret && paymentElementRef.current) {
      // Skip if already initialized with the same clientSecret
      if (lastClientSecretRef.current === clientSecret && paymentElementInstanceRef.current) {
        logger.debug('Payment element already initialized with same clientSecret, skipping...');
        return;
      }

      // Prevent multiple simultaneous initializations
      if (isInitializingRef.current) {
        logger.debug('Payment element initialization already in progress, skipping...');
        return;
      }

      // Clean up previous element if clientSecret changed
      if (lastClientSecretRef.current !== clientSecret && paymentElementInstanceRef.current) {
        try {
          const element = paymentElementInstanceRef.current;
          try {
            element.unmount();
          } catch (e: any) {
            // Ignore unmount errors
          }
          paymentElementInstanceRef.current = null;
          elementsInstanceRef.current = null;
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      isInitializingRef.current = true;
      lastClientSecretRef.current = clientSecret;
      logger.debug('Initializing Stripe Elements directly...');

      const initializeElement = async () => {
        try {
          elementsInstanceRef.current = stripeInstance.elements({
            clientSecret,
            appearance: {
              theme: isDark ? 'night' : 'stripe',
              variables: {
                colorBackground: themeHook?.colors?.surface || '#ffffff',
                colorText: themeHook?.colors?.text || '#1e293b',
                colorDanger: themeHook?.colors?.error || '#dc2626',
                colorPrimary: themeHook?.colors?.primary || '#2563eb',
                borderRadius: '12px',
              },
            },
          });

          const paymentElement = elementsInstanceRef.current.create('payment');
          paymentElementInstanceRef.current = paymentElement;
          
          // Add error handler for payment element
          paymentElement.on('loaderror', (event: any) => {
            logger.error('Payment Element load error', event);
            const errorMessage = event.error?.message || '';
            const errorType = event.error?.type || '';
            
            // Check if it's an invalid client secret error
            if (errorType === 'invalid_request_error' && errorMessage.includes('client_secret')) {
              logger.warn('Invalid client secret detected, will retry with new payment intent');
              // Clear the refs and client secret to trigger re-initialization
              paymentElementInstanceRef.current = null;
              elementsInstanceRef.current = null;
              isInitializingRef.current = false;
              lastClientSecretRef.current = null;
              // Clear client secret to force new payment intent creation
              if (onInvalidClientSecretRef.current) {
                onInvalidClientSecretRef.current();
              }
              if (onErrorRef.current) {
                onErrorRef.current(
                  'Payment Form Error',
                  'The payment form expired. Please close and reopen the payment modal to try again.'
                );
              }
            } else {
              // Clear the refs on error so we can retry
              paymentElementInstanceRef.current = null;
              elementsInstanceRef.current = null;
              isInitializingRef.current = false;
              lastClientSecretRef.current = null;
              if (onErrorRef.current) {
                onErrorRef.current('Payment Form Error', errorMessage || 'Failed to load payment form. Please refresh the page and try again.');
              }
            }
          });

          // Wait a bit to ensure DOM element is ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (paymentElementRef.current && paymentElementInstanceRef.current) {
            paymentElementInstanceRef.current.mount(paymentElementRef.current);
            setElements(elementsInstanceRef.current);
            isInitializingRef.current = false;
          }
        } catch (error: any) {
          logger.error('Error initializing Stripe Elements', error);
          isInitializingRef.current = false;
          paymentElementInstanceRef.current = null;
          elementsInstanceRef.current = null;
          lastClientSecretRef.current = null;
          if (onErrorRef.current) {
            onErrorRef.current('Initialization Error', error.message || 'Failed to initialize payment form. Please try again.');
          }
        }
      };

      initializeElement();

      return () => {
        isInitializingRef.current = false;
        try {
          const element = paymentElementInstanceRef.current;
          if (element) {
            try {
              // Check if element is still mounted before unmounting
              element.unmount();
            } catch (unmountError: any) {
              // Element may already be destroyed, which is fine - ignore this specific error
              const errorMsg = unmountError?.message || '';
              if (!errorMsg.includes('already been destroyed') && !errorMsg.includes('destroyed')) {
                logger.debug('Error unmounting payment element (non-critical)', unmountError);
              }
            }
            paymentElementInstanceRef.current = null;
          }
          elementsInstanceRef.current = null;
        } catch (error: any) {
          // Ignore cleanup errors
          logger.debug('Cleanup error (non-critical)', error);
        }
      };
    }
  }, [stripeInstance, clientSecret, isDark, themeHook]);

  const handleSubmit = async (e: any) => {
    e?.preventDefault?.();

    if (!stripeInstance || !elements) {
      logger.debug('Stripe not ready', { stripe: !!stripeInstance, elements: !!elements });
      setErrorModal({
        visible: true,
        type: 'warning',
        title: 'Payment Form Not Ready',
        message: 'Payment form is not ready. Please wait a moment and try again.',
      });
      return;
    }

    setProcessing(true);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorModal({
          visible: true,
          type: 'error',
          title: 'Error',
          message: submitError.message,
        });
        setProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripeInstance.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url:
            typeof window !== 'undefined' ? window.location.origin + '/payment/success' : undefined,
        },
        redirect: 'if_required',
      });

      if (error) {
        if (onError) {
          onError('Payment Failed', error.message || 'Your payment could not be processed. Please try again.');
        } else {
          setErrorModal({
            visible: true,
            type: 'error',
            title: 'Payment Failed',
            message: error.message,
          });
        }
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        try {
          logger.info('Confirming payment on backend', {
            bookingId,
            paymentIntentId: paymentIntent.id,
          });
          const confirmedPayment = await paymentService.confirmPayment(bookingId, paymentIntent.id);
          logger.info('Payment confirmed on backend', { paymentId: confirmedPayment.id });
        } catch (confirmError: any) {
          logger.error('Error confirming payment on backend', confirmError);
          setErrorModal({
            visible: true,
            type: 'error',
            title: 'Backend Error',
            message: `Payment succeeded but failed to confirm on backend: ${confirmError.response?.data?.message || confirmError.message}`,
          });
        }

        onSuccess();
      }
    } catch (error: any) {
      logger.error('Error processing payment', error);
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to process payment';
      setProcessing(false); // Reset processing state immediately
      if (onError) {
        onError('Payment Error', errorMessage);
      } else {
        setErrorModal({
          visible: true,
          type: 'error',
          title: 'Error',
          message: errorMessage,
        });
      }
    } finally {
      setProcessing(false);
    }
  };

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
          style={[
            styles.stripeElementContainer,
            { 
              minHeight: 200,
              backgroundColor: themeHook?.colors?.surface || '#ffffff',
              borderColor: themeHook?.colors?.border || '#e2e8f0'
            }
          ]}
          ref={(el) => {
            if (Platform.OS === 'web' && el) {
              // Only update ref if it's different to avoid triggering re-initialization
              const domNode = (() => {
                if (typeof (el as any)._domNode !== 'undefined') {
                  return (el as any)._domNode;
                }
                const findDOMNode = (node: any): any => {
                  if (node && typeof node === 'object') {
                    if (node.nodeType === 1) return node;
                    if (node._domNode) return node._domNode;
                    if (node._nativeNode) return node._nativeNode;
                  }
                  return null;
                };
                return findDOMNode(el);
              })();
              
              if (domNode && paymentElementRef.current !== domNode) {
                paymentElementRef.current = domNode;
              }
            }
          }}
        />
      )}
      {!hideButton && (
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: themeHook?.colors?.primary || '#2563eb' },
            (!stripeInstance || !elements || processing) && styles.payButtonDisabled,
          ]}
          onPress={(e) => {
            e?.preventDefault?.();
            handleSubmit(e);
          }}
          disabled={!stripeInstance || !elements || processing}
        >
          {processing ? (
            <ActivityIndicator color={themeHook?.colors?.white || '#ffffff'} />
          ) : (
            <Text style={styles.payButtonText}>Pay ${amount.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

interface PaymentCheckoutModalProps {
  visible: boolean;
  bookingId: string | null;
  onClose: () => void;
}

export function PaymentCheckoutModal({ visible, bookingId, onClose }: PaymentCheckoutModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { theme: themeHook, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { startPayment, endPayment, isProcessing: globalIsProcessing, currentBookingId } = usePaymentContext();

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
  const [stripePaymentComplete, setStripePaymentComplete] = useState(false);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  // Native Stripe hooks
  const stripeNative = useStripeNative ? useStripeNative() : null;
  const initializingPaymentRef = useRef(false);
  const lastBookingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (visible && bookingId) {
      // Start payment processing (will allow retries for the same booking)
      if (!startPayment(bookingId)) {
        // Only block if a different booking is being processed
        setErrorModal({
          visible: true,
          title: 'Payment Already in Progress',
          message: 'Another payment for a different booking is currently being processed. Please wait for it to complete before starting a new payment.',
        });
        onClose();
        return;
      }
      
      // Only initialize if not already initializing and bookingId changed
      if (!initializingPaymentRef.current && lastBookingIdRef.current !== bookingId) {
        initializePayment();
      }
      // Initialize Stripe for web
      if (Platform.OS === 'web') {
        loadStripeWeb()
          .then((loaded) => {
            if (loaded) setStripeModulesLoaded(true);
          })
          .catch((error) => {
            console.error('Error in loadStripeWeb:', error);
          });
      }
    } else {
      // Reset state when modal closes
      if (!visible) {
        endPayment(); // End payment processing when modal closes
        initializingPaymentRef.current = false;
        lastBookingIdRef.current = null;
      }
      setBooking(null);
      setClientSecret(null);
      setStripeInstance(null);
      setStripeModulesLoaded(false);
      setPaymentAmounts(null);
      setStripePaymentComplete(false);
      setConnectedAccountId(null);
      setShowReceiptModal(false);
      setLoading(true);
      setProcessing(false);
    }
  }, [visible, bookingId, globalIsProcessing, currentBookingId, startPayment, endPayment, onClose]);

  // When Stripe.js is loaded and we know the connected account, create a scoped Stripe instance.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!stripeModulesLoaded) return;
    if (!connectedAccountId) return;
    if (stripeInstance) return;
    if (!loadStripe || !STRIPE_PUBLISHABLE_KEY) return;

    try {
      const promise = loadStripe(STRIPE_PUBLISHABLE_KEY, { stripeAccount: connectedAccountId });
      setStripePromise(promise);
      promise
        .then((stripeInst: any) => setStripeInstance(stripeInst))
        .catch((error: any) => console.error('Failed to create Stripe instance:', error));
    } catch (error: any) {
      console.error('Error creating Stripe instance:', error);
    }
  }, [stripeModulesLoaded, connectedAccountId, stripeInstance]);

  const initializePayment = async () => {
    if (!bookingId || initializingPaymentRef.current) return;

    initializingPaymentRef.current = true;
    lastBookingIdRef.current = bookingId;

    try {
      setLoading(true);

      const bookingData = await bookingService.getById(bookingId);
      setBooking(bookingData);

      if (bookingData.payment?.status === 'completed') {
        setLoading(false);
        initializingPaymentRef.current = false;
        onClose();
        return;
      }

      if (bookingData.status !== 'CONFIRMED') {
        const statusMessage = `This booking is ${bookingData.status.toLowerCase()}. Only confirmed bookings can be paid.`;
        setErrorModal({
          visible: true,
          type: 'warning',
          title: 'Cannot Pay',
          message: statusMessage,
        });
        setLoading(false);
        initializingPaymentRef.current = false;
        onClose();
        return;
      }

      // Clear any existing client secret before creating a new one
      setClientSecret(null);
      
      const paymentIntent = await paymentService.createPaymentIntent(bookingId);
      console.log('Payment intent response:', paymentIntent);

      const secret = paymentIntent?.clientSecret;
      const acctId = paymentIntent?.stripeAccountId;

      if (!secret) {
        console.error('No client secret found in payment intent:', paymentIntent);
        initializingPaymentRef.current = false;
        throw new Error('Payment intent created but no client secret returned');
      }
      if (Platform.OS === 'web' && !acctId) {
        initializingPaymentRef.current = false;
        throw new Error('Provider payout is not set up (missing connected account id)');
      }

      // Only set client secret if we're still initializing the same booking
      if (lastBookingIdRef.current === bookingId) {
        setClientSecret(secret);
        if (acctId) setConnectedAccountId(acctId);
      }

      const calculatedPlatformFee = paymentIntent.platformFee ?? bookingData.price * 0.075;
      const calculatedProviderAmount = paymentIntent.providerAmount ?? bookingData.price;
      const calculatedTotal =
        paymentIntent.amount ?? calculatedProviderAmount + calculatedPlatformFee;

      setPaymentAmounts({
        total: calculatedTotal,
        providerAmount: calculatedProviderAmount,
        platformFee: calculatedPlatformFee,
      });

      // Create Stripe instance scoped to the provider's connected account (Connect direct charge)
      if (Platform.OS === 'web' && stripeModulesLoaded && loadStripe && STRIPE_PUBLISHABLE_KEY && acctId) {
        try {
          const promise = loadStripe(STRIPE_PUBLISHABLE_KEY, { stripeAccount: acctId });
          setStripePromise(promise);
          promise
            .then((stripeInst: any) => {
              setStripeInstance(stripeInst);
            })
            .catch((error: any) => {
              console.error('Failed to create Stripe instance:', error);
            });
        } catch (error: any) {
          console.error('Error calling loadStripe:', error);
        }
      }

      if (Platform.OS !== 'web' && stripeNative) {
        const { initPaymentSheet } = stripeNative;
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: secret,
          merchantDisplayName: 'Alyne',
        });

        if (initError) {
          setErrorModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: initError.message,
          });
          onClose();
          return;
        }
      }

      setLoading(false);
      initializingPaymentRef.current = false;
    } catch (error: any) {
      logger.error('Error initializing payment', error);
      endPayment(); // End payment processing on error
      initializingPaymentRef.current = false;
      lastBookingIdRef.current = null;
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);

      setErrorModal({
        visible: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
      });
      setLoading(false);
      onClose();
    }
  };

  const handlePayment = async () => {
    // Check if another payment is processing
    if (globalIsProcessing && currentBookingId !== bookingId) {
      setErrorModal({
        visible: true,
        title: 'Payment Already in Progress',
        message: 'Another payment is currently being processed. Please wait for it to complete before starting a new payment.',
      });
      return;
    }
    
    if (Platform.OS !== 'web' && stripeNative) {
      try {
        setProcessing(true);
        const { presentPaymentSheet } = stripeNative;

        const { error } = await presentPaymentSheet();

        if (error) {
          setErrorModal({
            visible: true,
            title: 'Payment Failed',
            message: error.message || 'Your payment could not be processed. Please try again.',
          });
          setProcessing(false);
          return;
        }

        const bookingData = await bookingService.getById(bookingId!);
        const payment = bookingData.payment as { stripePaymentId?: string } | undefined;

        if (payment?.stripePaymentId) {
          try {
            await paymentService.confirmPayment(bookingId!, payment.stripePaymentId);
            console.log('Payment confirmed on backend');
          } catch (confirmError: any) {
            console.error('Error confirming payment on backend:', confirmError);
          }
        }

        handlePaymentSuccess();
      } catch (error: any) {
        console.error('Error processing payment:', error);
        endPayment(); // End payment processing on error
        setErrorModal({
          visible: true,
          title: 'Payment Error',
          message: error.response?.data?.message || error.message || 'Failed to process payment',
        });
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleStripePaymentSuccess = async () => {
    setStripePaymentComplete(true);
    handlePaymentSuccess();
  };

  const stripeSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const handlePayNow = async () => {
    if (!stripeSubmitRef.current) return;
    try {
      setProcessing(true);
      await stripeSubmitRef.current();
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = () => {
    // End payment processing when payment succeeds
    endPayment();
    
    // Show success message and receipt modal
    setErrorModal({
      visible: true,
      type: 'success',
      title: 'Success',
      message: 'Payment completed successfully!',
    });
    setShowReceiptModal(true);
  };

  if (user?.userType === 'PROVIDER') {
    return null;
  }

  return (
    <>
      <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.modalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
              >
                <View style={[
                  styles.modalContainer, 
                  { maxHeight: '90%', backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }
                ]}>
                {/* Close Button */}
                <TouchableOpacity 
                  style={[styles.closeButton, { backgroundColor: themeHook.colors.surfaceElevated }]} 
                  onPress={onClose}
                >
                  <Ionicons name="close" size={28} color={themeHook.colors.text} />
                </TouchableOpacity>

                {loading || !booking ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeHook.colors.primary} />
                  </View>
                ) : (
                  <>
                    <ScrollView
                      style={styles.scrollView}
                      contentContainerStyle={styles.contentContainer}
                      showsVerticalScrollIndicator={false}
                    >
                      {/* Header */}
                      <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                          <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Complete Payment</Text>
                        <View style={styles.backButton} />
                      </View>
                      <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />

                      <View style={[
                        styles.summaryCard,
                        { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border }
                      ]}>
                        <Text style={[styles.summaryTitle, { color: themeHook.colors.text }]}>Booking Summary</Text>

                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Service</Text>
                          <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                            {booking.service?.name || 'Service'}
                          </Text>
                        </View>

                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Provider</Text>
                          <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                            {booking.provider
                              ? `${booking.provider.firstName} ${booking.provider.lastName}`
                              : 'Provider'}
                          </Text>
                        </View>

                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Date & Time</Text>
                          <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                            {new Date(booking.scheduledDate).toLocaleDateString()} at{' '}
                            {formatTime12Hour(booking.scheduledTime)}
                          </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: themeHook.colors.border }]} />

                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Service Price</Text>
                          <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                            ${paymentAmounts?.providerAmount.toFixed(2) || booking.price.toFixed(2)}
                          </Text>
                        </View>

                        {paymentAmounts && (
                          <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: themeHook.colors.textSecondary }]}>Platform Fee (Alyne)</Text>
                            <Text style={[styles.summaryValue, { color: themeHook.colors.text }]}>
                              +${paymentAmounts.platformFee.toFixed(2)}
                            </Text>
                          </View>
                        )}

                        <View style={[styles.divider, { backgroundColor: themeHook.colors.border }]} />

                        <View style={styles.totalRow}>
                          <Text style={[styles.totalLabel, { color: themeHook.colors.text }]}>Total Amount Due</Text>
                          <Text style={[styles.totalAmount, { color: themeHook.colors.primary }]}>
                            ${paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)}
                          </Text>
                        </View>

                        {paymentAmounts && (
                          <View style={[
                            styles.paymentBreakdownCard,
                            { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }
                          ]}>
                            <Text style={[styles.breakdownTitle, { color: themeHook.colors.text }]}>Payment Breakdown</Text>
                            <View style={styles.breakdownRow}>
                              <Text style={[styles.breakdownLabel, { color: themeHook.colors.textSecondary }]}>Service Price</Text>
                              <Text style={[styles.breakdownValue, { color: themeHook.colors.text }]}>
                                ${paymentAmounts.providerAmount.toFixed(2)}
                              </Text>
                            </View>
                            <View style={styles.breakdownRow}>
                              <Text style={[styles.breakdownLabel, { color: themeHook.colors.textSecondary }]}>Platform Fee (Alyne)</Text>
                              <Text style={[styles.breakdownValue, { color: themeHook.colors.text }]}>
                                ${paymentAmounts.platformFee.toFixed(2)}
                              </Text>
                            </View>
                            <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeHook.colors.border }]}>
                              <Text style={[styles.breakdownLabel, { fontWeight: '600', color: themeHook.colors.text }]}>Total</Text>
                              <Text style={[styles.breakdownValue, { fontWeight: '600', color: themeHook.colors.primary }]}>
                                ${paymentAmounts.total.toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={[
                        styles.infoCard,
                        { backgroundColor: themeHook.colors.primaryLight || themeHook.colors.surface }
                      ]}>
                        <Ionicons name="lock-closed" size={20} color={themeHook.colors.primary} />
                        <Text style={[styles.infoText, { color: themeHook.colors.primary }]}>
                          Your payment is secured by Stripe. We never store your payment details.
                        </Text>
                      </View>

                      {/* Payment Form Section */}
                      {Platform.OS === 'web' &&
                      stripeModulesLoaded &&
                      stripeInstance &&
                      clientSecret ? (
                        <>
                          {!stripePaymentComplete && (
                            <View style={styles.paymentFormSection}>
                              <WebPaymentForm
                                clientSecret={clientSecret}
                                booking={booking}
                                bookingId={bookingId!}
                                onSuccess={handleStripePaymentSuccess}
                                stripeInstance={stripeInstance}
                                publishableKey={STRIPE_PUBLISHABLE_KEY}
                                amount={paymentAmounts?.total || 0}
                                onSubmitRef={stripeSubmitRef}
                                hideButton={true}
                                themeHook={themeHook}
                                isDark={isDark}
                                onError={(title, message) => {
                                  setProcessing(false);
                                  setErrorModal({ visible: true, type: 'error', title, message });
                                }}
                                onInvalidClientSecret={() => {
                                  // Clear client secret to force creation of new payment intent
                                  setClientSecret(null);
                                  logger.debug('Client secret cleared due to invalid secret error');
                                }}
                              />
                            </View>
                          )}

                          {/* Pay Now Button */}
                          {!stripePaymentComplete ? (
                            <>
                              <TouchableOpacity
                                style={[
                                  styles.payButton,
                                  { backgroundColor: themeHook.colors.primary },
                                  (processing || !stripeInstance) && styles.payButtonDisabled,
                                ]}
                                onPress={handlePayNow}
                                disabled={processing || !stripeInstance}
                              >
                                {processing ? (
                                  <ActivityIndicator color={themeHook.colors.white} />
                                ) : (
                                  <Text style={styles.payButtonText}>
                                    Pay ${paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)}
                                  </Text>
                                )}
                              </TouchableOpacity>

                              {processing && (
                                <View style={[
                                  styles.paymentStatus,
                                  { backgroundColor: themeHook.colors.primaryLight || themeHook.colors.surface }
                                ]}>
                                  <ActivityIndicator size="small" color={themeHook.colors.primary} />
                                  <Text style={[styles.paymentStatusText, { color: themeHook.colors.primary }]}>
                                    Processing payment...
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            /* Payment Complete */
                            <View style={[
                              styles.paymentStatus,
                              { backgroundColor: themeHook.colors.surface }
                            ]}>
                              <Ionicons name="checkmark-circle" size={24} color={themeHook.colors.success || '#16A34A'} />
                              <Text style={[styles.paymentStatusText, { color: themeHook.colors.success || '#16A34A' }]}>
                                Payment completed successfully!
                              </Text>
                            </View>
                          )}
                        </>
                      ) : Platform.OS === 'web' ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color={themeHook.colors.primary} />
                          <Text style={[styles.loadingText, { color: themeHook.colors.textSecondary }]}>
                            {(() => {
                              const reasons = [];
                              if (!stripeModulesLoaded) reasons.push('Loading Stripe modules...');
                              if (!stripeInstance) reasons.push('Initializing Stripe...');
                              if (!clientSecret) reasons.push('Preparing payment...');
                              return reasons[0] || 'Loading payment form...';
                            })()}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.payButton,
                            { backgroundColor: themeHook.colors.primary },
                            processing && styles.payButtonDisabled
                          ]}
                          onPress={handlePayment}
                          disabled={processing}
                        >
                          {processing ? (
                            <ActivityIndicator color={themeHook.colors.white} />
                          ) : (
                            <Text style={styles.payButtonText}>
                              Pay ${paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </>
                )}
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Receipt Modal */}
      <ReceiptModal
        visible={showReceiptModal}
        bookingId={bookingId}
        onClose={() => {
          setShowReceiptModal(false);
          onClose();
        }}
      />

      {/* Error Modal */}
      <AlertModal
        visible={errorModal.visible}
        onClose={() => {
          setErrorModal({ visible: false, type: 'error', title: '', message: '' });
          // Reset all loading states when error modal is closed
          setProcessing(false);
        }}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
        buttonText={errorModal.type === 'success' ? 'OK' : 'Try Again'}
      />
    </>
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
    borderRadius: 24,
    borderWidth: 3.5,
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
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerDivider: {
    height: 1,
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
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
  divider: {
    height: 1,
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
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  paymentFormSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  payButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
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
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 200,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  paymentBreakdownCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
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
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentStatus: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  paymentStepCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  paymentStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentStepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentStepNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  paymentStepComplete: {
    backgroundColor: '#16A34A',
  },
  paymentStepInfo: {
    flex: 1,
  },
  paymentStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentStepAmount: {
    fontSize: 14,
    color: '#64748b',
  },
});
