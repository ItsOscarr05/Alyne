import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal as RNModal,
  TouchableWithoutFeedback,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { providerService } from '../services/provider';
import { onboardingService } from '../services/onboarding';
import { plaidService } from '../services/plaid';
import { logger } from '../utils/logger';
import { LocationAutocomplete } from './ui/LocationAutocomplete';
import { formatTime12Hour, formatTime24Hour } from '../utils/timeUtils';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../utils/storage';
import { AlertModal } from './ui/AlertModal';
import { ConfirmModal } from './ui/ConfirmModal';
import { Calendar } from 'react-native-calendars';

const USER_KEY = 'user_data';

type Section = 'location' | 'bank' | 'profile' | 'services' | 'credentials' | 'availability';

interface EditProviderModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProviderModal({ visible, onClose, onSuccess }: EditProviderModalProps) {
  const { user, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Original state to track changes
  const [originalState, setOriginalState] = useState<{
    firstName: string;
    lastName: string;
    bio: string;
    specialties: string[];
    profilePhoto: string | null;
    city: string;
    state: string;
    serviceRadius: string;
    coordinates: { lat: number; lng: number } | null;
    services: Array<{
      id?: string;
      name: string;
      description: string;
      price: string;
      duration: string;
    }>;
    credentials: Array<{
      id?: string;
      name: string;
      issuer: string;
      issueDate: string;
      expiryDate: string;
    }>;
    availability: Array<{
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isRecurring: boolean;
    }>;
  } | null>(null);

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastName, setLastName] = useState('');
  const [lastNameFocused, setLastNameFocused] = useState(false);
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
  >([{ name: '', description: '', price: '0.00', duration: '' }]);

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

  // Date picker state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'issue' | 'expiry' | null>(null);
  const [datePickerIndex, setDatePickerIndex] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [datePickerStep, setDatePickerStep] = useState<'year' | 'month' | 'day'>('year');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load profile data when modal opens
  useEffect(() => {
    if (visible && user?.id) {
      // Refresh user to get latest profile photo, then load profile data
      refreshUser().then(() => {
        loadProfileData();
      });
    } else if (!visible) {
      // Reset original state when modal closes
      setOriginalState(null);
    }
  }, [visible, user?.id]);

  // Load Plaid link token when bank section is active
  useEffect(() => {
    if (visible && activeSection === 'bank' && !plaidLinkToken && user?.id) {
      loadPlaidLinkToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activeSection]);

  // Update profile photo when user object changes
  useEffect(() => {
    if (visible && user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  }, [visible, user?.profilePhoto]);

  // Store original state after data is loaded
  useEffect(() => {
    if (visible && !loadingProfile && !originalState) {
      // Use a small delay to ensure all state updates have completed
      const timer = setTimeout(() => {
        setOriginalState({
          firstName,
          lastName,
          bio,
          specialties: [...specialties],
          profilePhoto,
          city,
          state,
          serviceRadius,
          coordinates: coordinates ? { ...coordinates } : null,
          services: JSON.parse(JSON.stringify(services)),
          credentials: JSON.parse(JSON.stringify(credentials)),
          availability: JSON.parse(JSON.stringify(availability)),
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    visible,
    loadingProfile,
    firstName,
    lastName,
    bio,
    specialties,
    profilePhoto,
    city,
    state,
    serviceRadius,
    coordinates,
    services,
    credentials,
    availability,
  ]);

  const loadProfileData = async () => {
    if (!user?.id) return;

    setLoadingProfile(true);
    try {
      const profile = await providerService.getById(user.id);

      // Load user name
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);

      if (profile) {
        // Load bio and specialties
        if (profile.bio) setBio(profile.bio);
        if (profile.specialties && profile.specialties.length > 0) {
          setSpecialties(profile.specialties);
        }

        // Load service area
        if (profile.serviceArea) {
          const serviceArea = profile.serviceArea as {
            center?: { lat?: number; lng?: number };
            radius?: number;
          };

          if (serviceArea.radius) {
            const radiusInMiles = (serviceArea.radius / 1.60934).toFixed(0);
            setServiceRadius(radiusInMiles);
          }

          if (serviceArea.center && serviceArea.center.lat && serviceArea.center.lng) {
            setCoordinates({
              lat: serviceArea.center.lat,
              lng: serviceArea.center.lng,
            });

            // Reverse geocode for city/state
            if (serviceArea.center.lat !== 0 && serviceArea.center.lng !== 0) {
              try {
                const reverseGeocodeResult = await Location.reverseGeocodeAsync({
                  latitude: serviceArea.center.lat,
                  longitude: serviceArea.center.lng,
                });
                if (reverseGeocodeResult && reverseGeocodeResult.length > 0) {
                  const address = reverseGeocodeResult[0];
                  if (address.city) setCity(address.city);
                  if (address.region) setState(address.region);
                }
              } catch (error) {
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
          }));
          setServices(formattedServices);
        } else {
          // If no services, ensure at least one empty service for adding
          setServices([{ name: '', description: '', price: '0.00', duration: '' }]);
        }

        // Load credentials
        if (profile.credentials && profile.credentials.length > 0) {
          const formattedCredentials = profile.credentials.map((cred) => {
            let issueDate = '';
            let expiryDate = '';

            if (cred.issueDate) {
              const date =
                typeof cred.issueDate === 'string'
                  ? new Date(cred.issueDate)
                  : new Date(cred.issueDate);
              issueDate = formatDateMMDDYYYY(date);
            }

            if (cred.expiryDate) {
              const date =
                typeof cred.expiryDate === 'string'
                  ? new Date(cred.expiryDate)
                  : new Date(cred.expiryDate);
              expiryDate = formatDateMMDDYYYY(date);
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
        } else {
          setCredentials([{ name: '', issuer: '', issueDate: '', expiryDate: '' }]);
        }

        // Load availability
        if (profile.availability && profile.availability.length > 0) {
          const formattedAvailability = profile.availability.map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: formatTime12Hour(slot.startTime),
            endTime: formatTime12Hour(slot.endTime),
            isRecurring: slot.isRecurring,
          }));
          setAvailability(formattedAvailability);
        }

        // Load bank account info
        try {
          const bankInfo = await plaidService.getBankAccountInfo();
          if (bankInfo && bankInfo.verified) {
            setBankAccountConnected(true);
            setBankAccountInfo({
              accountName: 'Connected Account',
              accountMask: '••••',
            });
          }
        } catch (error) {
          logger.debug('No bank account info', error);
        }
      }
    } catch (error: any) {
      logger.error('Error loading profile', error);
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load profile data',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadPlaidLinkToken = async (): Promise<string | null> => {
    try {
      setLoading(true);
      const token = await plaidService.getProviderLinkToken();
      setPlaidLinkToken(token);
      return token;
    } catch (error: any) {
      logger.error('Error loading Plaid link token', error);
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to initialize bank setup. Please try again.',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const initializePlaidLink = (linkToken: string) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setAlertModal({
        visible: true,
        type: 'info',
        title: 'Info',
        message: 'Bank setup is currently only available on web. You can set this up later.',
      });
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
          setAlertModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: 'Failed to load payment system. Please refresh the page.',
          });
        }
      };
      script.onerror = () => {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'Failed to load payment system. Please check your internet connection.',
        });
      };
      if (typeof document !== 'undefined') {
        document.body.appendChild(script);
      }
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
          setAlertModal({
            visible: true,
            type: 'success',
            title: 'Success',
            message: `Your ${result.accountName} account ending in ${result.accountMask} has been connected.`,
          });
          // Reload profile data to get updated bank account status
          loadProfileData();
        } catch (error: any) {
          logger.error('Error exchanging Plaid token', error);
          setAlertModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: error.response?.data?.error?.message || 'Failed to connect bank account',
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

  const handleSaveLocation = async () => {
    setLoading(true);
    try {
      const radiusInMiles = parseFloat(serviceRadius) || 15;
      const radius = radiusInMiles * 1.60934;

      let coords = coordinates;
      if (city.trim() && state.trim()) {
        const geocodedCoords = await geocodeCityState(city.trim(), state.trim());
        if (geocodedCoords) {
          coords = geocodedCoords;
          setCoordinates(coords);
        }
      }

      const serviceArea = {
        center: coords || { lat: 0, lng: 0 },
        radius,
      };

      await onboardingService.updateProfile({
        serviceArea,
      });

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Location updated successfully',
      });
    } catch (error: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update location',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!bio.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Required',
        message: 'Please enter a bio',
      });
      return;
    }

    setLoading(true);
    try {
      if (profilePhoto) {
        const updatedUserResponse = await onboardingService.updateUserProfile({ profilePhoto });
        // Update storage with the updated user object from the API
        if (updatedUserResponse?.data) {
          await storage.setItem(USER_KEY, JSON.stringify(updatedUserResponse.data));
          await refreshUser();
        }
      }

      const radiusInMiles = parseFloat(serviceRadius) || 15;
      const radius = radiusInMiles * 1.60934;
      const serviceArea = {
        center: coordinates || { lat: 0, lng: 0 },
        radius,
      };

      await onboardingService.updateProfile({
        bio,
        specialties,
        serviceArea,
      });

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully',
      });
      onSuccess?.();
    } catch (error: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServices = async () => {
    const validServices = services.filter((s) => s.name.trim() && s.price && s.duration);
    if (validServices.length === 0) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Required',
        message: 'Please add at least one service',
      });
      return;
    }

    setLoading(true);
    try {
      for (const service of validServices) {
        if (service.id) {
          await onboardingService.updateService(service.id, {
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: parseInt(service.duration, 10),
          });
        } else {
          await onboardingService.createService({
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: parseInt(service.duration, 10),
          });
        }
      }

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Services updated successfully',
      });
      onSuccess?.();
    } catch (error: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update services',
      });
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
          await onboardingService.updateCredential(credential.id, {
            name: credential.name,
            issuer: credential.issuer || undefined,
            issueDate: credential.issueDate || undefined,
            expiryDate: credential.expiryDate || undefined,
          });
        } else {
          await onboardingService.createCredential({
            name: credential.name,
            issuer: credential.issuer || undefined,
            issueDate: credential.issueDate || undefined,
            expiryDate: credential.expiryDate || undefined,
          });
        }
      }

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Credentials updated successfully',
      });
      onSuccess?.();
    } catch (error: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update credentials',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    setLoading(true);
    try {
      for (const slot of availability) {
        const startTime24 = formatTime24Hour(slot.startTime);
        const endTime24 = formatTime24Hour(slot.endTime);

        if (slot.id) {
          await onboardingService.updateAvailability(slot.id, {
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime24,
            endTime: endTime24,
            isRecurring: slot.isRecurring,
          });
        } else {
          await onboardingService.createAvailability({
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime24,
            endTime: endTime24,
            isRecurring: slot.isRecurring,
          });
        }
      }

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Availability updated successfully',
      });
      onSuccess?.();
    } catch (error: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update availability',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalState) return false;

    // Compare name
    if (firstName !== originalState.firstName || lastName !== originalState.lastName) return true;

    // Compare bio
    if (bio !== originalState.bio) return true;

    // Compare specialties
    if (JSON.stringify(specialties.sort()) !== JSON.stringify(originalState.specialties.sort()))
      return true;

    // Compare profile photo
    if (profilePhoto !== originalState.profilePhoto) return true;

    // Compare location
    if (
      city !== originalState.city ||
      state !== originalState.state ||
      serviceRadius !== originalState.serviceRadius
    )
      return true;
    if (
      coordinates?.lat !== originalState.coordinates?.lat ||
      coordinates?.lng !== originalState.coordinates?.lng
    )
      return true;

    // Compare services
    if (JSON.stringify(services) !== JSON.stringify(originalState.services)) return true;

    // Compare credentials
    if (JSON.stringify(credentials) !== JSON.stringify(originalState.credentials)) return true;

    // Compare availability
    if (JSON.stringify(availability) !== JSON.stringify(originalState.availability)) return true;

    return false;
  };

  // Universal save function that saves all sections
  const handleSaveAll = async () => {
    if (!bio.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Required',
        message: 'Please enter a bio before saving',
      });
      return;
    }

    setLoading(true);
    try {
      // Save user profile (name and photo) if changed
      const nameChanged =
        firstName !== originalState?.firstName || lastName !== originalState?.lastName;
      const photoChanged = profilePhoto && profilePhoto !== originalState?.profilePhoto;

      if (nameChanged || photoChanged) {
        const userProfileData: {
          firstName?: string;
          lastName?: string;
          profilePhoto?: string;
        } = {};
        if (nameChanged) {
          userProfileData.firstName = firstName.trim();
          userProfileData.lastName = lastName.trim();
        }
        if (photoChanged) {
          userProfileData.profilePhoto = profilePhoto;
        }

        const updatedUserResponse = await onboardingService.updateUserProfile(userProfileData);
        // Update storage with the updated user object from the API
        if (updatedUserResponse?.data) {
          await storage.setItem(USER_KEY, JSON.stringify(updatedUserResponse.data));
          await refreshUser();
        }
      }

      // Save profile (bio, specialties, service area)
      const radiusInMiles = parseFloat(serviceRadius) || 15;
      const radius = radiusInMiles * 1.60934;

      let coords = coordinates;
      // Only try to geocode if we don't already have valid coordinates
      // or if city/state are provided and coordinates are invalid (0,0 or null)
      if (city.trim() && state.trim()) {
        const hasValidCoords = coords && coords.lat !== 0 && coords.lng !== 0;
        if (!hasValidCoords) {
          try {
            const geocodedCoords = await geocodeCityState(city.trim(), state.trim());
            if (geocodedCoords) {
              coords = geocodedCoords;
              setCoordinates(coords);
              logger.debug('Geocoded city/state', { city, state, coords });
            } else {
              logger.warn(
                'Geocoding returned null, keeping existing coordinates or will use default',
                {
                  city,
                  state,
                  existingCoords: coordinates,
                }
              );
            }
          } catch (geoError: any) {
            logger.error('Error geocoding city/state', { error: geoError, city, state });
            // Continue with existing coordinates or default
          }
        } else {
          logger.debug('Using existing valid coordinates', { coords, city, state });
        }
      }

      // Use existing coordinates if available, otherwise default to 0,0
      // Note: 0,0 is saved but may need manual coordinate entry in future
      const serviceArea = {
        center: coords || { lat: 0, lng: 0 },
        radius,
      };

      logger.debug('Saving profile with location', {
        bio: bio.substring(0, 50) + '...',
        specialties,
        serviceArea,
        city,
        state,
      });

      await onboardingService.updateProfile({
        bio,
        specialties,
        serviceArea,
      });

      logger.debug('Profile with location saved successfully');

      // Save services
      const validServices = services.filter((s) => s.name.trim() && s.price && s.duration);
      const currentServiceIds = new Set(
        validServices.map((s) => s.id).filter((id): id is string => !!id)
      );
      const originalServiceIds = new Set(
        (originalState?.services || []).map((s) => s.id).filter((id): id is string => !!id)
      );

      // Delete services that were removed
      for (const originalId of originalServiceIds) {
        if (!currentServiceIds.has(originalId)) {
          await onboardingService.deleteService(originalId);
        }
      }

      // Update or create services
      for (const service of validServices) {
        if (service.id) {
          await onboardingService.updateService(service.id, {
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: parseInt(service.duration, 10),
          });
        } else {
          await onboardingService.createService({
            name: service.name,
            description: service.description,
            price: parseFloat(service.price),
            duration: parseInt(service.duration, 10),
          });
        }
      }

      // Save credentials
      const validCredentials = credentials.filter((c) => c.name.trim());
      logger.debug('Saving credentials', {
        allCredentials: credentials,
        validCredentials: validCredentials,
        validCount: validCredentials.length,
      });

      // Track updated credentials with new IDs
      let updatedCredentials = [...credentials];

      if (validCredentials.length > 0) {
        const currentCredentialIds = new Set(
          validCredentials.map((c) => c.id).filter((id): id is string => !!id)
        );
        const originalCredentialIds = new Set(
          (originalState?.credentials || []).map((c) => c.id).filter((id): id is string => !!id)
        );

        // Delete credentials that were removed
        for (const originalId of originalCredentialIds) {
          if (!currentCredentialIds.has(originalId)) {
            try {
              await onboardingService.deleteCredential(originalId);
              logger.debug('Deleted credential', { id: originalId });
            } catch (deleteError: any) {
              logger.error('Error deleting credential', {
                error: deleteError,
                id: originalId,
                response: deleteError.response?.data,
              });
              // Continue even if delete fails
            }
          }
        }

        // Update or create credentials
        for (let i = 0; i < validCredentials.length; i++) {
          const credential = validCredentials[i];
          try {
            // Convert MM-DD-YYYY to YYYY-MM-DD for backend
            let issueDate: string | undefined = undefined;
            let expiryDate: string | undefined = undefined;

            if (credential.issueDate && credential.issueDate.trim()) {
              const parsed = parseDate(credential.issueDate);
              if (parsed && !isNaN(parsed.getTime())) {
                issueDate = parsed.toISOString().split('T')[0]; // YYYY-MM-DD format
              } else {
                logger.warn('Failed to parse issue date', { dateString: credential.issueDate });
              }
            }

            if (credential.expiryDate && credential.expiryDate.trim()) {
              const parsed = parseDate(credential.expiryDate);
              if (parsed && !isNaN(parsed.getTime())) {
                expiryDate = parsed.toISOString().split('T')[0]; // YYYY-MM-DD format
              } else {
                logger.warn('Failed to parse expiry date', { dateString: credential.expiryDate });
              }
            }

            const credentialData = {
              name: credential.name.trim(),
              issuer: credential.issuer?.trim() || undefined,
              issueDate,
              expiryDate,
            };

            logger.debug('Saving credential', {
              id: credential.id,
              data: credentialData,
              isUpdate: !!credential.id,
            });

            let result;
            if (credential.id) {
              result = await onboardingService.updateCredential(credential.id, credentialData);
              logger.debug('Credential updated successfully', { id: credential.id, result });
            } else {
              result = await onboardingService.createCredential(credentialData);
              logger.debug('Credential created successfully', { result });
              // Update the credential in the updatedCredentials array with the new ID
              // API returns { success: true, data: credential }, service returns response.data
              const credentialIndex = updatedCredentials.findIndex((c) => c === credential);
              if (credentialIndex !== -1) {
                const newId = result?.data?.id || result?.id;
                if (newId) {
                  updatedCredentials[credentialIndex] = {
                    ...updatedCredentials[credentialIndex],
                    id: newId,
                  };
                  logger.debug('Updated credential with new ID', {
                    index: credentialIndex,
                    id: newId,
                  });
                } else {
                  logger.warn('Credential created but no ID in response', { result });
                }
              }
            }
          } catch (credError: any) {
            console.error('ERROR SAVING CREDENTIAL:', credError);
            console.error('Error details:', {
              message: credError.message,
              response: credError.response?.data,
              stack: credError.stack,
            });
            logger.error('Error saving credential', {
              error: credError,
              credential: credential,
              response: credError.response?.data,
              message: credError.message,
              stack: credError.stack,
            });
            // Re-throw to show error to user
            throw credError;
          }
        }

        logger.debug('Credentials saved successfully', { count: validCredentials.length });
      } else {
        logger.debug('No valid credentials to save');
      }

      // Update credentials state with any new IDs
      setCredentials(updatedCredentials);

      // Save availability
      const currentAvailabilityIds = new Set(
        availability.map((a) => a.id).filter((id): id is string => !!id)
      );
      const originalAvailabilityIds = new Set(
        (originalState?.availability || []).map((a) => a.id).filter((id): id is string => !!id)
      );

      // Delete availability slots that were removed
      for (const originalId of originalAvailabilityIds) {
        if (!currentAvailabilityIds.has(originalId)) {
          await onboardingService.deleteAvailability(originalId);
        }
      }

      // Update or create availability slots
      for (const slot of availability) {
        const startTime24 = formatTime24Hour(slot.startTime);
        const endTime24 = formatTime24Hour(slot.endTime);

        if (slot.id) {
          await onboardingService.updateAvailability(slot.id, {
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime24,
            endTime: endTime24,
            isRecurring: slot.isRecurring,
          });
        } else {
          await onboardingService.createAvailability({
            dayOfWeek: slot.dayOfWeek,
            startTime: startTime24,
            endTime: endTime24,
            isRecurring: slot.isRecurring,
          });
        }
      }

      // Update original state to reflect saved changes
      setOriginalState({
        firstName,
        lastName,
        bio,
        specialties: [...specialties],
        profilePhoto: profilePhoto || null,
        city,
        state,
        serviceRadius,
        coordinates: coords ? { ...coords } : null,
        services: JSON.parse(JSON.stringify(services)),
        credentials: JSON.parse(JSON.stringify(updatedCredentials)),
        availability: JSON.parse(JSON.stringify(availability)),
      });

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'All changes saved successfully',
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save changes',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setConfirmModal({
        visible: true,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Are you sure you want to close without saving?',
        onConfirm: () => {
          setConfirmModal({ ...confirmModal, visible: false });
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  // Helper functions for managing arrays
  const addSpecialty = () => {
    if (specialtyInput.trim()) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
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

  const addService = () => {
    setServices([...services, { name: '', description: '', price: '0.00', duration: '' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const formatPrice = (value: string): string => {
    // Remove any non-numeric characters except decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');

    // If empty, return empty
    if (!numericValue) return '';

    // Parse as float
    const num = parseFloat(numericValue);

    // If not a valid number, return the original value
    if (isNaN(num)) return value;

    // Format to 2 decimal places
    return num.toFixed(2);
  };

  const handlePriceBlur = (index: number, value: string) => {
    if (value.trim()) {
      const formatted = formatPrice(value);
      updateService(index, 'price', formatted);
    }
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

  // Format date to MM-DD-YYYY
  const formatDateMMDDYYYY = (date: Date | string | null): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Parse date from MM-DD-YYYY or YYYY-MM-DD to Date object
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;

    // Try MM-DD-YYYY format first
    const mmddyyyy = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (mmddyyyy) {
      const month = parseInt(mmddyyyy[1], 10) - 1;
      const day = parseInt(mmddyyyy[2], 10);
      const year = parseInt(mmddyyyy[3], 10);
      return new Date(year, month, day);
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      return new Date(year, month, day);
    }

    // Try parsing as ISO string
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Generate years list (1900 - 2099)
  const generateYears = () => {
    const years = [];
    for (let i = 1900; i <= 2099; i++) {
      years.push(i);
    }
    return years;
  };

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Open date picker
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

  // Handle year selection
  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setDatePickerStep('month');
  };

  // Handle month selection
  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setDatePickerStep('day');
  };

  // Handle day selection
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

  const sections: Array<{ id: Section; label: string; icon: string }> = [
    { id: 'profile', label: 'Profile', icon: 'person-outline' },
    { id: 'location', label: 'Location', icon: 'location-outline' },
    { id: 'services', label: 'Services', icon: 'list-outline' },
    { id: 'credentials', label: 'Credentials', icon: 'school-outline' },
    { id: 'availability', label: 'Availability', icon: 'calendar-outline' },
    { id: 'bank', label: 'Bank', icon: 'card-outline' },
  ];

  const renderSection = () => {
    if (loadingProfile) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      );
    }

    switch (activeSection) {
      case 'location':
        return renderLocationSection();
      case 'bank':
        return renderBankSection();
      case 'profile':
        return renderProfileSection();
      case 'services':
        return renderServicesSection();
      case 'credentials':
        return renderCredentialsSection();
      case 'availability':
        return renderAvailabilitySection();
      default:
        return null;
    }
  };

  const renderLocationSection = () => (
    <ScrollView style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Service Area</Text>
      <Text style={styles.sectionDescription}>
        Set your location and service radius to help clients find you.
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
    </ScrollView>
  );

  const renderBankSection = () => (
    <ScrollView style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Bank Account</Text>
      <Text style={styles.sectionDescription}>
        Connect your bank account to receive payments from clients.
      </Text>

      {bankAccountConnected && bankAccountInfo ? (
        <View style={styles.bankCardConnected}>
          <View style={styles.bankCardHeader}>
            <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
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
        <>
          <View style={styles.bankCardEmpty}>
            <Ionicons name="card-outline" size={40} color="#cbd5e1" />
            <Text style={styles.bankCardEmptyTitle}>No bank account connected</Text>
            <Text style={styles.bankCardEmptyText}>
              Connect your account to start receiving payments
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.plaidButton, loading && styles.buttonDisabled]}
            onPress={async () => {
              if (plaidLinkToken) {
                initializePlaidLink(plaidLinkToken);
              } else {
                const token = await loadPlaidLinkToken();
                if (token) {
                  initializePlaidLink(token);
                }
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
        </>
      )}
    </ScrollView>
  );

  const renderProfileSection = () => (
    <ScrollView style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Profile Information</Text>
      <Text style={styles.sectionDescription}>
        Update your name, bio, specialties, and profile photo.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Profile Photo</Text>
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
              <Ionicons name="camera-outline" size={32} color="#2563eb" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <TextInput
              style={[styles.input, firstNameFocused && styles.inputFocused]}
              placeholder="First name"
              placeholderTextColor="#94a3b8"
              value={firstName}
              onChangeText={setFirstName}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
            />
          </View>
          <View style={styles.halfInput}>
            <TextInput
              style={[styles.input, lastNameFocused && styles.inputFocused]}
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
              value={lastName}
              onChangeText={setLastName}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Bio *</Text>
          <Text style={styles.charCount}>{bio.length} / 500</Text>
        </View>
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
        {specialties.length > 0 && (
          <View style={styles.specialtyTags}>
            {specialties.map((specialty, index) => (
              <View key={index} style={styles.specialtyTag}>
                <Text style={styles.specialtyTagText}>{specialty}</Text>
                <TouchableOpacity onPress={() => removeSpecialty(index)}>
                  <Ionicons name="close-circle" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderServicesSection = () => (
    <ScrollView style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Services</Text>
      <Text style={styles.sectionDescription}>
        Manage the services you offer and their pricing.
      </Text>

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
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={service.description}
            onChangeText={(value) => updateService(index, 'description', value)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <View style={styles.inputWithPrefix}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.inputWithSuffixInput]}
                  placeholder="0.00"
                  value={service.price}
                  onChangeText={(value) => updateService(index, 'price', value)}
                  onBlur={() => handlePriceBlur(index, service.price)}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.halfInput}>
              <View style={styles.inputWithSuffix}>
                <TextInput
                  style={[styles.input, styles.inputWithSuffixInput]}
                  placeholder="0"
                  value={service.duration}
                  onChangeText={(value) => updateService(index, 'duration', value)}
                  keyboardType="numeric"
                />
                <Text style={styles.inputSuffix}>min</Text>
              </View>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
        <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
        <Text style={styles.addServiceButtonText}>Add Another Service</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCredentialsSection = () => (
    <ScrollView style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Credentials</Text>
      <Text style={styles.sectionDescription}>
        Showcase your certifications and qualifications.
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
          />
          <TextInput
            style={styles.input}
            placeholder="Issuing organization"
            value={credential.issuer}
            onChangeText={(value) => updateCredential(index, 'issuer', value)}
          />
          <View style={[styles.row, styles.dateRow]}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Issue date</Text>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="MM-DD-YYYY"
                  value={credential.issueDate}
                  onChangeText={(value) => updateCredential(index, 'issueDate', value)}
                />
                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={() => openDatePicker('issue', index)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Expiry date</Text>
              <View style={styles.dateInputContainer}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="MM-DD-YYYY"
                  value={credential.expiryDate}
                  onChangeText={(value) => updateCredential(index, 'expiryDate', value)}
                />
                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={() => openDatePicker('expiry', index)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addCredential}>
        <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
        <Text style={styles.addServiceButtonText}>Add Another Credential</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderAvailabilitySection = () => (
    <ScrollView style={styles.sectionContent}>
      <Text style={styles.sectionTitle}>Availability</Text>
      <Text style={styles.sectionDescription}>Set when you're available for bookings.</Text>

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
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5:00 PM"
                    value={slot.endTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'endTime', value)}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <>
      <RNModal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContainer}>
                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Ionicons name="close" size={28} color="#1e293b" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Edit Provider Profile</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsScrollContent}
                  >
                    {sections.map((section) => (
                      <TouchableOpacity
                        key={section.id}
                        style={[styles.tab, activeSection === section.id && styles.tabActive]}
                        onPress={() => setActiveSection(section.id)}
                      >
                        <Ionicons
                          name={section.icon as any}
                          size={20}
                          color={activeSection === section.id ? '#2563eb' : '#64748b'}
                        />
                        <Text
                          style={[
                            styles.tabText,
                            activeSection === section.id && styles.tabTextActive,
                          ]}
                        >
                          {section.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Content */}
                <View style={styles.contentWrapper}>
                  {renderSection()}

                  {/* Universal Save Button */}
                  <View style={styles.universalSaveContainer}>
                    <TouchableOpacity
                      style={[
                        styles.universalSaveButton,
                        (loading || !bio.trim()) && styles.buttonDisabled,
                      ]}
                      onPress={handleSaveAll}
                      disabled={loading || !bio.trim()}
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.universalSaveButtonText}>Save Info</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      <AlertModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal({ ...alertModal, visible: false })}
      />

      <ConfirmModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal({ ...confirmModal, visible: false })}
        title={confirmModal.title}
        message={confirmModal.message}
        type="warning"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
      />

      {/* Date Picker Modal */}
      <RNModal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDatePickerVisible(false)}>
          <View style={styles.datePickerOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>
                    Select {datePickerType === 'issue' ? 'Issue' : 'Expiry'} Date
                  </Text>
                  <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.datePickerContent}>
                  {datePickerStep === 'year' && (
                    <ScrollView style={styles.datePickerScrollView}>
                      <View style={styles.yearGrid}>
                        {generateYears().map((year) => (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.yearButton,
                              selectedYear === year && styles.yearButtonSelected,
                            ]}
                            onPress={() => handleYearSelect(year)}
                          >
                            <Text
                              style={[
                                styles.yearButtonText,
                                selectedYear === year && styles.yearButtonTextSelected,
                              ]}
                            >
                              {year}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {datePickerStep === 'month' && (
                    <View style={styles.monthGrid}>
                      {months.map((month, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.monthButton,
                            selectedMonth === index && styles.monthButtonSelected,
                          ]}
                          onPress={() => handleMonthSelect(index)}
                        >
                          <Text
                            style={[
                              styles.monthButtonText,
                              selectedMonth === index && styles.monthButtonTextSelected,
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
                        <TouchableOpacity
                          style={styles.dayPickerBackButton}
                          onPress={() => setDatePickerStep('month')}
                        >
                          <Ionicons name="chevron-back" size={20} color="#2563eb" />
                        </TouchableOpacity>
                        <Text style={styles.dayPickerHeaderText}>
                          {months[selectedMonth]} {selectedYear}
                        </Text>
                        <View style={styles.dayPickerBackButton} />
                      </View>
                      <View style={styles.dayPickerWeekdays}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <Text key={day} style={styles.dayPickerWeekday}>
                            {day}
                          </Text>
                        ))}
                      </View>
                      <View style={styles.dayPickerGrid}>
                        {Array.from({
                          length: getFirstDayOfMonth(selectedYear, selectedMonth),
                        }).map((_, index) => (
                          <View key={`empty-${index}`} style={styles.dayPickerDay} />
                        ))}
                        {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }).map(
                          (_, index) => {
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
                                  isSelected && styles.dayPickerDaySelected,
                                ]}
                                onPress={() => handleDaySelect(day)}
                              >
                                <Text
                                  style={[
                                    styles.dayPickerDayText,
                                    isSelected && styles.dayPickerDayTextSelected,
                                  ]}
                                >
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          }
                        )}
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
    backgroundColor: '#ffffff',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
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
  tabs: {
    height: 56,
  },
  tabsScrollContent: {
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    height: 56,
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  contentWrapper: {
    flex: 1,
  },
  sectionContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  universalSaveContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  universalSaveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  universalSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
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
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 12,
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
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  textAreaFocused: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 52,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
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
  photoButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
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
  addButtonDisabled: {
    opacity: 0.5,
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2563eb',
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
  dateRow: {
    marginTop: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingLeft: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputWithSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingLeft: 16,
    paddingRight: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputPrefix: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginRight: 8,
  },
  inputSuffix: {
    fontSize: 16,
    color: '#64748b',
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
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
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  dateInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
  },
  calendarButton: {
    padding: -10,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
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
    borderBottomColor: '#e2e8f0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  datePickerContent: {
    padding: 20,
    minHeight: 300,
  },
  datePickerScrollView: {
    maxHeight: 400,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  yearButton: {
    width: '18%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  yearButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  yearButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthButton: {
    width: '30%',
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  monthButtonTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
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
    color: '#1e293b',
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
    color: '#64748b',
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
  dayPickerDaySelected: {
    backgroundColor: '#2563eb',
  },
  dayPickerDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  dayPickerDayTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  bankCardConnected: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
  bankCardEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
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
});
