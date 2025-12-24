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
  Modal as RNModal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '../services/payment';
import { bookingService } from '../services/booking';
import { plaidService } from '../services/plaid';
import { useAuth } from '../hooks/useAuth';
import { usePaymentContext } from '../contexts/PaymentContext';
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

    // Create loadStripe function using CDN Stripe
    if ((window as any).Stripe) {
      loadStripe = (publishableKey: string) => {
        return Promise.resolve((window as any).Stripe(publishableKey));
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
}) {
  const [processing, setProcessing] = useState(false);
  const [elements, setElements] = useState<any>(null);
  const paymentElementRef = useRef<any>(null);

  // Initialize Stripe Elements when Stripe instance is ready
  useEffect(() => {
    if (Platform.OS === 'web' && stripeInstance && clientSecret && paymentElementRef.current) {
      logger.debug('Initializing Stripe Elements directly...');

      const elementsInstance = stripeInstance.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
        },
      });

      const paymentElement = elementsInstance.create('payment');
      paymentElement.mount(paymentElementRef.current);

      setElements(elementsInstance);

      return () => {
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
          if (Platform.OS === 'web') {
            alert(`Payment failed: ${error.message}`);
          } else {
            Alert.alert('Payment Failed', error.message);
          }
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
          if (Platform.OS === 'web') {
            alert(
              `Payment succeeded but failed to confirm on backend: ${confirmError.response?.data?.message || confirmError.message}`
            );
          } else {
            Alert.alert(
              'Backend Error',
              `Payment succeeded but failed to confirm on backend: ${confirmError.response?.data?.message || confirmError.message}`
            );
          }
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
        if (Platform.OS === 'web') {
          alert(`Error: ${errorMessage}`);
        } else {
          Alert.alert('Error', errorMessage);
        }
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
          style={[styles.stripeElementContainer, { minHeight: 200 }]}
          ref={(el) => {
            if (Platform.OS === 'web' && el && typeof (el as any)._domNode !== 'undefined') {
              paymentElementRef.current = (el as any)._domNode;
            } else if (Platform.OS === 'web' && el) {
              const findDOMNode = (node: any): any => {
                if (node && typeof node === 'object') {
                  if (node.nodeType === 1) return node;
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
          style={[
            styles.payButton,
            (!stripeInstance || !elements || processing) && styles.payButtonDisabled,
          ]}
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

interface PaymentCheckoutModalProps {
  visible: boolean;
  bookingId: string | null;
  onClose: () => void;
}

export function PaymentCheckoutModal({ visible, bookingId, onClose }: PaymentCheckoutModalProps) {
  const router = useRouter();
  const { user } = useAuth();
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
  const [requiresPlaidPayment, setRequiresPlaidPayment] = useState(false);
  const [stripePaymentComplete, setStripePaymentComplete] = useState(false);
  const [plaidPaymentComplete, setPlaidPaymentComplete] = useState(false);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  // Native Stripe hooks
  const stripeNative = useStripeNative ? useStripeNative() : null;

  useEffect(() => {
    if (visible && bookingId) {
      // Check if another payment is already processing
      if (globalIsProcessing && currentBookingId !== bookingId) {
        setErrorModal({
          visible: true,
          title: 'Payment Already in Progress',
          message: 'Another payment is currently being processed. Please wait for it to complete before starting a new payment.',
        });
        onClose();
        return;
      }
      
      // Start payment processing
      if (!startPayment(bookingId)) {
        setErrorModal({
          visible: true,
          title: 'Payment Already in Progress',
          message: 'A payment is already being processed. Please wait for it to complete before starting a new payment.',
        });
        onClose();
        return;
      }
      
      initializePayment();
      // Initialize Stripe for web
      if (Platform.OS === 'web') {
        loadStripeWeb()
          .then((loaded) => {
            if (loaded && loadStripe && STRIPE_PUBLISHABLE_KEY) {
              try {
                const promise = loadStripe(STRIPE_PUBLISHABLE_KEY);
                setStripePromise(promise);
                promise
                  .then((stripeInst: any) => {
                    setStripeInstance(stripeInst);
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
    } else {
      // Reset state when modal closes
      if (!visible) {
        endPayment(); // End payment processing when modal closes
      }
      setBooking(null);
      setClientSecret(null);
      setStripeInstance(null);
      setStripeModulesLoaded(false);
      setPaymentAmounts(null);
      setRequiresPlaidPayment(false);
      setStripePaymentComplete(false);
      setPlaidPaymentComplete(false);
      setPlaidLinkToken(null);
      setPlaidLoading(false);
      setShowReceiptModal(false);
      setLoading(true);
      setProcessing(false);
    }
  }, [visible, bookingId, globalIsProcessing, currentBookingId, startPayment, endPayment, onClose]);

  const initializePayment = async () => {
    if (!bookingId) return;

    try {
      setLoading(true);

      const bookingData = await bookingService.getById(bookingId);
      setBooking(bookingData);

      if (bookingData.payment?.status === 'completed') {
        setLoading(false);
        onClose();
        return;
      }

      if (bookingData.status !== 'CONFIRMED') {
        const statusMessage = `This booking is ${bookingData.status.toLowerCase()}. Only confirmed bookings can be paid.`;
        if (Platform.OS === 'web') {
          alert(statusMessage);
        } else {
          Alert.alert('Cannot Pay', statusMessage);
        }
        setLoading(false);
        onClose();
        return;
      }

      const paymentIntent = await paymentService.createPaymentIntent(bookingId);
      console.log('Payment intent response:', paymentIntent);

      const secret = paymentIntent?.clientSecret;

      if (!secret) {
        console.error('No client secret found in payment intent:', paymentIntent);
        throw new Error('Payment intent created but no client secret returned');
      }

      setClientSecret(secret);

      const calculatedPlatformFee = paymentIntent.platformFee ?? bookingData.price * 0.075;
      const calculatedProviderAmount = paymentIntent.providerAmount ?? bookingData.price;
      const calculatedTotal =
        paymentIntent.amount ?? calculatedProviderAmount + calculatedPlatformFee;

      setPaymentAmounts({
        total: calculatedTotal,
        providerAmount: calculatedProviderAmount,
        platformFee: calculatedPlatformFee,
      });

      if (paymentIntent.requiresPlaidPayment) {
        setRequiresPlaidPayment(true);
        // Pre-fetch Plaid link token so it's ready when user clicks Pay Now
        try {
          const linkToken = await plaidService.getPaymentLinkToken(bookingId);
          setPlaidLinkToken(linkToken);
        } catch (error: any) {
          console.error('Error pre-fetching Plaid link token:', error);
          // Don't show error to user yet, will retry when they click Pay Now
        }
      }

      if (Platform.OS !== 'web' && stripeNative) {
        const { initPaymentSheet } = stripeNative;
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: secret,
          merchantDisplayName: 'Alyne',
        });

        if (initError) {
          Alert.alert('Error', initError.message);
          onClose();
          return;
        }
      }

      setLoading(false);
    } catch (error: any) {
      logger.error('Error initializing payment', error);
      endPayment(); // End payment processing on error
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);

      if (Platform.OS === 'web') {
        alert(`${errorTitle}: ${errorMessage}`);
      } else {
        Alert.alert(errorTitle, errorMessage);
      }
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
    
    // Check if both payments are complete
    if (!requiresPlaidPayment || plaidPaymentComplete) {
      handlePaymentSuccess();
    }
    // If Plaid payment is still pending, it will be handled by the unified payment flow
  };

  // Initialize Plaid Link for web
  const initializePlaidLink = (linkToken: string, onSuccess: () => void) => {
    console.log('initializePlaidLink called', { linkToken: linkToken?.substring(0, 20) + '...' });
    
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      console.error('Plaid Link only works on web');
      alert('Plaid payment is only available on web. Please use a web browser.');
      return;
    }

    // Check if Plaid script is already loaded
    if ((window as any).Plaid) {
      console.log('Plaid already loaded, creating handler');
      createPlaidHandler(linkToken, onSuccess);
    } else {
      console.log('Loading Plaid script from CDN');
      // Load Plaid Link from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => {
        console.log('Plaid script loaded');
        if ((window as any).Plaid) {
          createPlaidHandler(linkToken, onSuccess);
        } else {
          console.error('Plaid object not available after script load');
          alert('Failed to initialize Plaid. Please refresh the page.');
          setProcessing(false);
        }
      };
      script.onerror = (error) => {
        console.error('Failed to load Plaid Link script', error);
        logger.error('Failed to load Plaid Link script');
        setProcessing(false);
        alert('Failed to load payment system. Please check your internet connection and refresh the page.');
      };
      document.body.appendChild(script);
    }
  };

  const createPlaidHandler = (linkToken: string, onSuccess: () => void) => {
    console.log('createPlaidHandler called', { hasPlaid: !!(window as any).Plaid, hasToken: !!linkToken });
    
    if (!(window as any).Plaid) {
      console.error('Plaid object not available');
      setProcessing(false);
      alert('Plaid is not available. Please refresh the page.');
      return;
    }

    if (!linkToken) {
      console.error('No link token provided');
      setProcessing(false);
      alert('Payment token is missing. Please try again.');
      return;
    }

    try {
      console.log('Creating Plaid handler');
      const handler = (window as any).Plaid.create({
          token: linkToken,
          onSuccess: async (publicToken: string, metadata: any) => {
            logger.info('Plaid Link successful', { publicToken, metadata });
            
            try {
              // Note: With Plaid Payment Initiation, the payment is automatically created
              // when the user completes Plaid Link. We just need to track it.
              // For now, we'll use the existing processProviderPayment which uses Transfer API
              // In the future, we can implement proper Payment Initiation flow
              
              // Exchange the public token and process the payment
              // The payment is already initiated by Plaid, we just need to confirm it
              await paymentService.processProviderPayment(bookingId!);
              
              logger.info('Plaid payment processed successfully');
              setPlaidPaymentComplete(true);
              
              // Check if both payments are complete
              if (stripePaymentComplete) {
                // Both payments complete, show success
                setTimeout(() => {
                  handlePaymentSuccess();
                }, 500);
              }
              
              // Call the onSuccess callback
              onSuccess();
            } catch (error: any) {
              logger.error('Error processing Plaid payment', error);
              setProcessing(false);
              alert(`Provider payment error: ${error.message || 'Unknown error'}`);
            }
          },
          onExit: (err: any, metadata: any) => {
            logger.debug('Plaid exit', { err, metadata });
            setProcessing(false);
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
        console.log('Plaid handler created, opening...');
        handler.open();
      } catch (error: any) {
        console.error('Error creating Plaid handler:', error);
        logger.error('Error initializing Plaid', error);
        endPayment(); // End payment processing on error
        setProcessing(false);
        alert(`Failed to initialize payment: ${error.message || 'Unknown error'}`);
      }
  };

  const handlePlaidPayment = async () => {
    console.log('handlePlaidPayment called', { plaidLinkToken, bookingId });
    
    if (!plaidLinkToken) {
      console.error('No Plaid link token available');
      if (Platform.OS === 'web') {
        alert('Plaid payment is not ready. Please wait a moment or refresh the page.');
      } else {
        Alert.alert('Error', 'Plaid payment is not ready. Please wait a moment.');
      }
      return;
    }

    if (Platform.OS === 'web') {
      try {
        setProcessing(true);
        console.log('Initializing Plaid Link with token:', plaidLinkToken.substring(0, 20) + '...');
        initializePlaidLink(plaidLinkToken, () => {
          // Payment completed, show success
          console.log('Plaid payment flow completed');
          handlePaymentSuccess();
        });
      } catch (error: any) {
        console.error('Error in handlePlaidPayment:', error);
        endPayment(); // End payment processing on error
        setProcessing(false);
        alert(`Failed to start payment: ${error.message || 'Unknown error'}`);
      }
    } else {
      // For native, you would use Plaid React Native SDK
      Alert.alert('Info', 'Plaid payment on mobile is not yet implemented. Please use web version.');
    }
  };

  const handleUnifiedPayment = async () => {
    // Check if another payment is processing
    if (globalIsProcessing && currentBookingId !== bookingId) {
      setErrorModal({
        visible: true,
        title: 'Payment Already in Progress',
        message: 'Another payment is currently being processed. Please wait for it to complete before starting a new payment.',
      });
      return;
    }
    
    if (Platform.OS === 'web') {
      setProcessing(true);

      // Ensure we have Plaid token if needed
      if (requiresPlaidPayment && !plaidLinkToken) {
        try {
          setPlaidLoading(true);
          const linkToken = await plaidService.getPaymentLinkToken(bookingId!);
          setPlaidLinkToken(linkToken);
          setPlaidLoading(false);
        } catch (error: any) {
          console.error('Error getting Plaid link token:', error);
          endPayment(); // End payment processing on error
          setPlaidLoading(false);
          setProcessing(false);
          setErrorModal({
            visible: true,
            title: 'Payment Initialization Error',
            message: error.response?.data?.message || error.message || 'Failed to initialize provider payment. Please try again.',
          });
          return;
        }
      }

      // Start Stripe payment first (platform fee)
      if (stripeSubmitRef.current && !stripePaymentComplete) {
        try {
          await stripeSubmitRef.current();
          // Stripe payment success is handled by handleStripePaymentSuccess
        } catch (error: any) {
          console.error('Stripe payment error:', error);
          endPayment(); // End payment processing on error
          setProcessing(false);
          setErrorModal({
            visible: true,
            title: 'Payment Failed',
            message: error.message || 'Platform fee payment failed. Please try again.',
          });
          return;
        }
      }

      // Start Plaid payment (provider amount) simultaneously or right after Stripe
      if (requiresPlaidPayment && !plaidPaymentComplete && plaidLinkToken) {
        try {
          // Initialize Plaid Link - this will open a modal for user to complete
          // The payment completion is handled in the onSuccess callback
          initializePlaidLink(plaidLinkToken, () => {
            console.log('Plaid payment flow completed');
            // Check if both are complete
            if (stripePaymentComplete) {
              handlePaymentSuccess();
            }
          });
        } catch (error: any) {
          console.error('Error initializing Plaid:', error);
          endPayment(); // End payment processing on error
          setProcessing(false);
          alert(`Provider payment failed to start: ${error.message || 'Unknown error'}`);
        }
      } else if (!requiresPlaidPayment) {
        // No Plaid payment needed, just wait for Stripe
        // handleStripePaymentSuccess will handle completion
      }
    } else {
      handlePayment();
    }
  };

  const stripeSubmitRef = useRef<(() => Promise<void>) | null>(null);

  const handlePaymentSuccess = () => {
    // End payment processing when payment succeeds
    endPayment();
    
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Payment completed successfully! View receipt?')
      ) {
        setShowReceiptModal(true);
      } else {
        onClose();
      }
    } else {
      Alert.alert('Success', 'Payment completed successfully!', [
        {
          text: 'View Receipt',
          onPress: () => setShowReceiptModal(true),
        },
        {
          text: 'Done',
          style: 'cancel',
          onPress: () => onClose(),
        },
      ]);
    }
  };

  if (user?.userType === 'PROVIDER') {
    return null;
  }

  return (
    <>
      <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContainer}>
                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={28} color="#1e293b" />
                </TouchableOpacity>

                {loading || !booking ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
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
                          <Ionicons name="arrow-back" size={24} color="#1e293b" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Complete Payment</Text>
                        <View style={styles.backButton} />
                      </View>
                      <View style={styles.headerDivider} />

                      <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Booking Summary</Text>

                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Service</Text>
                          <Text style={styles.summaryValue}>
                            {booking.service?.name || 'Service'}
                          </Text>
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
                            {new Date(booking.scheduledDate).toLocaleDateString()} at{' '}
                            {formatTime12Hour(booking.scheduledTime)}
                          </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Service Price</Text>
                          <Text style={styles.summaryValue}>
                            ${paymentAmounts?.providerAmount.toFixed(2) || booking.price.toFixed(2)}
                          </Text>
                        </View>

                        {paymentAmounts && (
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Platform Fee (Alyne)</Text>
                            <Text style={styles.summaryValue}>
                              +${paymentAmounts.platformFee.toFixed(2)}
                            </Text>
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
                          Your payments are secured by Stripe and Plaid. We never store your payment
                          details.
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
                                amount={paymentAmounts?.platformFee || 0}
                                onSubmitRef={stripeSubmitRef}
                                hideButton={true}
                                onError={(title, message) => {
                                  setProcessing(false);
                                  setErrorModal({ visible: true, title, message });
                                }}
                              />
                            </View>
                          )}

                          {/* Single Pay Now Button - Processes Both Payments */}
                          {!stripePaymentComplete || (requiresPlaidPayment && !plaidPaymentComplete) ? (
                            <>
                              {requiresPlaidPayment && paymentAmounts && (
                                <View style={styles.paymentStepCard}>
                                  <Text style={styles.breakdownTitle}>Payment Details</Text>
                                  <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Platform Fee (Stripe)</Text>
                                    <Text style={styles.breakdownValue}>
                                      ${paymentAmounts.platformFee.toFixed(2)}
                                      {stripePaymentComplete && ' ✓'}
                                    </Text>
                                  </View>
                                  <View style={styles.breakdownRow}>
                                    <Text style={styles.breakdownLabel}>Provider Payment (Plaid)</Text>
                                    <Text style={styles.breakdownValue}>
                                      ${paymentAmounts.providerAmount.toFixed(2)}
                                      {plaidPaymentComplete && ' ✓'}
                                    </Text>
                                  </View>
                                </View>
                              )}

                              <TouchableOpacity
                                style={[
                                  styles.payButton,
                                  (processing || !stripeInstance || (requiresPlaidPayment && !plaidLinkToken && plaidLoading)) && styles.payButtonDisabled,
                                ]}
                                onPress={handleUnifiedPayment}
                                disabled={processing || !stripeInstance || (requiresPlaidPayment && !plaidLinkToken && plaidLoading)}
                              >
                                {processing ? (
                                  <ActivityIndicator color="#ffffff" />
                                ) : (
                                  <Text style={styles.payButtonText}>
                                    Pay Now ($
                                    {paymentAmounts?.total.toFixed(2) || booking.price.toFixed(2)})
                                  </Text>
                                )}
                              </TouchableOpacity>

                              {processing && (
                                <View style={styles.paymentStatus}>
                                  <ActivityIndicator size="small" color="#2563eb" />
                                  <Text style={styles.paymentStatusText}>
                                    Processing payments...
                                  </Text>
                                  {requiresPlaidPayment && (
                                    <Text style={[styles.paymentStatusText, { fontSize: 12, marginTop: 4 }]}>
                                      Platform fee: {stripePaymentComplete ? '✓' : '...'} | Provider payment: {plaidPaymentComplete ? '✓' : '...'}
                                    </Text>
                                  )}
                                </View>
                              )}

                              {plaidLoading && !plaidLinkToken && (
                                <View style={styles.paymentStatus}>
                                  <ActivityIndicator size="small" color="#2563eb" />
                                  <Text style={styles.paymentStatusText}>
                                    Preparing payments...
                                  </Text>
                                </View>
                              )}
                            </>
                          ) : (
                            /* Both Payments Complete */
                            <View style={styles.paymentStatus}>
                              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                              <Text style={[styles.paymentStatusText, { color: '#16A34A' }]}>
                                Payment completed successfully!
                              </Text>
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
                  </>
                )}
              </View>
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
          setErrorModal({ visible: false, title: '', message: '' });
          // Reset all loading states when error modal is closed
          setProcessing(false);
          setPlaidLoading(false);
        }}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
        buttonText="Try Again"
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
  paymentFormSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: '#2563eb',
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
    marginTop: 8,
  },
  paymentStepCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
