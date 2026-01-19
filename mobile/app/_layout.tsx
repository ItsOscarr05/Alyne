import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Animated } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PaymentProvider } from '../contexts/PaymentContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

// StripeProvider is native-only, so we conditionally import it
let StripeProvider: any = ({ children }: { children: React.ReactNode }) => <>{children}</>;
if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    StripeProvider = stripeModule.StripeProvider;
  } catch (e) {
    // Stripe not available, use fallback
  }
}

const STRIPE_PUBLISHABLE_KEY =
  Constants.expoConfig?.extra?.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '';

function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <PaymentProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: ({ current }) => {
              return {
                cardStyle: {
                  opacity: current.progress,
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
            },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="provider/[id]" />
          <Stack.Screen name="provider/onboarding" />
          <Stack.Screen name="provider/edit-profile" />
          <Stack.Screen name="client/onboarding" />
          <Stack.Screen name="booking/create" />
          <Stack.Screen name="booking/[id]" />
          <Stack.Screen name="booking/reschedule" />
          <Stack.Screen name="messages/[userId]" />
          <Stack.Screen name="review/submit" />
          <Stack.Screen name="payment/checkout" />
          <Stack.Screen name="payment/receipt" />
          <Stack.Screen name="payment/history" />
        </Stack>
      </PaymentProvider>
    </StripeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
