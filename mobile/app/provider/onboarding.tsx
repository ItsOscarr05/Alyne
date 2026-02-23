import { useState, useEffect, useRef, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Linking,
  Modal as RNModal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { onboardingService } from '../../services/onboarding';
import { stripeConnectService } from '../../services/stripeConnect';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import * as ImagePicker from 'expo-image-picker';
import { LocationAutocomplete } from '../../components/ui/LocationAutocomplete';
import { filterSpecialties, type SpecialtyOption } from '../../data/wellnessSpecialties';
import { formatTime12Hour, formatTime24Hour } from '../../utils/timeUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';
import { persistentStorage } from '../../utils/storage';

const ONBOARDING_STORAGE_KEY = 'provider_onboarding_draft';
const PERSIST_DEBOUNCE_MS = 1000;

type Step =
  | 'location'
  | 'bank'
  | 'profile'
  | 'services'
  | 'credentials'
  | 'availability'
  | 'complete';

const STEPS: { id: Step; label: string; icon: string }[] = [
  { id: 'location', label: 'Location', icon: 'location-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
  { id: 'services', label: 'Services', icon: 'briefcase-outline' },
  { id: 'availability', label: 'Availability', icon: 'calendar-outline' },
  { id: 'credentials', label: 'Credentials', icon: 'ribbon-outline' },
  { id: 'bank', label: 'Payouts', icon: 'card-outline' },
];

const STEP_ORDER: Step[] = [
  'location',
  'profile',
  'services',
  'availability',
  'credentials',
  'bank',
  'complete',
];

export default function ProviderOnboardingScreen() {
  const router = useRouter();
  const { step, stripe: stripeParam } = useLocalSearchParams<{ step?: Step; stripe?: string }>();
  const { user, refreshUser, setUserFromResponse } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme: themeHook } = useTheme();
  const [currentStep, setCurrentStep] = useState<Step>('location');
  const currentStepIndex =
    currentStep === 'complete' ? 6 : STEPS.findIndex((s) => s.id === currentStep) + 1;
  const [loading, setLoading] = useState(false);

  // Redirect if not a provider
  useEffect(() => {
    if (user && user.userType !== 'PROVIDER') {
      router.replace('/(tabs)/profile');
    }
  }, [user, router]);

  // Allow deep-linking to a specific onboarding step (used by Stripe return_url/refresh_url on web).
  useEffect(() => {
    if (step && typeof step === 'string') {
      const allowed: Step[] = [
        'location',
        'bank',
        'profile',
        'services',
        'credentials',
        'availability',
        'complete',
      ];
      if (allowed.includes(step as Step)) {
        setCurrentStep(step as Step);
      }
    }
  }, [step]);

  // Refresh Stripe status when on bank step (e.g. after returning from Stripe, or when navigating to step)
  useEffect(() => {
    const onBankStep = step === 'bank' || currentStep === 'bank';
    if (onBankStep && user?.id) {
      refreshStripeStatus();
    }
  }, [step, currentStep, user?.id]);

  // Track if profile has been loaded to prevent reloading
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Profile state
  const [bio, setBio] = useState('');
  const [bioFocused, setBioFocused] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [specialtyInputFocused, setSpecialtyInputFocused] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);

  // Service state
  const [services, setServices] = useState<
    Array<{
      id?: string;
      name: string;
      description: string;
      price: string;
      duration: string;
      durationUnit: 'min' | 'hr';
    }>
  >([{ name: '', description: '', price: '', duration: '', durationUnit: 'min' }]);

  const [durationUnitDropdownOpen, setDurationUnitDropdownOpen] = useState<number | null>(null);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'issue' | 'expiry' | null>(null);
  const [datePickerIndex, setDatePickerIndex] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [datePickerStep, setDatePickerStep] = useState<'year' | 'month' | 'day'>('year');
  const yearScrollViewRef = useRef<ScrollView>(null);

  const durationUnitOptions: { value: 'min' | 'hr'; label: string }[] = [
    { value: 'min', label: 'min' },
    { value: 'hr', label: 'hr' },
  ];

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
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Bank account state
  const [bankAccountConnected, setBankAccountConnected] = useState(false);
  const [bankAccountInfo, setBankAccountInfo] = useState<{
    accountName: string;
    accountMask: string;
  } | null>(null);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load and merge with persisted draft (for recovery after refresh)
  const loadPersistedDraft = useCallback(async () => {
    try {
      const raw = await persistentStorage.getItem(`${ONBOARDING_STORAGE_KEY}_${user?.id || ''}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Only use if reasonably recent (e.g. within 7 days)
      const savedAt = parsed.savedAt;
      if (savedAt && Date.now() - savedAt > 7 * 24 * 60 * 60 * 1000) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [user?.id]);

  // Load existing profile data when component mounts (for edit mode)
  const loadExistingProfile = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID, skipping profile load');
      return;
    }

    if (profileLoaded) {
      console.log('Profile already loaded, skipping');
      return;
    }

    try {
      // Load persisted draft first to merge with backend
      const draft = await loadPersistedDraft();

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
        // Load bio and specialties (merge: use backend if present, else draft)
        if (profile.bio) {
          console.log('Setting bio to:', profile.bio.substring(0, 50) + '...');
          setBio(profile.bio);
          logger.debug('Set bio', { bioLength: profile.bio.length });
        } else if (draft?.bio) {
          setBio(draft.bio);
        }
        if (profile.specialties && profile.specialties.length > 0) {
          console.log('Setting specialties to:', profile.specialties);
          setSpecialties(profile.specialties);
          logger.debug('Set specialties', { count: profile.specialties.length });
        } else if (draft?.specialties?.length) {
          setSpecialties(draft.specialties);
        }

        // Load profile photo (merge: backend first, then draft)
        if (user.profilePhoto) {
          setProfilePhoto(user.profilePhoto);
        } else if (draft?.profilePhoto) {
          setProfilePhoto(draft.profilePhoto);
        }

        // Load service area (location) - merge with draft if backend lacks city/state
        console.log('Checking serviceArea:', profile.serviceArea);
        if (draft?.city) setCity(draft.city);
        if (draft?.state) setState(draft.state);
        if (draft?.serviceRadius) setServiceRadius(draft.serviceRadius);
        if (draft?.coordinates) setCoordinates(draft.coordinates);
        if (profile.serviceArea) {
          const serviceArea = profile.serviceArea as {
            center?: { lat?: number; lng?: number };
            radius?: number;
          };
          console.log('Parsed serviceArea:', serviceArea);

          if (serviceArea.radius) {
            // Convert radius from km to miles for display
            const radiusInMiles = (serviceArea.radius / 1.60934).toFixed(0);
            console.log('Setting service radius to:', radiusInMiles);
            setServiceRadius(radiusInMiles);
            logger.debug('Set service radius', { radiusInMiles });
          }

          if (serviceArea.center) {
            const lat = serviceArea.center.lat;
            const lng = serviceArea.center.lng;
            if (typeof lat === 'number' && typeof lng === 'number') {
              setCoordinates({ lat, lng });
              logger.debug('Set coordinates', { center: serviceArea.center });
            }

            // Try to reverse geocode to get city/state
            if (lat != null && lng != null && lat !== 0 && lng !== 0) {
              try {
                const reverseGeocodeResult = await Location.reverseGeocodeAsync({
                  latitude: lat,
                  longitude: lng,
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
            price: parseFloat(service.price.toString()).toFixed(2),
            duration: service.duration.toString(),
            durationUnit: 'min' as const,
          }));
          setServices(formattedServices);
          logger.debug('Set services', { count: formattedServices.length });
        } else if (
          draft?.services?.length &&
          draft.services.length > (profile.services?.length || 0)
        ) {
          // User may have added more services in draft before refreshing
          setServices(draft.services);
        } else if (draft?.services?.length) {
          setServices(draft.services);
        } else {
          // If no services, ensure at least one empty service for adding
          setServices([
            { name: '', description: '', price: '', duration: '', durationUnit: 'min' },
          ]);
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
        } else if (draft?.availability?.length) {
          setAvailability(draft.availability);
        }

        // Load Stripe payout status (if already onboarded)
        try {
          const stripeStatus = await stripeConnectService.getStatus();
          const isConnected =
            (stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled) ||
            stripeStatus?.detailsSubmitted === true;
          if (isConnected) {
            setBankAccountConnected(true);
            setBankAccountInfo({
              accountName: stripeStatus?.bankAccount?.bankName || 'Bank Account',
              accountMask: stripeStatus?.bankAccount?.last4 || '••••',
            });
            logger.debug('Stripe connected');
          }
        } catch (error) {
          // Not onboarded yet or error loading - that's okay
          logger.debug('No Stripe payout status or error loading', error);
        }

        // Restore current step from draft (user's position before refresh)
        if (draft?.currentStep) {
          const allowed: Step[] = ['location', 'bank', 'profile', 'services', 'credentials', 'availability', 'complete'];
          if (allowed.includes(draft.currentStep)) {
            setCurrentStep(draft.currentStep);
          }
        }

        // Mark profile as loaded
        console.log('Profile loading complete, marking as loaded');
        setProfileLoaded(true);
      } else {
        // No profile yet - restore entirely from draft
        if (draft) {
          if (draft.city) setCity(draft.city);
          if (draft.state) setState(draft.state);
          if (draft.serviceRadius) setServiceRadius(draft.serviceRadius);
          if (draft.coordinates) setCoordinates(draft.coordinates);
          if (draft.bio) setBio(draft.bio);
          if (draft.specialties?.length) setSpecialties(draft.specialties);
          if (draft.profilePhoto) setProfilePhoto(draft.profilePhoto);
          if (draft.services?.length) setServices(draft.services);
          if (draft.credentials?.length) setCredentials(draft.credentials);
          if (draft.availability?.length) setAvailability(draft.availability);
          if (draft.currentStep) {
            const allowed: Step[] = ['location', 'bank', 'profile', 'services', 'credentials', 'availability', 'complete'];
            if (allowed.includes(draft.currentStep)) setCurrentStep(draft.currentStep);
          }
        }
        setProfileLoaded(true);
      }
    } catch (error: any) {
      // Profile doesn't exist yet or error - try to restore from draft
      logger.debug('No existing profile found or error loading', {
        error: error.message,
        statusCode: error.response?.status,
      });
      if (error.response?.status !== 404) {
        console.error('Error loading existing profile:', error);
      }
      try {
        const draft = await loadPersistedDraft();
        if (draft) {
          if (draft.city) setCity(draft.city);
          if (draft.state) setState(draft.state);
          if (draft.serviceRadius) setServiceRadius(draft.serviceRadius);
          if (draft.coordinates) setCoordinates(draft.coordinates);
          if (draft.bio) setBio(draft.bio);
          if (draft.specialties?.length) setSpecialties(draft.specialties);
          if (draft.profilePhoto) setProfilePhoto(draft.profilePhoto);
          if (draft.services?.length) setServices(draft.services);
          if (draft.credentials?.length) setCredentials(draft.credentials);
          if (draft.availability?.length) setAvailability(draft.availability);
          if (draft.currentStep) {
            const allowed: Step[] = ['location', 'bank', 'profile', 'services', 'credentials', 'availability', 'complete'];
            if (allowed.includes(draft.currentStep)) setCurrentStep(draft.currentStep);
          }
        }
      } finally {
        setProfileLoaded(true);
      }
    }
  }, [user?.id, profileLoaded, loadPersistedDraft]);

  // Load existing profile data when component mounts (for edit mode)
  useEffect(() => {
    if (user?.id && user.userType === 'PROVIDER' && !profileLoaded) {
      loadExistingProfile();
    }
  }, [user?.id, user?.userType, profileLoaded, loadExistingProfile]);

  // Persist onboarding draft to storage (debounced) so it survives refresh
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    const persist = () => {
      const payload = {
        currentStep,
        city,
        state,
        serviceRadius,
        coordinates,
        bio,
        specialties,
        profilePhoto,
        services,
        credentials,
        availability,
        savedAt: Date.now(),
      };
      persistentStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, JSON.stringify(payload)).catch(() => {});
    };
    const t = setTimeout(persist, PERSIST_DEBOUNCE_MS);
    persistTimeoutRef.current = t;
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [
    user?.id,
    currentStep,
    city,
    state,
    serviceRadius,
    coordinates,
    bio,
    specialties,
    profilePhoto,
    services,
    credentials,
    availability,
  ]);

  // Stripe Connect onboarding for provider payouts.

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

  const openUrl = async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(url, '_blank');
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      logger.error('Failed to open URL', e);
      Alert.alert('Error', 'Failed to open the onboarding link. Please try again.');
    }
  };

  const startStripeOnboarding = async () => {
    try {
      setLoading(true);
      const { url } = await stripeConnectService.createOnboardingLink();
      openUrl(url); // Don't await - on mobile the app backgrounds and the promise may never resolve
      // After returning, user can tap "Refresh status" or auto-refresh runs
    } catch (error: any) {
      logger.error('Error creating Stripe onboarding link', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to start payout setup.'
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    try {
      setLoading(true);
      const status = await stripeConnectService.getStatus();
      // Consider connected if payouts are enabled, OR if they've completed the form (details submitted)
      // Payouts can take time to enable after form submission while Stripe verifies the bank
      const isConnected =
        (status?.chargesEnabled && status?.payoutsEnabled) || status?.detailsSubmitted === true;
      if (isConnected) {
        setBankAccountConnected(true);
        setBankAccountInfo({
          accountName: status?.bankAccount?.bankName || 'Bank Account',
          accountMask: status?.bankAccount?.last4 || '••••',
        });
      } else {
        setBankAccountConnected(false);
        setBankAccountInfo(null);
      }
    } catch (error: any) {
      logger.error('Error fetching Stripe payout status', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to refresh payout status.'
      );
    } finally {
      setLoading(false);
    }
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

    setCurrentStep('profile');
  };

  const handleSaveBank = async () => {
    // Bank is optional, can skip
    setCurrentStep('complete');
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

  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);

  const specialtySuggestions = filterSpecialties(specialtyInput).filter(
    (s) => !specialties.includes(s.value)
  );

  const addSpecialty = (value?: string) => {
    const toAdd = (value ?? specialtyInput.trim()).trim();
    if (toAdd && !specialties.includes(toAdd)) {
      setSpecialties([...specialties, toAdd]);
      setSpecialtyInput('');
      setShowSpecialtyDropdown(false);
    }
  };

  const selectSpecialty = (option: SpecialtyOption) => {
    addSpecialty(option.value);
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([
      ...services,
      { name: '', description: '', price: '', duration: '', durationUnit: 'min' },
    ]);
    setDurationUnitDropdownOpen(null);
  };

  const formatPrice = (value: string): string => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    if (!numericValue) return '';
    const num = parseFloat(numericValue);
    if (isNaN(num)) return value;
    return num.toFixed(2);
  };

  const handlePriceBlur = (index: number, value: string) => {
    if (value.trim()) {
      const formatted = formatPrice(value);
      updateService(index, 'price', formatted);
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
    setDurationUnitDropdownOpen(null);
  };

  const updateService = (index: number, field: string, value: string | 'min' | 'hr') => {
    const updated = [...services];
    if (field === 'durationUnit') {
      updated[index] = { ...updated[index], durationUnit: value as 'min' | 'hr' };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setServices(updated);
  };

  const durationToMinutes = (value: string, unit: 'min' | 'hr'): number => {
    const num = parseFloat(value) || 0;
    return unit === 'hr' ? Math.round(num * 60) : Math.round(num);
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

  const formatDateMMDDYYYY = (date: Date | string | null): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const mmddyyyy = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1], 10) - 1;
      const day = parseInt(mmddyyyy[2], 10);
      const year = parseInt(mmddyyyy[3], 10);
      return new Date(year, month, day);
    }
    const yyyymmdd = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      return new Date(year, month, day);
    }
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const generateYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    const startYear = Math.floor((currentYear - 50) / 10) * 10;
    const endYear = Math.floor((currentYear + 15) / 10) * 10 + 9;
    for (let i = startYear; i <= endYear; i++) years.push(i);
    return years;
  };

  const groupYearsByDecade = () => {
    const years = generateYears();
    const groups: { decade: string; years: number[] }[] = [];
    let currentDecade = '';
    let currentYears: number[] = [];
    years.forEach((year) => {
      const decade = `${Math.floor(year / 10) * 10}s`;
      if (decade !== currentDecade) {
        if (currentYears.length > 0) {
          groups.push({ decade: currentDecade, years: currentYears });
        }
        currentDecade = decade;
        currentYears = [year];
      } else {
        currentYears.push(year);
      }
    });
    if (currentYears.length > 0) {
      groups.push({ decade: currentDecade, years: currentYears.reverse() });
    }
    return groups.reverse();
  };

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const openDatePicker = (type: 'issue' | 'expiry', index: number) => {
    const credential = credentials[index];
    const dateString = type === 'issue' ? credential.issueDate : credential.expiryDate;
    const date = parseDate(dateString);
    const initialDate = date || new Date();
    setSelectedDate(initialDate);
    setSelectedYear(initialDate.getFullYear());
    setSelectedMonth(initialDate.getMonth());
    setDatePickerType(type);
    setDatePickerIndex(index);
    setDatePickerStep('year');
    setDatePickerVisible(true);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setDatePickerStep('month');
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setDatePickerStep('day');
  };

  const handleDaySelect = (day: number) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const formatted = formatDateMMDDYYYY(date);
    updateCredential(
      datePickerIndex,
      datePickerType === 'issue' ? 'issueDate' : 'expiryDate',
      formatted
    );
    setDatePickerVisible(false);
    setDatePickerStep('year');
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

  const hasValidService = services.some(
    (s) => s.name.trim() && s.price && s.duration
  );

  const handleSaveServices = async () => {
    const validServices = services.filter((s) => s.name.trim() && s.price && s.duration);
    if (validServices.length === 0) {
      Alert.alert('Required', 'Please add at least one service.');
      return;
    }

    setLoading(true);
    try {
      for (const service of validServices) {
        const durationMinutes = durationToMinutes(service.duration, service.durationUnit);
        if (service.id) {
          // Update existing service
          await onboardingService.updateService(service.id, {
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: durationMinutes,
          });
        } else {
          // Create new service
          await onboardingService.createService({
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: durationMinutes,
          });
        }
      }
      setCurrentStep('availability');
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
      setCurrentStep('bank');
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
      setCurrentStep('credentials');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { user: completedUser } = await onboardingService.completeOnboarding();
      await setUserFromResponse(completedUser);
      if (user?.id) {
        await persistentStorage.removeItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`);
      }
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to complete setup. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderLocationStep = () => (
    <ScrollView
      style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}
      contentContainerStyle={styles.stepContentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View
        style={[
          styles.stepHero,
          {
            backgroundColor: themeHook.colors.primaryLight + '40',
            borderColor: themeHook.colors.primary + '30',
          },
        ]}
      >
        <View style={styles.stepHeroRow}>
          <View style={[styles.stepHeroIcon, { backgroundColor: themeHook.colors.primary }]}>
            <Ionicons name="location" size={28} color={themeHook.colors.white} />
          </View>
          <Text style={[styles.stepTitle, { color: themeHook.colors.text }]}>
            Set Your Service Area
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: themeHook.colors.textSecondary }]}>
          Tell us where you're based so clients in your area can discover you. We'll use this to
          match you with nearby clients and show your profile in local searches.
        </Text>
      </View>

      {/* Location Card */}
      <View
        style={[
          styles.formCard,
          styles.locationFormCard,
          { backgroundColor: themeHook.colors.surface },
        ]}
      >
        <Text style={[styles.cardSectionTitle, { color: themeHook.colors.text }]}>
          Your base location
        </Text>
        <Text style={[styles.cardSectionHint, { color: themeHook.colors.textSecondary }]}>
          Enter the city and state where you typically provide services.
        </Text>
        <View style={styles.formCardSpacer} />
        <View style={styles.locationInputWrapper}>
          <LocationAutocomplete
            city={city}
            state={state}
            onCityChange={setCity}
            onStateChange={setState}
            onCoordinatesSelect={(lat, lng) => setCoordinates({ lat, lng })}
            cityPlaceholder="Tap to choose or type to search"
            statePlaceholder="e.g. California"
          />
        </View>
      </View>

      <View style={styles.stepButtonSpacer} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              flex: 1,
              marginTop: 0,
              backgroundColor: themeHook.colors.primary,
              flexDirection: 'row',
              gap: 8,
            },
            (!city.trim() || !state.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleSaveLocation}
          disabled={!city.trim() || !state.trim()}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color={themeHook.colors.white} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderBankStep = () => (
    <ScrollView
      style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.stepHero,
          {
            backgroundColor: themeHook.colors.primaryLight + '40',
            borderColor: themeHook.colors.primary + '30',
          },
        ]}
      >
        <View style={styles.stepHeroRow}>
          <View style={[styles.stepHeroIcon, { backgroundColor: themeHook.colors.primary }]}>
            <Ionicons name="card" size={28} color={themeHook.colors.white} />
          </View>
          <Text style={[styles.stepTitle, { color: themeHook.colors.text }]}>Set up payouts</Text>
        </View>
        <Text style={[styles.stepDescription, { color: themeHook.colors.textSecondary }]}>
          Connect your bank account with Stripe to receive payments from clients. You'll get paid
          securely after each completed session—no upfront fees.
        </Text>
      </View>

      <View style={[styles.formCard, { backgroundColor: themeHook.colors.surface }]}>
        {bankAccountConnected && bankAccountInfo ? (
          <>
            <View style={styles.bankCardHeader}>
              <View style={styles.bankCardIconContainer}>
                <Ionicons name="checkmark-circle" size={28} color={themeHook.colors.success} />
              </View>
              <View style={styles.bankInfo}>
                <Text style={[styles.bankAccountName, { color: themeHook.colors.text }]}>
                  Bank account connected
                </Text>
                <Text style={[styles.bankAccountMask, { color: themeHook.colors.textSecondary }]}>
                  {bankAccountInfo.accountName} •••• {bankAccountInfo.accountMask}
                </Text>
              </View>
            </View>
            <View style={[styles.bankCardFooter, { borderTopColor: themeHook.colors.border }]}>
              <Ionicons name="lock-closed" size={14} color={themeHook.colors.textTertiary} />
              <Text style={[styles.bankCardFooterText, { color: themeHook.colors.textTertiary }]}>
                Securely connected
              </Text>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={styles.bankCardEmptyIcon}>
              <MaterialCommunityIcons name="bank-outline" size={48} color={themeHook.colors.textTertiary} />
            </View>
            <Text style={[styles.bankCardEmptyTitle, { color: themeHook.colors.text, textAlign: 'center' }]}>
              Bank account not connected
            </Text>
            <Text style={[styles.bankCardEmptyText, { color: themeHook.colors.textSecondary }]}>
              Connect your bank to receive payments from clients.
            </Text>
          </View>
        )}
      </View>

      {!bankAccountConnected && (
        <TouchableOpacity
          style={[
            styles.payoutButton,
            { backgroundColor: '#635BFF' },
            loading && styles.buttonDisabled,
          ]}
          onPress={startStripeOnboarding}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="logo-usd" size={20} color="#ffffff" />
              <Text style={styles.payoutButtonText}>Set Up Payouts</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.skipButton, { marginTop: 12, backgroundColor: 'transparent' }]}
        onPress={refreshStripeStatus}
        disabled={loading}
      >
        <Text style={[styles.skipButtonText, { color: themeHook.colors.textTertiary }]}>
          Refresh Status
        </Text>
      </TouchableOpacity>

      <View
        style={[
          styles.formCard,
          styles.bankFeatures,
          { backgroundColor: themeHook.colors.surface },
        ]}
      >
        <View style={styles.bankFeature}>
          <Ionicons name="shield-checkmark-outline" size={22} color={themeHook.colors.primary} />
          <Text style={[styles.bankFeatureText, { color: themeHook.colors.textSecondary }]}>
            Stripe-hosted secure onboarding
          </Text>
        </View>
        <View style={styles.bankFeature}>
          <Ionicons name="flash-outline" size={22} color={themeHook.colors.primary} />
          <Text style={[styles.bankFeatureText, { color: themeHook.colors.textSecondary }]}>
            Global-ready payout infrastructure
          </Text>
        </View>
        <View style={styles.bankFeature}>
          <Ionicons name="time-outline" size={22} color={themeHook.colors.primary} />
          <Text style={[styles.bankFeatureText, { color: themeHook.colors.textSecondary }]}>
            Payout after session completion
          </Text>
        </View>
      </View>

      <View style={styles.stepButtonSpacer} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              flex: 1,
              marginTop: 0,
              backgroundColor: themeHook.colors.primary,
              flexDirection: 'row',
              gap: 8,
            },
            !bankAccountConnected && styles.buttonDisabled,
          ]}
          onPress={handleSaveBank}
          disabled={!bankAccountConnected}
        >
          <Text style={styles.primaryButtonText}>
            {bankAccountConnected ? 'Complete Provider Setup' : 'Continue'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={themeHook.colors.white} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderProfileStep = () => (
    <ScrollView
      style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.stepHero,
          {
            backgroundColor: themeHook.colors.primaryLight + '40',
            borderColor: themeHook.colors.primary + '30',
          },
        ]}
      >
        <View style={styles.stepHeroRow}>
          <View style={[styles.stepHeroIcon, { backgroundColor: themeHook.colors.primary }]}>
            <Ionicons name="person" size={28} color={themeHook.colors.white} />
          </View>
          <Text style={[styles.stepTitle, { color: themeHook.colors.text }]}>
            Tell us about yourself
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: themeHook.colors.textSecondary }]}>
          Create your professional profile to help clients get to know you. A great bio and photo
          help you stand out.
        </Text>
      </View>

      <View
        style={[styles.formCard, styles.section, { backgroundColor: themeHook.colors.surface }]}
      >
        <Text style={[styles.cardSectionTitle, { color: themeHook.colors.text }]}>
          Profile Photo
        </Text>
        <Text style={[styles.cardSectionHint, { color: themeHook.colors.textSecondary }]}>
          Add a professional photo to help clients recognize you
        </Text>
        <View style={styles.formCardSpacer} />
        <TouchableOpacity
          style={styles.photoSectionTouchable}
          onPress={pickImage}
          activeOpacity={0.7}
        >
          {profilePhoto ? (
            <View style={styles.photoButton}>
              <View style={styles.photoPreview}>
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.photoPreviewImage}
                  resizeMode="cover"
                  onError={() => {
                    // Silently handle image load errors
                  }}
                />
                <View style={styles.photoOverlay}>
                  <Ionicons name="camera" size={24} color="#ffffff" />
                  <Text style={styles.photoOverlayText}>Change Photo</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholderWrapper}>
              <View style={[styles.photoButton, { borderColor: themeHook.colors.primary }]}>
                <View style={styles.photoIconContainer}>
                  <Ionicons name="camera-outline" size={36} color={themeHook.colors.primary} />
                </View>
              </View>
              <Text style={[styles.photoButtonText, { color: themeHook.colors.primary }]}>
                Add Photo
              </Text>
              <Text style={[styles.photoHint, { color: themeHook.colors.textSecondary }]}>
                Tap to upload from your device
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View
        style={[styles.formCard, styles.section, { backgroundColor: themeHook.colors.surface }]}
      >
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: themeHook.colors.text }]}>Bio *</Text>
          <Text style={[styles.charCount, { color: themeHook.colors.textTertiary }]}>
            {bio.length} / 500
          </Text>
        </View>
        <Text style={[styles.cardSectionHint, { color: themeHook.colors.textSecondary }]}>
          Share your background, experience, and what makes you unique. This helps clients get to
          know you.
        </Text>
        <View style={styles.formCardSpacer} />
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: themeHook.colors.background, color: themeHook.colors.text },
            bioFocused && styles.inputFocused,
          ]}
          placeholder="Tell clients about your experience and approach..."
          placeholderTextColor={themeHook.colors.textTertiary}
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
        <Text style={[styles.label, { color: themeHook.colors.text }]}>Specialties</Text>
        <Text style={[styles.hint, { color: themeHook.colors.textSecondary }]}>
          Select your areas of expertise from the list, or add your own
        </Text>
        <View style={styles.specialtyInputWrapper}>
          <View
            style={[styles.specialtyInputContainer, specialtyInputFocused && styles.inputFocused]}
          >
            <TextInput
              style={[
                styles.specialtyInput,
                { backgroundColor: themeHook.colors.surface, color: themeHook.colors.text },
              ]}
              placeholder="Tap to choose or type to search..."
              placeholderTextColor={themeHook.colors.textTertiary}
              value={specialtyInput}
              onChangeText={setSpecialtyInput}
              onFocus={() => {
                setSpecialtyInputFocused(true);
                setShowSpecialtyDropdown(true);
              }}
              onBlur={() => {
                setSpecialtyInputFocused(false);
                setTimeout(() => setShowSpecialtyDropdown(false), 200);
              }}
              onSubmitEditing={() => addSpecialty()}
            />
            <TouchableOpacity
              style={[styles.addButton, !specialtyInput.trim() && styles.addButtonDisabled]}
              onPress={() => addSpecialty()}
              disabled={!specialtyInput.trim()}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {showSpecialtyDropdown && (
            <View
              style={[
                styles.specialtyDropdown,
                { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border },
              ]}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={styles.specialtyDropdownScroll}
              >
                {specialtySuggestions.length > 0 ? (
                  specialtySuggestions.map((option, index) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.specialtyDropdownItem,
                        index < specialtySuggestions.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: themeHook.colors.border,
                        },
                      ]}
                      onPress={() => selectSpecialty(option)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[styles.specialtyDropdownItemText, { color: themeHook.colors.text }]}
                      >
                        {option.value}
                      </Text>
                      <Text
                        style={[
                          styles.specialtyDropdownItemNiche,
                          { color: themeHook.colors.textTertiary },
                        ]}
                      >
                        {option.niche}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.specialtyDropdownEmpty, { padding: theme.spacing.lg }]}>
                    <Text
                      style={[
                        styles.specialtyDropdownEmptyText,
                        { color: themeHook.colors.textSecondary },
                      ]}
                    >
                      {specialtyInput.trim()
                        ? 'No matches—add custom with + button'
                        : 'All specialties selected'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
        {specialties.length > 0 ? (
          <View style={styles.specialtyTags}>
            {specialties.map((specialty, index) => (
              <View
                key={`${specialty}-${index}`}
                style={[styles.specialtyTag, { backgroundColor: themeHook.colors.primaryLight }]}
              >
                <Text style={[styles.specialtyTagText, { color: themeHook.colors.primary }]}>
                  {specialty}
                </Text>
                <TouchableOpacity
                  onPress={() => removeSpecialty(index)}
                  style={styles.specialtyRemoveButton}
                >
                  <Ionicons name="close-circle" size={18} color={themeHook.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptySpecialties, { backgroundColor: themeHook.colors.background }]}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={themeHook.colors.textTertiary}
            />
            <Text style={[styles.emptySpecialtiesText, { color: themeHook.colors.textSecondary }]}>
              No specialties added yet
            </Text>
          </View>
        )}
      </View>

      <View style={styles.stepButtonSpacer} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              flex: 1,
              marginTop: 0,
              backgroundColor: themeHook.colors.primary,
              flexDirection: 'row',
              gap: 8,
            },
            (loading || !bio.trim()) && styles.buttonDisabled,
          ]}
          onPress={handleSaveProfile}
          disabled={loading || !bio.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={themeHook.colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderServicesStep = () => (
    <ScrollView
      style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.stepHero,
          {
            backgroundColor: themeHook.colors.primaryLight + '40',
            borderColor: themeHook.colors.primary + '30',
          },
        ]}
      >
        <View style={styles.stepHeroRow}>
          <View style={[styles.stepHeroIcon, { backgroundColor: themeHook.colors.primary }]}>
            <Ionicons name="briefcase" size={28} color={themeHook.colors.white} />
          </View>
          <Text style={[styles.stepTitle, { color: themeHook.colors.text }]}>Add Your Services</Text>
        </View>
        <Text style={[styles.stepDescription, { color: themeHook.colors.textSecondary }]}>
          Define the services you offer, their pricing, and duration. Clients will see these when
          booking with you.
        </Text>
      </View>

      {services.map((service, index) => (
        <View
          key={index}
          style={[
            styles.serviceCardOnboarding,
            {
              backgroundColor: themeHook.colors.surfaceElevated,
              borderColor: themeHook.colors.primary,
            },
          ]}
        >
          <View style={styles.serviceCardContent}>
            <View style={[styles.serviceHeader, styles.serviceCardHeader]}>
              <Text style={[styles.serviceNumber, { color: themeHook.colors.text }]}>
                Service {index + 1}
              </Text>
              {services.length > 1 && (
                <TouchableOpacity onPress={() => removeService(index)}>
                  <Ionicons name="trash-outline" size={20} color={themeHook.colors.error} />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeHook.colors.surface,
                  borderColor: themeHook.colors.border,
                  color: themeHook.colors.text,
                },
                focusedInputId === `svc-${index}-name` && styles.inputFocused,
              ]}
              placeholder="Service name *"
              placeholderTextColor={themeHook.colors.textTertiary}
              value={service.name}
              onChangeText={(value) => updateService(index, 'name', value)}
              onFocus={() => setFocusedInputId(`svc-${index}-name`)}
              onBlur={() => setFocusedInputId(null)}
            />
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: themeHook.colors.surface,
                  borderColor: themeHook.colors.border,
                  color: themeHook.colors.text,
                },
                focusedInputId === `svc-${index}-desc` && styles.inputFocused,
              ]}
              placeholder="Description"
              placeholderTextColor={themeHook.colors.textTertiary}
              value={service.description}
              onChangeText={(value) => updateService(index, 'description', value)}
              onFocus={() => setFocusedInputId(`svc-${index}-desc`)}
              onBlur={() => setFocusedInputId(null)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <View
                  style={[
                    styles.inputWithPrefix,
                    {
                      backgroundColor: themeHook.colors.surface,
                      borderColor:
                        focusedInputId === `svc-${index}-price`
                          ? themeHook.colors.primary
                          : themeHook.colors.border,
                      borderWidth: focusedInputId === `svc-${index}-price` ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.inputPrefix, { color: themeHook.colors.text }]}>$</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithSuffixInput,
                      {
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                        color: themeHook.colors.text,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={themeHook.colors.textTertiary}
                    value={service.price}
                    onChangeText={(value) => updateService(index, 'price', value)}
                    onFocus={() => setFocusedInputId(`svc-${index}-price`)}
                    onBlur={() => {
                      setFocusedInputId(null);
                      handlePriceBlur(index, service.price);
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.durationInputWrapper}>
                <View style={styles.durationRow}>
                  <View
                    style={[
                      styles.durationInputContainer,
                      {
                        backgroundColor: themeHook.colors.surface,
                        borderColor:
                          focusedInputId === `svc-${index}-duration`
                            ? themeHook.colors.primary
                            : themeHook.colors.border,
                        borderWidth: focusedInputId === `svc-${index}-duration` ? 2 : 1,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.durationInput, { color: themeHook.colors.text }]}
                      placeholder="0"
                      placeholderTextColor={themeHook.colors.textTertiary}
                      value={service.duration}
                      onChangeText={(value) => updateService(index, 'duration', value)}
                      onFocus={() => setFocusedInputId(`svc-${index}-duration`)}
                      onBlur={() => setFocusedInputId(null)}
                      keyboardType="numeric"
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.durationUnitButton,
                      {
                        backgroundColor: themeHook.colors.surface,
                        borderColor:
                          durationUnitDropdownOpen === index
                            ? themeHook.colors.primary
                            : themeHook.colors.border,
                        borderWidth: durationUnitDropdownOpen === index ? 2 : 1,
                      },
                    ]}
                    onPress={() =>
                      setDurationUnitDropdownOpen(durationUnitDropdownOpen === index ? null : index)
                    }
                  >
                    <Text style={[styles.durationUnitButtonText, { color: themeHook.colors.text }]}>
                      {service.durationUnit}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={themeHook.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {durationUnitDropdownOpen === index && (
                  <View
                    style={[
                      styles.durationUnitDropdown,
                      {
                        backgroundColor: themeHook.colors.surface,
                        borderColor: themeHook.colors.border,
                      },
                    ]}
                  >
                    {durationUnitOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.durationUnitOption,
                          opt.value === service.durationUnit && {
                            backgroundColor: themeHook.colors.primaryLight,
                          },
                        ]}
                        onPress={() => {
                          updateService(index, 'durationUnit', opt.value);
                          setDurationUnitDropdownOpen(null);
                        }}
                      >
                        <Text
                          style={[styles.durationUnitOptionText, { color: themeHook.colors.text }]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.addServiceButton, { borderColor: themeHook.colors.primary }]}
        onPress={addService}
      >
        <Ionicons name="add-circle-outline" size={20} color={themeHook.colors.primary} />
        <Text style={[styles.addServiceButtonText, { color: themeHook.colors.primary }]}>
          Add Another Service
        </Text>
      </TouchableOpacity>

      <View style={styles.stepButtonSpacer} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              flex: 1,
              marginTop: 0,
              backgroundColor: themeHook.colors.primary,
              flexDirection: 'row',
              gap: 8,
            },
            (loading || !hasValidService) && styles.buttonDisabled,
          ]}
          onPress={handleSaveServices}
          disabled={loading || !hasValidService}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={themeHook.colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderCredentialsStep = () => (
    <ScrollView
      style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.stepHero,
          {
            backgroundColor: themeHook.colors.primaryLight + '40',
            borderColor: themeHook.colors.primary + '30',
          },
        ]}
      >
        <View style={styles.stepHeroRow}>
          <View style={[styles.stepHeroIcon, { backgroundColor: themeHook.colors.primary }]}>
            <Ionicons name="school" size={28} color={themeHook.colors.white} />
          </View>
          <Text style={[styles.stepTitle, { color: themeHook.colors.text }]}>
            Add Your Credentials
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: themeHook.colors.textSecondary }]}>
          Showcase your certifications and qualifications. This helps clients trust your expertise
          (optional).
        </Text>
      </View>

      {credentials.map((credential, index) => (
        <View key={index} style={styles.serviceCard}>
          <View style={styles.credentialCardContent}>
            <View style={[styles.serviceHeader, styles.serviceCardHeader]}>
              <Text style={styles.serviceNumber}>Credential {index + 1}</Text>
              {credentials.length > 1 && (
                <TouchableOpacity onPress={() => removeCredential(index)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={[styles.input, focusedInputId === `cred-${index}-name` && styles.inputFocused]}
              placeholder="Qualification Title"
              placeholderTextColor={themeHook.colors.textTertiary}
              value={credential.name}
              onChangeText={(value) => updateCredential(index, 'name', value)}
              onFocus={() => setFocusedInputId(`cred-${index}-name`)}
              onBlur={() => setFocusedInputId(null)}
            />
            <TextInput
              style={[
                styles.input,
                focusedInputId === `cred-${index}-issuer` && styles.inputFocused,
              ]}
              placeholder="Issuing Organization"
              placeholderTextColor={themeHook.colors.textTertiary}
              value={credential.issuer}
              onChangeText={(value) => updateCredential(index, 'issuer', value)}
              onFocus={() => setFocusedInputId(`cred-${index}-issuer`)}
              onBlur={() => setFocusedInputId(null)}
            />
            <View style={[styles.row, styles.dateRow]}>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: themeHook.colors.text }]}>Issue date</Text>
                <View
                  style={[
                    styles.dateInputContainer,
                    {
                      backgroundColor: themeHook.colors.surface,
                      borderColor: focusedInputId === `cred-${index}-issueDate` ? themeHook.colors.primary : themeHook.colors.border,
                      borderWidth: focusedInputId === `cred-${index}-issueDate` ? 2 : 1,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      styles.credentialDateInput,
                      styles.dateInput,
                      { backgroundColor: 'transparent', borderWidth: 0, color: themeHook.colors.text },
                    ]}
                    placeholder="MM-DD-YYYY"
                    placeholderTextColor={themeHook.colors.textTertiary}
                    value={credential.issueDate}
                    onChangeText={(value) => updateCredential(index, 'issueDate', value)}
                    onFocus={() => setFocusedInputId(`cred-${index}-issueDate`)}
                    onBlur={() => setFocusedInputId(null)}
                  />
                  <TouchableOpacity style={styles.calendarButton} onPress={() => openDatePicker('issue', index)}>
                    <Ionicons name="calendar-outline" size={20} color={themeHook.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.label, { color: themeHook.colors.text }]}>Expiry date</Text>
                <View
                  style={[
                    styles.dateInputContainer,
                    {
                      backgroundColor: themeHook.colors.surface,
                      borderColor: focusedInputId === `cred-${index}-expiryDate` ? themeHook.colors.primary : themeHook.colors.border,
                      borderWidth: focusedInputId === `cred-${index}-expiryDate` ? 2 : 1,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      styles.credentialDateInput,
                      styles.dateInput,
                      { backgroundColor: 'transparent', borderWidth: 0, color: themeHook.colors.text },
                    ]}
                    placeholder="MM-DD-YYYY"
                    placeholderTextColor={themeHook.colors.textTertiary}
                    value={credential.expiryDate}
                    onChangeText={(value) => updateCredential(index, 'expiryDate', value)}
                    onFocus={() => setFocusedInputId(`cred-${index}-expiryDate`)}
                    onBlur={() => setFocusedInputId(null)}
                  />
                  <TouchableOpacity style={styles.calendarButton} onPress={() => openDatePicker('expiry', index)}>
                    <Ionicons name="calendar-outline" size={20} color={themeHook.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.addServiceButton, { borderColor: themeHook.colors.primary }]}
        onPress={addCredential}
      >
        <Ionicons name="add-circle-outline" size={20} color={themeHook.colors.primary} />
        <Text style={[styles.addServiceButtonText, { color: themeHook.colors.primary }]}>
          Add Another Credential
        </Text>
      </TouchableOpacity>

      <View style={styles.stepButtonSpacer} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              flex: 1,
              marginTop: 0,
              backgroundColor: themeHook.colors.primary,
              flexDirection: 'row',
              gap: 8,
            },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSaveCredentials}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={themeHook.colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAvailabilityStep = () => (
    <ScrollView
      style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.stepHero,
          {
            backgroundColor: themeHook.colors.primaryLight + '40',
            borderColor: themeHook.colors.primary + '30',
          },
        ]}
      >
        <View style={styles.stepHeroRow}>
          <View style={[styles.stepHeroIcon, { backgroundColor: themeHook.colors.primary }]}>
            <Ionicons name="calendar" size={28} color={themeHook.colors.white} />
          </View>
          <Text style={[styles.stepTitle, { color: themeHook.colors.text }]}>
            Set Your Availability
          </Text>
        </View>
        <Text style={[styles.stepDescription, { color: themeHook.colors.textSecondary }]}>
          When are you available for bookings? Select the days and times clients can schedule
          sessions with you.
        </Text>
      </View>

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
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={themeHook.colors.success || '#10b981'}
                />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color={themeHook.colors.textTertiary} />
              )}
            </TouchableOpacity>
            {slot && (
              <View style={styles.availabilityTimes}>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInputId === `avail-${dayIndex}-start` && styles.inputFocused,
                    ]}
                    placeholder="9:00 AM"
                    placeholderTextColor={themeHook.colors.textTertiary}
                    value={slot.startTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'startTime', value)}
                    onFocus={() => setFocusedInputId(`avail-${dayIndex}-start`)}
                    onBlur={() => setFocusedInputId(null)}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedInputId === `avail-${dayIndex}-end` && styles.inputFocused,
                    ]}
                    placeholder="5:00 PM"
                    placeholderTextColor={themeHook.colors.textTertiary}
                    value={slot.endTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'endTime', value)}
                    onFocus={() => setFocusedInputId(`avail-${dayIndex}-end`)}
                    onBlur={() => setFocusedInputId(null)}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.stepButtonSpacer} />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              flex: 1,
              marginTop: 0,
              backgroundColor: themeHook.colors.primary,
              flexDirection: 'row',
              gap: 8,
            },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleSaveAvailability}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={themeHook.colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <View style={[styles.completeContainer, { backgroundColor: themeHook.colors.background }]}>
      <Ionicons
        name="checkmark-circle"
        size={80}
        color={themeHook.colors.success || themeHook.colors.primary}
      />
      <Text style={[styles.completeTitle, { color: themeHook.colors.text }]}>
        Profile Complete!
      </Text>
      <Text style={[styles.completeDescription, { color: themeHook.colors.textSecondary }]}>
        Your provider profile is now set up. You can start receiving booking requests!
      </Text>
      <View style={styles.stepButtonSpacer} />
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: themeHook.colors.primary },
          loading && styles.buttonDisabled,
        ]}
        onPress={handleComplete}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <KeyboardAvoidingView
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: themeHook.colors.background },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : insets.top}
    >
      <View style={[styles.header, { backgroundColor: themeHook.colors.surface }]}>
        <View style={[styles.headerBackBtn, { width: 40 }]} />
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Provider Setup</Text>
          <Text style={[styles.headerStepIndicator, { color: themeHook.colors.textSecondary }]}>
            Step {Math.min(currentStepIndex, 6)} of 6
            {currentStep !== 'complete' && STEPS.find((s) => s.id === currentStep) && (
              <> · {STEPS.find((s) => s.id === currentStep)?.label}</>
            )}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
      <View style={[styles.progressBar, { backgroundColor: themeHook.colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(Math.min(currentStepIndex, 6) / 6) * 100}%`,
              backgroundColor: themeHook.colors.primary,
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
    </KeyboardAvoidingView>

    {/* Date Picker Modal */}
    <RNModal
      visible={datePickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setDatePickerVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
        <View style={[styles.datePickerOverlay, { backgroundColor: themeHook.colors.overlay }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.datePickerContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
              <View style={[styles.datePickerHeader, { borderBottomColor: themeHook.colors.border }]}>
                <Text style={[styles.datePickerTitle, { color: themeHook.colors.text }]}>
                  Select {datePickerType === 'issue' ? 'Issue' : 'Expiry'} Date
                </Text>
                <TouchableOpacity onPress={() => setDatePickerVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={themeHook.colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContent}>
                {datePickerStep === 'year' && (
                  <ScrollView ref={yearScrollViewRef} style={styles.datePickerScrollView} showsVerticalScrollIndicator={true}>
                    {groupYearsByDecade().map(({ decade, years }) => (
                      <View key={decade} style={styles.yearDecadeSection}>
                        <Text style={[styles.yearDecadeLabel, { color: themeHook.colors.textSecondary }]}>{decade}</Text>
                        <View style={styles.yearGrid}>
                          {years.map((year) => (
                            <TouchableOpacity
                              key={year}
                              activeOpacity={0.7}
                              style={[
                                styles.yearButton,
                                { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border },
                                selectedYear === year && { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primary },
                              ]}
                              onPress={() => handleYearSelect(year)}
                            >
                              <Text
                                style={[
                                  styles.yearButtonText,
                                  { color: themeHook.colors.text },
                                  selectedYear === year && { color: themeHook.colors.white, fontWeight: '600' },
                                ]}
                              >
                                {year}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
                {datePickerStep === 'month' && (
                  <View style={styles.monthGrid}>
                    {MONTHS.map((month, monthIndex) => (
                      <TouchableOpacity
                        key={monthIndex}
                        activeOpacity={0.7}
                        style={[
                          styles.monthButton,
                          { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border },
                          selectedMonth === monthIndex && { backgroundColor: themeHook.colors.primary, borderColor: themeHook.colors.primary },
                        ]}
                        onPress={() => handleMonthSelect(monthIndex)}
                      >
                        <Text
                          style={[
                            styles.monthButtonText,
                            { color: themeHook.colors.text },
                            selectedMonth === monthIndex && { color: themeHook.colors.white, fontWeight: '600' },
                          ]}
                        >
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {datePickerStep === 'day' && (
                  <View>
                    <View style={styles.dayPickerHeader}>
                      <TouchableOpacity style={styles.dayPickerBackButton} onPress={() => setDatePickerStep('month')}>
                        <Ionicons name="chevron-back" size={20} color={themeHook.colors.primary} />
                      </TouchableOpacity>
                      <Text style={[styles.dayPickerHeaderText, { color: themeHook.colors.text }]}>
                        {MONTHS[selectedMonth]} {selectedYear}
                      </Text>
                      <View style={styles.dayPickerBackButton} />
                    </View>
                    <View style={styles.dayPickerWeekdays}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <Text key={day} style={[styles.dayPickerWeekday, { color: themeHook.colors.textSecondary }]}>
                          {day}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.dayPickerGrid}>
                      {Array.from({ length: getFirstDayOfMonth(selectedYear, selectedMonth) }).map((_, idx) => (
                        <View key={`empty-${idx}`} style={styles.dayPickerDay} />
                      ))}
                      {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map((_, index) => {
                        const day = index + 1;
                        const isSelected =
                          selectedDate &&
                          selectedDate.getFullYear() === selectedYear &&
                          selectedDate.getMonth() === selectedMonth &&
                          selectedDate.getDate() === day;
                        return (
                          <TouchableOpacity
                            key={day}
                            style={[
                              styles.dayPickerDay,
                              { backgroundColor: 'transparent' },
                              isSelected && { backgroundColor: themeHook.colors.primary },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => handleDaySelect(day)}
                          >
                            <Text
                              style={[
                                styles.dayPickerDayText,
                                { color: themeHook.colors.text },
                                isSelected && { color: themeHook.colors.white, fontWeight: '600' },
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
    </>
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
    borderRadius: 2,
  },
  headerBackBtn: {
    padding: theme.spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerStepIndicator: {
    fontSize: 12,
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
    paddingTop: theme.spacing['2xl'],
  },
  stepContentContainer: {
    paddingBottom: theme.spacing['2xl'] * 2,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  stepHero: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  stepHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  stepHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  formCard: {
    padding: theme.spacing.xl,
    borderRadius: theme.radii.lg,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.card,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  cardSectionHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCardSpacer: {
    height: theme.spacing.lg,
  },
  locationInputWrapper: {
    paddingBottom: theme.spacing.md,
  },
  locationFormCard: {
    marginBottom: theme.spacing['2xl'],
  },
  stepButtonSpacer: {
    height: theme.spacing.xl,
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
  photoSectionTouchable: {
    alignItems: 'center',
  },
  photoPlaceholderWrapper: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  photoButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 100,
    overflow: 'hidden',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: theme.spacing.md,
  },
  photoHint: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
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
  specialtyInputWrapper: {
    marginBottom: 12,
    position: 'relative',
  },
  specialtyInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  specialtyInput: {
    flex: 1,
    borderWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 4,
    fontSize: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  specialtyDropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 220,
    zIndex: 9999,
    elevation: 9999,
    ...(Platform.OS === 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    }),
  },
  specialtyDropdownScroll: {
    maxHeight: 220,
  },
  specialtyDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  specialtyDropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  specialtyDropdownItemNiche: {
    fontSize: 12,
  },
  specialtyDropdownEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyDropdownEmptyText: {
    fontSize: 14,
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
    borderWidth: 2,
    borderColor: '#000000',
  },
  serviceCardOnboarding: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  serviceCardContent: {
    gap: 10,
  },
  credentialCardContent: {
    gap: 10,
  },
  credentialDateInput: {
    fontSize: 14.5,
  },
  dateRow: {
    marginTop: 12,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingRight: 8,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    marginBottom: 0,
    paddingRight: 4,
  },
  calendarButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  datePickerContent: {
    padding: 20,
    minHeight: 300,
  },
  datePickerScrollView: {
    maxHeight: 360,
  },
  yearDecadeSection: {
    marginBottom: 20,
  },
  yearDecadeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  yearButton: {
    width: '18%',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthButton: {
    width: '30%',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayPickerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPickerHeaderText: {
    fontSize: 18,
    fontWeight: '600',
  },
  dayPickerWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayPickerWeekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
  },
  dayPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayPickerDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayPickerDayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  serviceCardHeader: {
    marginBottom: 0,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingLeft: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  inputSuffix: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  inputWithSuffixInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  durationInputWrapper: {
    flex: 1,
    position: 'relative',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationInputContainer: {
    width: 72,
    borderRadius: 12,
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  durationInput: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  durationUnitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    minWidth: 72,
    gap: 4,
  },
  durationUnitButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  durationUnitDropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 9999,
  },
  durationUnitOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  durationUnitOptionText: {
    fontSize: 16,
    fontWeight: '500',
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
    borderWidth: 2,
    borderColor: '#000000',
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
  payoutButton: {
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
  payoutButtonText: {
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
