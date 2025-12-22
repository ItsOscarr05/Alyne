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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { plaidService } from '../../services/plaid';
import { logger } from '../../utils/logger';
import apiClient from '../../services/api';
import { LocationAutocomplete } from '../../components/ui/LocationAutocomplete';

type Step = 'location' | 'payment' | 'preferences' | 'complete';

export default function ClientOnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const modal = useModal();
  const [currentStep, setCurrentStep] = useState<Step>('location');
  const [loading, setLoading] = useState(false);

  // Location state
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');

  // Payment state
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [bankAccountConnected, setBankAccountConnected] = useState(false);
  const [bankAccountInfo, setBankAccountInfo] = useState<{
    accountName: string;
    accountMask: string;
  } | null>(null);

  // Preferences state
  const [wellnessGoals, setWellnessGoals] = useState<string[]>([]);
  const [preferredServiceTypes, setPreferredServiceTypes] = useState<string[]>([]);

  const availableGoals = [
    'Fitness & Exercise',
    'Stress Relief',
    'Weight Management',
    'Flexibility & Mobility',
    'Mental Wellness',
    'Nutrition',
    'Recovery & Rehabilitation',
  ];

  const availableServiceTypes = [
    'Personal Training',
    'Yoga',
    'Massage Therapy',
    'Nutrition Coaching',
    'Meditation',
    'Physical Therapy',
    'Wellness Coaching',
  ];

  // Redirect if not a client
  useEffect(() => {
    if (user && user.userType !== 'CLIENT') {
      router.replace('/(tabs)/profile');
    }
  }, [user, router]);

  // Get Plaid link token when on payment step
  useEffect(() => {
    if (currentStep === 'payment' && !plaidLinkToken && !bankAccountConnected) {
      loadPlaidLinkToken();
    }
  }, [currentStep]);

  const geocodeCityState = async (cityName: string, stateName: string) => {
    try {
      const results = await Location.geocodeAsync(`${cityName}, ${stateName}, USA`);
      if (results && results.length > 0) {
        return {
          lat: results[0].latitude,
          lng: results[0].longitude,
        };
      }
      return null;
    } catch (error) {
      logger.error('Error geocoding city/state', error);
      return null;
    }
  };

  const loadPlaidLinkToken = async () => {
    try {
      setLoading(true);
      // For clients, payment method setup is optional during onboarding
      // They can set it up when making their first booking
      // For now, we'll skip this step or make it optional
      modal.showAlert({
        title: 'Payment Setup',
        message:
          'Payment method setup is optional. You can add a payment method when booking your first session.',
        type: 'info',
      });
    } catch (error: any) {
      logger.error('Error loading Plaid link token', error);
      modal.showAlert({
        title: 'Payment Setup Error',
        message: 'Failed to initialize payment setup. You can set this up later in settings.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializePlaidLink = (linkToken: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      Alert.alert(
        'Info',
        'Payment setup is currently only available on web. You can set this up later.'
      );
      return;
    }

    // Check if Plaid script is already loaded
    if ((window as any).Plaid) {
      createPlaidHandler(linkToken);
    } else {
      // Load Plaid Link from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).Plaid) {
          createPlaidHandler(linkToken);
        } else {
          Alert.alert('Error', 'Failed to load payment system. Please refresh the page.');
        }
      };
      script.onerror = () => {
        Alert.alert(
          'Error',
          'Failed to load payment system. Please check your internet connection.'
        );
      };
      document.body.appendChild(script);
    }
  };

  const createPlaidHandler = (linkToken: string) => {
    const handler = (window as any).Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        try {
          setLoading(true);
          // For client onboarding, we'll store the Plaid item for future payments
          // Note: This might need a different endpoint for client payment methods
          const result = await plaidService.exchangePublicToken(publicToken);
          setBankAccountConnected(true);
          setBankAccountInfo({
            accountName: result.accountName,
            accountMask: result.accountMask,
          });
          modal.showAlert({
            title: 'Payment Method Added',
            message: `Your ${result.accountName} account ending in ${result.accountMask} has been connected.`,
            type: 'success',
          });
        } catch (error: any) {
          logger.error('Error exchanging Plaid token', error);
          modal.showAlert({
            title: 'Error',
            message: error.response?.data?.error?.message || 'Failed to connect payment method',
            type: 'error',
          });
        } finally {
          setLoading(false);
        }
      },
      onExit: (err: any) => {
        if (err) {
          logger.error('Plaid exit error', err);
        }
        setLoading(false);
      },
    });

    handler.open();
  };

  const toggleGoal = (goal: string) => {
    if (wellnessGoals.includes(goal)) {
      setWellnessGoals(wellnessGoals.filter((g) => g !== goal));
    } else {
      setWellnessGoals([...wellnessGoals, goal]);
    }
  };

  const toggleServiceType = (serviceType: string) => {
    if (preferredServiceTypes.includes(serviceType)) {
      setPreferredServiceTypes(preferredServiceTypes.filter((s) => s !== serviceType));
    } else {
      setPreferredServiceTypes([...preferredServiceTypes, serviceType]);
    }
  };

  const handleSaveLocation = async () => {
    if (!city.trim() || !state.trim()) {
      modal.showAlert({
        title: 'Location Required',
        message: 'Please enter both city and state to continue.',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      // Geocode city/state to get coordinates
      const coordinates = await geocodeCityState(city.trim(), state.trim());

      // Save location to client profile preferences
      await apiClient.put('/clients/profile', {
        preferences: {
          location: {
            city: city.trim(),
            state: state.trim(),
            ...(coordinates && { lat: coordinates.lat, lng: coordinates.lng }),
          },
        },
      });
      setCurrentStep('payment');
    } catch (error: any) {
      logger.error('Error saving location', error);
      modal.showAlert({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to save location',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async () => {
    // Payment is optional for now, can skip
    setCurrentStep('preferences');
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await apiClient.put('/clients/profile', {
        preferences: {
          wellnessGoals,
          preferredServiceTypes,
        },
      });
      setCurrentStep('complete');
    } catch (error: any) {
      logger.error('Error saving preferences', error);
      modal.showAlert({
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to save preferences',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIcon}>
          <Ionicons name="location" size={32} color={theme.colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Set Your Location</Text>
        <Text style={styles.stepDescription}>
          We'll use your location to find nearby wellness providers and show you the best matches.
        </Text>
      </View>

      <LocationAutocomplete
        city={city}
        state={state}
        onCityChange={setCity}
        onStateChange={setState}
        cityPlaceholder="Enter your city"
        statePlaceholder="Enter your state"
      />

      <Button
        title="Continue"
        onPress={handleSaveLocation}
        loading={loading}
        disabled={!city.trim() || !state.trim() || loading}
        style={styles.continueButton}
      />
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIcon}>
          <Ionicons name="card" size={32} color={theme.colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Add Payment Method</Text>
        <Text style={styles.stepDescription}>
          Connect your bank account to easily pay providers. This is secure and you can skip this
          step for now.
        </Text>
      </View>

      {bankAccountConnected && bankAccountInfo ? (
        <View style={styles.paymentCard}>
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.semantic.success} />
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentAccountName}>{bankAccountInfo.accountName}</Text>
            <Text style={styles.paymentAccountMask}>•••• {bankAccountInfo.accountMask}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.paymentCard}>
          <Ionicons name="card-outline" size={24} color={theme.colors.neutral[500]} />
          <Text style={styles.paymentPlaceholder}>No payment method connected</Text>
        </View>
      )}

      {!bankAccountConnected && (
        <TouchableOpacity
          style={styles.plaidButton}
          onPress={() => {
            if (plaidLinkToken) {
              initializePlaidLink(plaidLinkToken);
            } else {
              loadPlaidLinkToken();
            }
          }}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color={theme.colors.white} />
              <Text style={styles.plaidButtonText}>Connect Bank Account</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.buttonRow}>
        <Button
          title="Skip for Now"
          onPress={handleSavePayment}
          variant="secondary"
          style={styles.skipButton}
        />
        <Button
          title="Continue"
          onPress={handleSavePayment}
          loading={loading}
          style={styles.continueButton}
        />
      </View>
    </View>
  );

  const renderPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIcon}>
          <Ionicons name="heart" size={32} color={theme.colors.primary[500]} />
        </View>
        <Text style={styles.stepTitle}>Wellness Preferences</Text>
        <Text style={styles.stepDescription}>
          Help us personalize your experience by sharing your wellness goals and interests.
        </Text>
      </View>

      <View style={styles.preferencesSection}>
        <Text style={styles.preferencesLabel}>Wellness Goals (Optional)</Text>
        <View style={styles.tagContainer}>
          {availableGoals.map((goal) => (
            <TouchableOpacity
              key={goal}
              style={[styles.tag, wellnessGoals.includes(goal) && styles.tagSelected]}
              onPress={() => toggleGoal(goal)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tagText, wellnessGoals.includes(goal) && styles.tagTextSelected]}
              >
                {goal}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.preferencesSection}>
        <Text style={styles.preferencesLabel}>Preferred Service Types (Optional)</Text>
        <View style={styles.tagContainer}>
          {availableServiceTypes.map((serviceType) => (
            <TouchableOpacity
              key={serviceType}
              style={[
                styles.tag,
                preferredServiceTypes.includes(serviceType) && styles.tagSelected,
              ]}
              onPress={() => toggleServiceType(serviceType)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tagText,
                  preferredServiceTypes.includes(serviceType) && styles.tagTextSelected,
                ]}
              >
                {serviceType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Button
        title="Complete Setup"
        onPress={handleSavePreferences}
        loading={loading}
        style={styles.continueButton}
      />
    </View>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.completeContainer}>
        <View style={styles.completeIcon}>
          <Ionicons name="checkmark-circle" size={80} color={theme.colors.semantic.success} />
        </View>
        <Text style={styles.completeTitle}>Welcome to Alyne!</Text>
        <Text style={styles.completeDescription}>
          Your profile is set up and ready. Start discovering wellness providers near you.
        </Text>
        <Button title="Get Started" onPress={handleComplete} style={styles.completeButton} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        {currentStep !== 'complete' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((['location', 'payment', 'preferences'].indexOf(currentStep) + 1) / 3) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Step {['location', 'payment', 'preferences'].indexOf(currentStep) + 1} of 3
            </Text>
          </View>
        )}

        {currentStep === 'location' && renderLocationStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'preferences' && renderPreferencesStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </ScrollView>

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
    backgroundColor: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  progressContainer: {
    marginBottom: theme.spacing.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 2,
  },
  progressText: {
    ...theme.typography.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  stepTitle: {
    ...theme.typography.h1,
    fontSize: 28,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  stepDescription: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  locationCoords: {
    ...theme.typography.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  locationPlaceholder: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
    flex: 1,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  permissionButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAccountName: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  paymentAccountMask: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  paymentPlaceholder: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
    flex: 1,
  },
  plaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  plaidButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  skipButton: {
    flex: 0.5,
    marginTop: theme.spacing.lg,
  },
  preferencesSection: {
    marginBottom: theme.spacing.xl,
  },
  preferencesLabel: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.neutral[50],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  tagSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  tagText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[700],
  },
  tagTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: theme.spacing.lg,
  },
  completeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  completeIcon: {
    marginBottom: theme.spacing.xl,
  },
  completeTitle: {
    ...theme.typography.h1,
    fontSize: 32,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  completeDescription: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
    paddingHorizontal: theme.spacing.lg,
  },
  completeButton: {
    minWidth: 200,
  },
});
