import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

export default function Index() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const themeHook = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Providers must complete onboarding before accessing the app
        const isProviderNeedingOnboarding =
          user?.userType === 'PROVIDER' && user?.providerOnboardingComplete !== true;
        if (isProviderNeedingOnboarding) {
          router.replace('/provider/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
        <ActivityIndicator size="large" color={themeHook.colors.primary} />
        <Text style={[styles.subtitle, { color: themeHook.colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
      <Text style={[styles.title, { color: themeHook.colors.primary }]}>Alyne</Text>
      <Text style={[styles.subtitle, { color: themeHook.colors.textSecondary }]}>Connecting Wellness</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
});

