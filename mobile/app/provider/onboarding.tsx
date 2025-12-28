import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { onboardingService } from '../../services/onboarding';
import { plaidService } from '../../services/plaid';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import * as ImagePicker from 'expo-image-picker';
import { LocationAutocomplete } from '../../components/ui/LocationAutocomplete';
import { formatTime12Hour, formatTime24Hour } from '../../utils/timeUtils';

type Step =
  | 'location'
  | 'bank'
  | 'profile'
  | 'services'
  | 'credentials'
  | 'availability'
  | 'complete';

export default function ProviderOnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('location');
  const [loading, setLoading] = useState(false);

  // Redirect if not a provider
  useEffect(() => {
    if (user && user.userType !== 'PROVIDER') {
      router.replace('/(tabs)/profile');
    }
  }, [user, router]);

  // Track if profile has been loaded to prevent reloading
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Profile state
  const [bio, setBio] = useState('');
  const [bioFocused, setBioFocused] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialtyInputFocused, setSpecialtyInputFocused] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Service state
  const [services, setServices] = useState<
    Array<{
      id?: string;
      name: string;
      description: string;
      price: string;
      duration: string;
    }>
  >([{ name: '', description: '', price: '', duration: '' }]);

  // Credential state
  const [credentials, setCredentials] = useState<
    Array<{
      id?: string;
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate: string;
    }>
  >([{ name: '', issuer: '', issueDate: '', expiryDate: '' }]);

  // Availability state
  const [availability, setAvailability] = useState<
    Array<{
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isRecurring: boolean;
    }>
  >([]);

  // Location state
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [serviceRadius, setServiceRadius] = useState<string>('15');
  const [serviceRadiusFocused, setServiceRadiusFocused] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Bank account state
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [bankAccountConnected, setBankAccountConnected] = useState(false);
  const [bankAccountInfo, setBankAccountInfo] = useState<{
    accountName: string;
    accountMask: string;
  } | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load existing profile data when component mounts (for edit mode)
  const loadExistingProfile = async () => {
    if (!user?.id) {
      console.log('No user ID, skipping profile load');
      return;
    }

    if (profileLoaded) {
      console.log('Profile already loaded, skipping');
      return;
    }

    try {
      console.log('Starting to load existing profile for user:', user.id);
      // Try to load existing profile
      const profile = await providerService.getById(user.id);
      
      console.log('Profile API response:', profile);
      console.log('Profile data:', {
        hasProfile: !!profile,
        hasBio: !!profile?.bio,
        specialtiesCount: profile?.specialties?.length || 0,
        hasServiceArea: !!profile?.serviceArea,
        servicesCount: profile?.services?.length || 0,
        credentialsCount: profile?.credentials?.length || 0,
        availabilityCount: profile?.availability?.length || 0,
      });
      
      if (profile) {
        // Load bio and specialties
        if (profile.bio) {
          console.log('Setting bio to:', profile.bio.substring(0, 50) + '...');
          setBio(profile.bio);
          logger.debug('Set bio', { bioLength: profile.bio.length });
        }
        if (profile.specialties && profile.specialties.length > 0) {
          console.log('Setting specialties to:', profile.specialties);
          setSpecialties(profile.specialties);
          logger.debug('Set specialties', { count: profile.specialties.length });
        }

        // Load profile photo
        if (user.profilePhoto) {
          setProfilePhoto(user.profilePhoto);
        }

        // Load service area (location)
        console.log('Checking serviceArea:', profile.serviceArea);
        if (profile.serviceArea) {
          const serviceArea = profile.serviceArea as { center?: { lat?: number; lng?: number }; radius?: number };
          console.log('Parsed serviceArea:', serviceArea);
          
          if (serviceArea.radius) {
            // Convert radius from km to miles for display
            const radiusInMiles = (serviceArea.radius / 1.60934).toFixed(0);
            console.log('Setting service radius to:', radiusInMiles);
            setServiceRadius(radiusInMiles);
            logger.debug('Set service radius', { radiusInMiles });
          }
          
          if (serviceArea.center) {
            console.log('Service area center object:', serviceArea.center);
            console.log('Service area center lat:', serviceArea.center.lat);
            console.log('Service area center lng:', serviceArea.center.lng);
            console.log('Type of center:', typeof serviceArea.center);
            console.log('Center keys:', Object.keys(serviceArea.center));
            
            setCoordinates(serviceArea.center);
            logger.debug('Set coordinates', { center: serviceArea.center });
            
            // Try to reverse geocode to get city/state
            const lat = serviceArea.center.lat;
            const lng = serviceArea.center.lng;
            console.log('Checking lat/lng for reverse geocode:', { lat, lng, latType: typeof lat, lngType: typeof lng });
            if (lat && lng && lat !== 0 && lng !== 0) {
              try {
                console.log('Attempting reverse geocode for:', serviceArea.center.lat, serviceArea.center.lng);
                const reverseGeocodeResult = await Location.reverseGeocodeAsync({
                  latitude: serviceArea.center.lat,
                  longitude: serviceArea.center.lng,
                });
                console.log('Reverse geocode result:', reverseGeocodeResult);
                if (reverseGeocodeResult && reverseGeocodeResult.length > 0) {
                  const address = reverseGeocodeResult[0];
                  console.log('Address from reverse geocode:', address);
                  if (address.city) {
                    console.log('Setting city to:', address.city);
                    setCity(address.city);
                    logger.debug('Set city from reverse geocode', { city: address.city });
                  }
                  if (address.region) {
                    console.log('Setting state to:', address.region);
                    setState(address.region);
                    logger.debug('Set state from reverse geocode', { state: address.region });
                  }
                }
              } catch (error) {
                // Reverse geocoding failed - that's okay, user can manually enter
                console.log('Reverse geocoding failed:', error);
                logger.debug('Reverse geocoding failed', error);
              }
            }
          }
        }

        // Load services
        if (profile.services && profile.services.length > 0) {
          const formattedServices = profile.services.map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description || '',
            price: service.price.toString(),
            duration: service.duration.toString(),
          }));
          setServices(formattedServices);
          logger.debug('Set services', { count: formattedServices.length });
        } else {
          // If no services, ensure at least one empty service for adding
          setServices([{ name: '', description: '', price: '', duration: '' }]);
        }

        // Load credentials
        if (profile.credentials && profile.credentials.length > 0) {
          const formattedCredentials = profile.credentials.map((cred) => {
            // Handle date fields - they might be Date objects or strings
            let issueDate = '';
            let expiryDate = '';
            
            if (cred.issueDate) {
              if (typeof cred.issueDate === 'string') {
                issueDate = cred.issueDate.split('T')[0]; // Extract YYYY-MM-DD from ISO string
              } else {
                issueDate = new Date(cred.issueDate).toISOString().split('T')[0];
              }
            }
            
            if (cred.expiryDate) {
              if (typeof cred.expiryDate === 'string') {
                expiryDate = cred.expiryDate.split('T')[0]; // Extract YYYY-MM-DD from ISO string
              } else {
                expiryDate = new Date(cred.expiryDate).toISOString().split('T')[0];
              }
            }
            
            return {
              id: cred.id,
              name: cred.name,
              issuer: cred.issuer || '',
              issueDate,
              expiryDate,
            };
          });
          setCredentials(formattedCredentials);
          logger.debug('Set credentials', { count: formattedCredentials.length });
        } else {
          // If no credentials, keep one empty credential for adding
          setCredentials([{ name: '', issuer: '', issueDate: '', expiryDate: '' }]);
        }

        // Load availability (convert from 24-hour to 12-hour format)
        if (profile.availability && profile.availability.length > 0) {
          const formattedAvailability = profile.availability.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: formatTime12Hour(slot.startTime),
            endTime: formatTime12Hour(slot.endTime),
            isRecurring: slot.isRecurring,
          }));
          setAvailability(formattedAvailability);
          logger.debug('Set availability', { count: formattedAvailability.length });
        }

        // Load bank account info (if verified)
        try {
          const bankInfo = await plaidService.getBankAccountInfo();
          if (bankInfo && bankInfo.verified) {
            setBankAccountConnected(true);
            // Note: accountName and accountMask aren't stored/returned by backend
            // They're only available during the Plaid Link flow
            // So we'll just mark it as connected
            setBankAccountInfo({
              accountName: 'Connected Account',
              accountMask: '••••',
            });
            logger.debug('Bank account is verified');
          }
        } catch (error) {
          // Bank account not connected or error loading - that's okay
          logger.debug('No bank account info or error loading', error);
        }

        // Mark profile as loaded
        console.log('Profile loading complete, marking as loaded');
        setProfileLoaded(true);
      }
    } catch (error: any) {
      // Profile doesn't exist yet - that's okay, this is a new profile
      logger.debug('No existing profile found or error loading', {
        error: error.message,
        statusCode: error.response?.status,
      });
      
      // Log to console for debugging
      if (error.response?.status !== 404) {
        console.error('Error loading existing profile:', error);
      }
    }
  };

  // Load existing profile data when component mounts (for edit mode)
  useEffect(() => {
    console.log('useEffect triggered for profile load', { 
      userId: user?.id, 
      userType: user?.userType,
      hasUser: !!user,
      profileLoaded
    });
    if (user?.id && user.userType === 'PROVIDER' && !profileLoaded) {
      console.log('Calling loadExistingProfile for user:', user.id);
      loadExistingProfile();
    } else {
      console.log('Not loading profile - conditions not met', {
        hasUserId: !!user?.id,
        userType: user?.userType,
        profileLoaded,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.userType, profileLoaded]);

  // Get Plaid link token when on bank step
  useEffect(() => {
    if (currentStep === 'bank' && !plaidLinkToken && !bankAccountConnected) {
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
      const token = await plaidService.getProviderLinkToken();
      setPlaidLinkToken(token);
    } catch (error: any) {
      logger.error('Error loading Plaid link token', error);
      Alert.alert(
        'Error',
        'Failed to initialize bank setup. You can set this up later in settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  const initializePlaidLink = (linkToken: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      Alert.alert(
        'Info',
        'Bank setup is currently only available on web. You can set this up later.'
      );
      return;
    }

    if ((window as any).Plaid) {
      createPlaidHandler(linkToken);
    } else {
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
          const result = await plaidService.exchangePublicToken(publicToken);
          setBankAccountConnected(true);
          setBankAccountInfo({
            accountName: result.accountName,
            accountMask: result.accountMask,
          });
          Alert.alert(
            'Success',
            `Your ${result.accountName} account ending in ${result.accountMask} has been connected.`
          );
        } catch (error: any) {
          logger.error('Error exchanging Plaid token', error);
          Alert.alert(
            'Error',
            error.response?.data?.error?.message || 'Failed to connect bank account'
          );
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

  const handleSaveLocation = async () => {
    // Location is optional - allow continuing even if city/state aren't filled
    if (city.trim() && state.trim()) {
      // Convert miles to kilometers for storage (backend stores in km)
      const radiusInMiles = parseFloat(serviceRadius) || 15;
      const radius = radiusInMiles * 1.60934; // Convert miles to km
      
      // Geocode city/state to get coordinates for service area
      const geocodedCoords = await geocodeCityState(city.trim(), state.trim());

      // Store coordinates in state for use in profile step
      if (geocodedCoords) {
        setCoordinates(geocodedCoords);
      } else {
        // If geocoding fails, still allow continuing but with default coordinates
        setCoordinates({ lat: 0, lng: 0 });
      }
    }

    setCurrentStep('bank');
  };

  const handleSaveBank = async () => {
    // Bank is optional, can skip
    setCurrentStep('profile');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'We need access to your photos to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePhoto(base64);
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim()) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([...services, { name: '', description: '', price: '', duration: '' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const addCredential = () => {
    setCredentials([...credentials, { name: '', issuer: '', issueDate: '', expiryDate: '' }]);
  };

  const removeCredential = (index: number) => {
    setCredentials(credentials.filter((_, i) => i !== index));
  };

  const updateCredential = (index: number, field: string, value: string) => {
    const updated = [...credentials];
    updated[index] = { ...updated[index], [field]: value };
    setCredentials(updated);
  };

  const toggleAvailability = (dayOfWeek: number) => {
    const existing = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (existing) {
      setAvailability(availability.filter((a) => a.dayOfWeek !== dayOfWeek));
    } else {
      setAvailability([
        ...availability,
        { dayOfWeek, startTime: '9:00 AM', endTime: '5:00 PM', isRecurring: true },
      ]);
    }
  };

  const updateAvailabilityTime = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    const updated = availability.map((a) =>
      a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
    );
    setAvailability(updated);
  };

  const handleSaveProfile = async () => {
    if (!bio.trim()) {
      Alert.alert('Required', 'Please enter a bio.');
      return;
    }

    setLoading(true);
    try {
      // Update profile photo if selected
      if (profilePhoto) {
        await onboardingService.updateUserProfile({ profilePhoto });
        await refreshUser();
      }

      // Use coordinates from state (set in location step, geocoded from city/state)
      // Convert miles to kilometers for storage (backend stores in km)
      const radiusInMiles = parseFloat(serviceRadius) || 15;
      const radius = radiusInMiles * 1.60934; // Convert miles to km
      const serviceArea = {
        center: coordinates || { lat: 0, lng: 0 },
        radius,
      };

      await onboardingService.updateProfile({
        bio,
        specialties,
        serviceArea,
      });

      setCurrentStep('services');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServices = async () => {
    const validServices = services.filter((s) => s.name.trim() && s.price && s.duration);
    if (validServices.length === 0) {
      Alert.alert('Required', 'Please add at least one service.');
      return;
    }

    setLoading(true);
    try {
      for (const service of validServices) {
        if (service.id) {
          // Update existing service
          await onboardingService.updateService(service.id, {
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: parseInt(service.duration, 10),
          });
        } else {
          // Create new service
          await onboardingService.createService({
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: parseInt(service.duration, 10),
          });
        }
      }
      setCurrentStep('credentials');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save services');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    setLoading(true);
    try {
      const validCredentials = credentials.filter((c) => c.name.trim());
      for (const credential of validCredentials) {
        if (credential.id) {
          // Update existing credential
          await onboardingService.updateCredential(credential.id, {
            name: credential.name,
            issuer: credential.issuer || undefined,
            issueDate: credential.issueDate || undefined,
            expiryDate: credential.expiryDate || undefined,
          });
        } else {
          // Create new credential
          await onboardingService.createCredential({
            name: credential.name,
            issuer: credential.issuer || undefined,
            issueDate: credential.issueDate || undefined,
            expiryDate: credential.expiryDate || undefined,
          });
        }
      }
      setCurrentStep('availability');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    setLoading(true);
    try {
      for (const slot of availability) {
        // Convert 12-hour format to 24-hour format for backend
        const startTime24 = formatTime24Hour(slot.startTime);
        const endTime24 = formatTime24Hour(slot.endTime);
        
        if (slot.id) {
          // Update existing availability
          await onboardingService.updateAvailability(slot.id, {
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime24,
            endTime: endTime24,
            isRecurring: slot.isRecurring,
          });
        } else {
          // Create new availability
          await onboardingService.createAvailability({
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime24,
            endTime: endTime24,
            isRecurring: slot.isRecurring,
          });
        }
      }
      setCurrentStep('complete');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.replace('/(tabs)/dashboard');
  };

  const renderLocationStep = () => (
    <ScrollView style={styles.stepContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepTitle}>Set Your Service Area</Text>
      <Text style={styles.stepDescription}>
        We'll use your location to help clients find you. Set the radius of your service area.
      </Text>

      <LocationAutocomplete
        city={city}
        state={state}
        onCityChange={setCity}
        onStateChange={setState}
        cityPlaceholder="Enter your city"
        statePlaceholder="Enter your state"
      />

      <View style={styles.section}>
        <Text style={styles.label}>Service Range (mi)</Text>
        <TextInput
          style={[styles.input, serviceRadiusFocused && styles.inputFocused]}
          placeholder="15"
          value={serviceRadius}
          onChangeText={setServiceRadius}
          onFocus={() => setServiceRadiusFocused(true)}
          onBlur={() => setServiceRadiusFocused(false)}
          keyboardType="numeric"
        />
        <Text style={styles.hint}>The distance you're willing to travel to clients</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSaveLocation}>
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
          onPress={handleSaveLocation}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBankStep = () => (
    <ScrollView style={styles.stepContent}>
      <View style={styles.bankHeader}>
        <View style={styles.bankIconContainer}>
          <Ionicons name="shield-checkmark" size={32} color="#2563eb" />
        </View>
        <Text style={styles.stepTitle}>Connect Bank Account</Text>
        <Text style={styles.stepDescription}>
          Securely connect your bank account to receive payments from clients. Your financial
          information is encrypted and protected.
        </Text>
      </View>

      {bankAccountConnected && bankAccountInfo ? (
        <View style={styles.bankCardConnected}>
          <View style={styles.bankCardHeader}>
            <View style={styles.bankCardIconContainer}>
              <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
            </View>
            <View style={styles.bankInfo}>
              <Text style={styles.bankAccountName}>{bankAccountInfo.accountName}</Text>
              <Text style={styles.bankAccountMask}>•••• {bankAccountInfo.accountMask}</Text>
            </View>
          </View>
          <View style={styles.bankCardFooter}>
            <Ionicons name="lock-closed" size={14} color="#64748b" />
            <Text style={styles.bankCardFooterText}>Securely connected</Text>
          </View>
        </View>
      ) : (
        <View style={styles.bankCardEmpty}>
          <View style={styles.bankCardEmptyIcon}>
            <Ionicons name="card-outline" size={40} color="#cbd5e1" />
          </View>
          <Text style={styles.bankCardEmptyTitle}>No bank account connected</Text>
          <Text style={styles.bankCardEmptyText}>
            Connect your account to start receiving payments
          </Text>
        </View>
      )}

      {!bankAccountConnected && (
        <TouchableOpacity
          style={[styles.plaidButton, loading && styles.buttonDisabled]}
          onPress={() => {
            if (plaidLinkToken) {
              initializePlaidLink(plaidLinkToken);
            } else {
              loadPlaidLinkToken();
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#ffffff" />
              <Text style={styles.plaidButtonText}>Connect Bank Account</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.bankFeatures}>
        <View style={styles.bankFeature}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#2563eb" />
          <Text style={styles.bankFeatureText}>Bank-level security</Text>
        </View>
        <View style={styles.bankFeature}>
          <Ionicons name="flash-outline" size={20} color="#2563eb" />
          <Text style={styles.bankFeatureText}>Instant verification</Text>
        </View>
        <View style={styles.bankFeature}>
          <Ionicons name="time-outline" size={20} color="#2563eb" />
          <Text style={styles.bankFeatureText}>Skip for now</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSaveBank}>
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
          onPress={handleSaveBank}
          disabled={!bankAccountConnected}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderProfileStep = () => (
    <ScrollView style={styles.stepContent}>
      <View style={styles.profileHeader}>
        <View style={styles.profileIconContainer}>
          <Ionicons name="person-circle-outline" size={32} color="#2563eb" />
        </View>
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepDescription}>
          Create your professional profile to start attracting clients
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Profile Photo</Text>
        <Text style={styles.hint}>Add a professional photo to help clients recognize you</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          {profilePhoto ? (
            <View style={styles.photoPreview}>
              <Image 
                source={{ uri: profilePhoto }} 
                style={styles.photoPreviewImage}
                resizeMode="cover"
              />
              <View style={styles.photoOverlay}>
                <Ionicons name="camera" size={24} color="#ffffff" />
                <Text style={styles.photoOverlayText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconContainer}>
                <Ionicons name="camera-outline" size={32} color="#2563eb" />
              </View>
              <Text style={styles.photoButtonText}>Add Photo</Text>
              <Text style={styles.photoHint}>Tap to upload from your device</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Bio *</Text>
          <Text style={styles.charCount}>{bio.length} / 500</Text>
        </View>
        <Text style={styles.hint}>
          Share your background, experience, and what makes you unique. This helps clients get to know you.
        </Text>
        <TextInput
          style={[styles.textArea, bioFocused && styles.textAreaFocused]}
          placeholder="Tell clients about your experience and approach..."
          placeholderTextColor="#94a3b8"
          value={bio}
          onChangeText={(text) => {
            if (text.length <= 500) {
              setBio(text);
            }
          }}
          onFocus={() => setBioFocused(true)}
          onBlur={() => setBioFocused(false)}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={500}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Specialties</Text>
        <Text style={styles.hint}>Add your areas of expertise (e.g., Personal Training, Yoga, Nutrition)</Text>
        <View style={styles.specialtyInputContainer}>
          <TextInput
            style={[styles.specialtyInput, specialtyInputFocused && styles.inputFocused]}
            placeholder="e.g., Personal Training, Yoga"
            placeholderTextColor="#94a3b8"
            value={specialtyInput}
            onChangeText={setSpecialtyInput}
            onFocus={() => setSpecialtyInputFocused(true)}
            onBlur={() => setSpecialtyInputFocused(false)}
            onSubmitEditing={addSpecialty}
          />
          <TouchableOpacity
            style={[styles.addButton, !specialtyInput.trim() && styles.addButtonDisabled]}
            onPress={addSpecialty}
            disabled={!specialtyInput.trim()}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        {specialties.length > 0 ? (
          <View style={styles.specialtyTags}>
            {specialties.map((specialty, index) => (
              <View key={index} style={styles.specialtyTag}>
                <Text style={styles.specialtyTagText}>{specialty}</Text>
                <TouchableOpacity
                  onPress={() => removeSpecialty(index)}
                  style={styles.specialtyRemoveButton}
                >
                  <Ionicons name="close-circle" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptySpecialties}>
            <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
            <Text style={styles.emptySpecialtiesText}>No specialties added yet</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (loading || !bio.trim()) && styles.buttonDisabled]}
        onPress={handleSaveProfile}
        disabled={loading || !bio.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderServicesStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Your Services</Text>
      <Text style={styles.stepDescription}>Define the services you offer and their pricing</Text>

      {services.map((service, index) => (
        <View key={index} style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceNumber}>Service {index + 1}</Text>
            {services.length > 1 && (
              <TouchableOpacity onPress={() => removeService(index)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Service name *"
            value={service.name}
            onChangeText={(value) => updateService(index, 'name', value)}
            onFocus={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#2563eb';
                e.target.style.borderWidth = '2px';
              }
            }}
            onBlur={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.borderColor = '#1e293b';
                e.target.style.borderWidth = '1px';
              }
            }}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={service.description}
            onChangeText={(value) => updateService(index, 'description', value)}
            onFocus={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#2563eb';
                e.target.style.borderWidth = '2px';
              }
            }}
            onBlur={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.borderColor = '#1e293b';
                e.target.style.borderWidth = '1px';
              }
            }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Price ($) *"
                value={service.price}
                onChangeText={(value) => updateService(index, 'price', value)}
                onFocus={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.outline = 'none';
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.borderWidth = '2px';
                  }
                }}
                onBlur={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.borderColor = '#1e293b';
                    e.target.style.borderWidth = '1px';
                  }
                }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Duration (min) *"
                value={service.duration}
                onChangeText={(value) => updateService(index, 'duration', value)}
                onFocus={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.outline = 'none';
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.borderWidth = '2px';
                  }
                }}
                onBlur={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.borderColor = '#1e293b';
                    e.target.style.borderWidth = '1px';
                  }
                }}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
        <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
        <Text style={styles.addServiceButtonText}>Add Another Service</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveServices}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCredentialsStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Your Credentials</Text>
      <Text style={styles.stepDescription}>
        Showcase your certifications and qualifications (optional)
      </Text>

      {credentials.map((credential, index) => (
        <View key={index} style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceNumber}>Credential {index + 1}</Text>
            {credentials.length > 1 && (
              <TouchableOpacity onPress={() => removeCredential(index)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Credential name *"
            value={credential.name}
            onChangeText={(value) => updateCredential(index, 'name', value)}
            onFocus={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#2563eb';
                e.target.style.borderWidth = '2px';
              }
            }}
            onBlur={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.borderColor = '#1e293b';
                e.target.style.borderWidth = '1px';
              }
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Issuing organization"
            value={credential.issuer}
            onChangeText={(value) => updateCredential(index, 'issuer', value)}
            onFocus={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.outline = 'none';
                e.target.style.borderColor = '#2563eb';
                e.target.style.borderWidth = '2px';
              }
            }}
            onBlur={(e) => {
              if (Platform.OS === 'web') {
                e.target.style.borderColor = '#1e293b';
                e.target.style.borderWidth = '1px';
              }
            }}
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Issue date (YYYY-MM-DD)"
                value={credential.issueDate}
                onChangeText={(value) => updateCredential(index, 'issueDate', value)}
                onFocus={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.outline = 'none';
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.borderWidth = '2px';
                  }
                }}
                onBlur={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.borderColor = '#1e293b';
                    e.target.style.borderWidth = '1px';
                  }
                }}
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Expiry date (YYYY-MM-DD)"
                value={credential.expiryDate}
                onChangeText={(value) => updateCredential(index, 'expiryDate', value)}
                onFocus={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.outline = 'none';
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.borderWidth = '2px';
                  }
                }}
                onBlur={(e) => {
                  if (Platform.OS === 'web') {
                    e.target.style.borderColor = '#1e293b';
                    e.target.style.borderWidth = '1px';
                  }
                }}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addCredential}>
        <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
        <Text style={styles.addServiceButtonText}>Add Another Credential</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveCredentials}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderAvailabilityStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Set Your Availability</Text>
      <Text style={styles.stepDescription}>When are you available for bookings?</Text>

      {daysOfWeek.map((day, dayIndex) => {
        const slot = availability.find((a) => a.dayOfWeek === dayIndex);
        return (
          <View key={dayIndex} style={styles.availabilityCard}>
            <TouchableOpacity
              style={styles.availabilityHeader}
              onPress={() => toggleAvailability(dayIndex)}
            >
              <Text style={styles.availabilityDay}>{day}</Text>
              {slot ? (
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#cbd5e1" />
              )}
            </TouchableOpacity>
            {slot && (
              <View style={styles.availabilityTimes}>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9:00 AM"
                    value={slot.startTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'startTime', value)}
                    onFocus={(e) => {
                      if (Platform.OS === 'web') {
                        e.target.style.outline = 'none';
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.borderWidth = '2px';
                      }
                    }}
                    onBlur={(e) => {
                      if (Platform.OS === 'web') {
                        e.target.style.borderColor = '#1e293b';
                        e.target.style.borderWidth = '1px';
                      }
                    }}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5:00 PM"
                    value={slot.endTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'endTime', value)}
                    onFocus={(e) => {
                      if (Platform.OS === 'web') {
                        e.target.style.outline = 'none';
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.borderWidth = '2px';
                      }
                    }}
                    onBlur={(e) => {
                      if (Platform.OS === 'web') {
                        e.target.style.borderColor = '#1e293b';
                        e.target.style.borderWidth = '1px';
                      }
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveAvailability}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <View style={styles.completeContainer}>
      <Ionicons name="checkmark-circle" size={80} color="#10b981" />
      <Text style={styles.completeTitle}>Profile Complete!</Text>
      <Text style={styles.completeDescription}>
        Your provider profile is now set up. You can start receiving booking requests!
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
        <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Setup</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.headerDivider} />

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((['location', 'bank', 'profile', 'services', 'credentials', 'availability', 'complete'].indexOf(currentStep) + 1) / 7) * 100}%`,
            },
          ]}
        />
      </View>

      {currentStep === 'location' && renderLocationStep()}
      {currentStep === 'bank' && renderBankStep()}
      {currentStep === 'profile' && renderProfileStep()}
      {currentStep === 'services' && renderServicesStep()}
      {currentStep === 'credentials' && renderCredentialsStep()}
      {currentStep === 'availability' && renderAvailabilityStep()}
      {currentStep === 'complete' && renderCompleteStep()}
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
    backgroundColor: '#ffffff',
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
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  stepContent: {
    flex: 1,
    padding: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputFocused: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 120,
    paddingTop: 16,
  },
  textAreaFocused: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 100,
    overflow: 'hidden',
    width: 150,
    height: 150,
    alignSelf: 'center',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  photoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 13,
    color: '#94a3b8',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 100,
  },
  photoOverlayText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  emptySpecialties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginTop: 8,
  },
  emptySpecialtiesText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  specialtyRemoveButton: {
    marginLeft: 4,
  },
  specialtyInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  specialtyInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialtyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  specialtyTagText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 24,
  },
  addServiceButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  availabilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  availabilityTimes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  bankHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  bankIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bankCardConnected: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#16a34a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bankCardIconContainer: {
    marginRight: 16,
  },
  bankInfo: {
    flex: 1,
  },
  bankAccountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  bankAccountMask: {
    fontSize: 16,
    color: '#64748b',
  },
  bankCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 6,
  },
  bankCardFooterText: {
    fontSize: 13,
    color: '#64748b',
  },
  bankCardEmpty: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  bankCardEmptyIcon: {
    marginBottom: 16,
  },
  bankCardEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  bankCardEmptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  plaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  plaidButtonText: {
    fontWeight: '600',
    color: '#ffffff',
    fontSize: 16,
  },
  bankFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  bankFeature: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bankFeatureText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  skipButton: {
    flex: 0.5,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  skipButtonText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 12,
  },
  completeDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
});

