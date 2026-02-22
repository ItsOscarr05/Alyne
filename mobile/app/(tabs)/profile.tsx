import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal as RNModal,
  TouchableWithoutFeedback,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect, useRef } from 'react';
import { providerService } from '../../services/provider';
import { bookingService, BookingDetail } from '../../services/booking';
import { paymentService } from '../../services/payment';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, isNetworkError, getErrorTitle } from '../../utils/errorMessages';
import { NetworkErrorModal } from '../../components/ui/NetworkErrorModal';
import { theme } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { ProviderDetailModal } from '../../components/ProviderDetailModal';
import * as ImagePicker from 'expo-image-picker';
import { onboardingService } from '../../services/onboarding';
import { storage } from '../../utils/storage';
import { stripeConnectService } from '../../services/stripeConnect';

const USER_KEY = 'user_data';

interface ProviderProfile {
  id: string;
  bio: string | null;
  specialties: string[];
  services: Array<{ id: string; name: string; price: number; duration: number }>;
  credentials: Array<{ id: string; name: string; issuer: string | null }>;
  availability: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
  rating?: number;
  reviewCount?: number;
  bankAccountVerified?: boolean;
  bankAccountMask?: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, deleteAccount, refreshUser } = useAuth();
  const { theme: themeHook, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const modal = useModal();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProviderDetailModal, setShowProviderDetailModal] = useState(false);
  const [providerDetailInitialTab, setProviderDetailInitialTab] = useState<'about' | 'services' | 'reviews'>('about');
  const [scrollToAvailability, setScrollToAvailability] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isHoveringPhoto, setIsHoveringPhoto] = useState(false);
  const [networkErrorModal, setNetworkErrorModal] = useState<{
    visible: boolean;
    message: string;
    onRetry?: () => void;
  }>({
    visible: false,
    message: '',
  });

  // Client profile state
  const [clientStats, setClientStats] = useState<{
    totalBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    totalSpent: number;
  } | null>(null);
  const [recentBookings, setRecentBookings] = useState<BookingDetail[]>([]);
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  useEffect(() => {
    if (user?.userType === 'PROVIDER') {
      loadProviderProfile();
    } else if (user?.userType === 'CLIENT') {
      loadClientData();
    }
  }, [user]);

  const loadClientData = async () => {
    if (!user?.id) return;

    setIsLoadingClientData(true);
    try {
      // Load all bookings for the client
      const allBookings = await bookingService.getMyBookings(undefined, 'client');
      
      // Calculate stats
      const now = new Date();
      const totalBookings = allBookings.length;
      const upcomingBookings = allBookings.filter(
        (b) => b.status === 'CONFIRMED' && new Date(b.scheduledDate) >= now
      ).length;
      const completedBookings = allBookings.filter((b) => b.status === 'COMPLETED').length;
      
      // Calculate total spent from completed payments
      const completedPayments = allBookings
        .filter((b) => b.status === 'COMPLETED' && b.payment?.status === 'completed')
        .map((b) => b.payment?.amount || 0);
      const totalSpent = completedPayments.reduce((sum, amount) => sum + amount, 0);

      setClientStats({
        totalBookings,
        upcomingBookings,
        completedBookings,
        totalSpent,
      });

      // Get recent bookings (upcoming or completed, limit 3)
      const recent = allBookings
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
        .sort((a, b) => {
          const dateA = new Date(a.scheduledDate).getTime();
          const dateB = new Date(b.scheduledDate).getTime();
          return dateB - dateA; // Most recent first
        })
        .slice(0, 3);
      setRecentBookings(recent);

      // Check if client has payment method (has made at least one payment)
      const hasMadePayment = allBookings.some((b) => b.payment?.status === 'completed');
      setHasPaymentMethod(hasMadePayment);
    } catch (error: any) {
      logger.error('Error loading client data', error);
      
      // Handle network errors with retry option
      if (isNetworkError(error)) {
        setNetworkErrorModal({
          visible: true,
          message: getUserFriendlyError(error),
          onRetry: loadClientData,
        });
      } else {
        // Other errors - show alert
        modal.showAlert({
          title: getErrorTitle(error),
          message: getUserFriendlyError(error),
          type: 'error',
        });
      }
      
      // Set defaults on error
      setClientStats({
        totalBookings: 0,
        upcomingBookings: 0,
        completedBookings: 0,
        totalSpent: 0,
      });
      setRecentBookings([]);
      setHasPaymentMethod(false);
    } finally {
      setIsLoadingClientData(false);
    }
  };


  const loadProviderProfile = async () => {
    if (!user?.id) return;

    setIsLoadingProfile(true);
    try {
      logger.debug('Loading provider profile for user', { userId: user.id });
      // Get provider profile using the user's own ID
      const profile = await providerService.getById(user.id);
      logger.debug('Provider profile loaded', {
        hasProfile: !!profile,
        specialtiesCount: Array.isArray(profile?.specialties) ? profile.specialties.length : 0,
        servicesCount: profile?.services?.length || 0,
      });

      if (profile) {
        // Stripe Connect payout status
        let bankAccountVerified = false;
        let bankAccountMask: string | null = null;
        try {
          const stripeStatus = await stripeConnectService.getStatus();
          if (stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled) {
            bankAccountVerified = true;
            if (stripeStatus.bankAccount?.last4) {
              bankAccountMask = stripeStatus.bankAccount.last4;
            }
          }
        } catch (error) {
          logger.debug('No Stripe Connect status', error);
        }

        setProviderProfile({
          id: profile.id,
          bio: profile.bio || null,
          specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
          services: Array.isArray(profile.services) ? profile.services : [],
          credentials: Array.isArray(profile.credentials)
            ? profile.credentials.map((c) => ({
                id: c.id,
                name: c.name,
                issuer: c.issuer ?? null,
              }))
            : [],
          availability: Array.isArray(profile.availability) ? profile.availability : [],
          rating: profile.rating || 0,
          reviewCount: profile.reviewCount || 0,
          bankAccountVerified,
          bankAccountMask,
        });
        logger.debug('Provider profile state set', {
          bio: profile.bio,
          specialtiesCount: Array.isArray(profile.specialties) ? profile.specialties.length : 0,
          servicesCount: Array.isArray(profile.services) ? profile.services.length : 0,
          credentialsCount: Array.isArray(profile.credentials) ? profile.credentials.length : 0,
          availabilityCount: Array.isArray(profile.availability) ? profile.availability.length : 0,
        });
      }
    } catch (error: any) {
      logger.error('Error loading provider profile', error);
      
      // Handle network errors with retry option
      if (isNetworkError(error)) {
        setNetworkErrorModal({
          visible: true,
          message: getUserFriendlyError(error),
          onRetry: loadProviderProfile,
        });
      } else if (error?.response?.status !== 404) {
        // 404 is okay (profile might not exist), but show other errors
        modal.showAlert({
          title: getErrorTitle(error),
          message: getUserFriendlyError(error),
          type: 'error',
        });
      }
      // Profile might not exist yet (404), that's okay
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText('');
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

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      // If user canceled, return early without setting loading state
      if (result.canceled) {
        return;
      }

      if (result.assets[0]) {
        // Only set loading state when we actually start uploading
        setIsUpdatingPhoto(true);
        
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Update profile photo via API
        const updatedUserResponse = await onboardingService.updateUserProfile({ profilePhoto: base64 });
        
        // Update storage with the updated user object from the API
        if (updatedUserResponse?.data) {
          await storage.setItem(USER_KEY, JSON.stringify(updatedUserResponse.data));
          // Refresh user to update the UI
          await refreshUser();
        }
        
        modal.showAlert({
          title: 'Success',
          message: 'Profile photo updated successfully',
          type: 'success',
        });
      }
    } catch (error: any) {
      logger.error('Error updating profile photo', error);
      modal.showAlert({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to update profile photo',
        type: 'error',
      });
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') {
      modal.showAlert({
        title: 'Invalid Confirmation',
        message: 'Please type DELETE exactly to confirm account deletion.',
        type: 'warning',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      
      // Show success message
      modal.showAlert({
        title: 'Account Deleted',
        message: 'Your account has been successfully deleted.',
        type: 'success',
      });

      // Wait 1 second, then show redirecting message
      setTimeout(() => {
        modal.showAlert({
          title: 'Redirecting',
          message: 'Redirecting to welcome page...',
          type: 'info',
        });

        // Wait another 1 second, then redirect (total 2 seconds)
        setTimeout(() => {
          router.replace('/(auth)/welcome');
        }, 1000);
      }, 1000);
    } catch (error: any) {
      modal.showAlert({
        title: 'Deletion Failed',
        message: error.response?.data?.error?.message || error.message || 'Failed to delete account',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, theme.spacing['2xl']) + 80 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeHook.colors.text }]}>
            {user?.userType === 'PROVIDER' ? 'Provider Profile' : 'Profile'}
          </Text>
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        {user && (
          <>
            {/* Hero Section - Provider Only */}
            {user.userType === 'PROVIDER' ? (
              <View style={styles.heroSection}>
                {/* Background Pattern */}
                <View style={styles.heroPattern}>
                  {/* Subtle grid pattern */}
                  {Array.from({ length: 8 }).map((_, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.heroPatternRow}>
                      {Array.from({ length: 10 }).map((_, colIndex) => (
                        <View
                          key={`col-${colIndex}`}
                          style={[
                            styles.heroPatternCell,
                            (rowIndex + colIndex) % 2 === 0 && styles.heroPatternCellAlt,
                            (rowIndex + colIndex) % 2 === 0 && { backgroundColor: themeHook.colors.primaryLight },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                  {/* Radial gradient effect */}
                  <View style={[styles.heroPatternRadial, { backgroundColor: themeHook.colors.primaryLight }]} />
                </View>
                <View style={styles.heroContent}>
                  <View style={styles.heroAvatarContainer}>
                    <TouchableOpacity
                      style={styles.heroAvatar}
                      onPress={pickImage}
                      disabled={isUpdatingPhoto}
                      onMouseEnter={() => Platform.OS === 'web' && setIsHoveringPhoto(true)}
                      onMouseLeave={() => Platform.OS === 'web' && setIsHoveringPhoto(false)}
                      activeOpacity={0.8}
                    >
                      {user.profilePhoto ? (
                        <>
                          <Image
                            source={{ uri: user.profilePhoto }}
                            style={styles.heroAvatarImage}
                            contentFit="cover"
                            onError={() => {
                              // Silently handle image load errors
                            }}
                          />
                          {(isHoveringPhoto || isUpdatingPhoto) && (
                            <View style={styles.photoOverlay}>
                              {isUpdatingPhoto ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <>
                                  <Ionicons name="camera" size={24} color="#ffffff" />
                                  <Text style={styles.photoOverlayText}>Change Photo</Text>
                                </>
                              )}
                            </View>
                          )}
                        </>
                      ) : (
                        <>
                          <Text style={styles.heroAvatarText}>
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </Text>
                          {(isHoveringPhoto || isUpdatingPhoto) && (
                            <View style={styles.photoOverlay}>
                              {isUpdatingPhoto ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <>
                                  <Ionicons name="camera" size={24} color="#ffffff" />
                                  <Text style={styles.photoOverlayText}>Add Photo</Text>
                                </>
                              )}
                            </View>
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                    {providerProfile && (
                      <View style={[styles.heroRatingBadge, { backgroundColor: themeHook.colors.white }]}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={[styles.heroRatingText, { color: themeHook.colors.black }]}>
                          {(providerProfile.rating || 0).toFixed(1)}
                        </Text>
                        <Text style={[styles.heroReviewCount, { color: themeHook.colors.black }]}>
                          ({(providerProfile.reviewCount || 0)})
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.heroName, { color: themeHook.colors.text }]}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <View style={styles.heroEmailContainer}>
                    <Ionicons name="mail-outline" size={14} color={themeHook.colors.textSecondary} />
                    <Text style={[styles.heroEmail, { color: themeHook.colors.textSecondary }]}>{user.email}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.heroSection}>
                {/* Background Pattern */}
                <View style={styles.heroPattern}>
                  {/* Subtle grid pattern */}
                  {Array.from({ length: 8 }).map((_, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.heroPatternRow}>
                      {Array.from({ length: 10 }).map((_, colIndex) => (
                        <View
                          key={`col-${colIndex}`}
                          style={[
                            styles.heroPatternCell,
                            (rowIndex + colIndex) % 2 === 0 && styles.heroPatternCellAlt,
                            (rowIndex + colIndex) % 2 === 0 && { backgroundColor: themeHook.colors.primaryLight },
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                  {/* Radial gradient effect */}
                  <View style={[styles.heroPatternRadial, { backgroundColor: themeHook.colors.primaryLight }]} />
                </View>
                <View style={styles.heroContent}>
                  <View style={styles.heroAvatarContainer}>
                    <TouchableOpacity
                      style={styles.heroAvatar}
                      onPress={pickImage}
                      disabled={isUpdatingPhoto}
                      onMouseEnter={() => Platform.OS === 'web' && setIsHoveringPhoto(true)}
                      onMouseLeave={() => Platform.OS === 'web' && setIsHoveringPhoto(false)}
                      activeOpacity={0.8}
                    >
                      {user.profilePhoto ? (
                        <>
                          <Image
                            source={{ uri: user.profilePhoto }}
                            style={styles.heroAvatarImage}
                            contentFit="cover"
                            onError={() => {
                              // Silently handle image load errors
                            }}
                          />
                          {(isHoveringPhoto || isUpdatingPhoto) && (
                            <View style={styles.photoOverlay}>
                              {isUpdatingPhoto ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <>
                                  <Ionicons name="camera" size={24} color="#ffffff" />
                                  <Text style={styles.photoOverlayText}>Change Photo</Text>
                                </>
                              )}
                            </View>
                          )}
                        </>
                      ) : (
                        <>
                          <Text style={styles.heroAvatarText}>
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </Text>
                          {(isHoveringPhoto || isUpdatingPhoto) && (
                            <View style={styles.photoOverlay}>
                              {isUpdatingPhoto ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <>
                                  <Ionicons name="camera" size={24} color="#ffffff" />
                                  <Text style={styles.photoOverlayText}>Add Photo</Text>
                                </>
                              )}
                            </View>
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                    <View style={[styles.userTypeBadge, { backgroundColor: themeHook.colors.primary }]}>
                      <Ionicons name="person" size={12} color={themeHook.colors.white} />
                      <Text style={[styles.userTypeText, { color: themeHook.colors.white }]}>Client</Text>
                    </View>
                  </View>
                  <Text style={[styles.heroName, { color: themeHook.colors.text }]}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <View style={styles.heroEmailContainer}>
                    <Ionicons name="mail-outline" size={14} color={themeHook.colors.textSecondary} />
                    <Text style={[styles.heroEmail, { color: themeHook.colors.textSecondary }]}>{user.email}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats - Provider */}
            {user.userType === 'PROVIDER' && providerProfile && (
              <View style={[styles.quickStatsSection, { borderTopColor: themeHook.colors.border }]}>
                <View style={styles.quickStatsGrid}>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }, styles.quickStatCardServices]}
                    onPress={() => {
                      setProviderDetailInitialTab('services');
                      setScrollToAvailability(false);
                      setShowProviderDetailModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={24}
                      color={themeHook.colors.primary}
                    />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {providerProfile.services?.length || 0}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Services</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: '#9333EA' }, styles.quickStatCardCredentials]}
                    onPress={() => {
                      setProviderDetailInitialTab('about');
                      setScrollToAvailability(false);
                      setShowProviderDetailModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="ribbon-outline" size={24} color="#9333EA" />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {providerProfile.credentials?.length || 0}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Credentials</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: '#16A34A' }, styles.quickStatCardAvailability]}
                    onPress={() => {
                      setProviderDetailInitialTab('about');
                      setScrollToAvailability(true);
                      setShowProviderDetailModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar-outline" size={24} color="#16A34A" />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {providerProfile.availability?.length || 0}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Days Available</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: '#fbbf24' }, styles.quickStatCardRating]}
                    onPress={() => {
                      setProviderDetailInitialTab('reviews');
                      setScrollToAvailability(false);
                      setShowProviderDetailModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="star-outline" size={24} color="#fbbf24" />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {(providerProfile.rating || 0).toFixed(1)}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Rating</Text>
                  </TouchableOpacity>
                </View>
                {/* Bank Account Status */}
                <View style={[styles.bankAccountStatusCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
                  <View style={styles.bankAccountStatusRow}>
                    <Ionicons
                      name={providerProfile.bankAccountVerified ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={providerProfile.bankAccountVerified ? "#16a34a" : "#ef4444"}
                    />
                    <Text style={[styles.bankAccountStatusText, { color: themeHook.colors.text }]}>
                      Bank Account: {providerProfile.bankAccountVerified 
                        ? (providerProfile.bankAccountMask ? `Connected (****${providerProfile.bankAccountMask})` : "Connected")
                        : "Not Connected"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats - Client */}
            {user.userType === 'CLIENT' && (
              isLoadingClientData ? (
                <View style={[styles.quickStatsSection, { borderTopColor: themeHook.colors.border }]}>
                  <ActivityIndicator size="small" color={themeHook.colors.primary} />
                </View>
              ) : clientStats ? (
              <View style={[styles.quickStatsSection, { borderTopColor: themeHook.colors.border }]}>
                <View style={styles.quickStatsGrid}>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}
                    onPress={() => router.push('/(tabs)/bookings')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={24}
                      color={themeHook.colors.primary}
                    />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {clientStats.totalBookings}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Total Bookings</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: '#9333EA' }]}
                    onPress={() => router.push('/(tabs)/bookings?tab=upcoming')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time-outline" size={24} color="#9333EA" />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {clientStats.upcomingBookings}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Upcoming</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: '#16A34A' }]}
                    onPress={() => router.push('/(tabs)/bookings?tab=past')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle-outline" size={24} color="#16A34A" />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      {clientStats.completedBookings}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Completed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickStatCard, { backgroundColor: themeHook.colors.surface, borderColor: '#fbbf24' }]}
                    onPress={() => router.push('/payment/history')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cash-outline" size={24} color="#fbbf24" />
                    <Text style={[styles.quickStatNumber, { color: themeHook.colors.text }]}>
                      ${clientStats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.quickStatLabel, { color: themeHook.colors.textSecondary }]}>Total Spent</Text>
                  </TouchableOpacity>
                </View>
                {/* Payment Method Status */}
                <View style={[styles.bankAccountStatusCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
                  <View style={styles.bankAccountStatusRow}>
                    <Ionicons
                      name={hasPaymentMethod ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={hasPaymentMethod ? "#16a34a" : "#ef4444"}
                    />
                    <Text style={[styles.bankAccountStatusText, { color: themeHook.colors.text }]}>
                      Payment Method: {hasPaymentMethod ? "Connected" : "Not Set Up"}
                    </Text>
                  </View>
                </View>
              </View>
              ) : null
            )}

            {/* Recent Activity - Client */}
            {user.userType === 'CLIENT' && recentBookings.length > 0 && (
              <View style={[styles.recentActivitySection, { backgroundColor: themeHook.colors.background }]}>
                <View style={styles.recentActivityHeader}>
                  <Text style={[styles.recentActivityTitle, { color: themeHook.colors.text }]}>Recent Activity</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                    <Text style={[styles.viewAllText, { color: themeHook.colors.primary }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                {recentBookings.map((booking) => (
                  <TouchableOpacity
                    key={booking.id}
                    style={[styles.recentActivityCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}
                    onPress={() => router.push(`/booking/${booking.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recentActivityContent}>
                      <View style={styles.recentActivityInfo}>
                        <Text style={[styles.recentActivityProviderName, { color: themeHook.colors.text }]}>
                          {booking.provider?.firstName} {booking.provider?.lastName}
                        </Text>
                        <Text style={[styles.recentActivityServiceName, { color: themeHook.colors.textSecondary }]}>
                          {booking.service?.name}
                        </Text>
                        <Text style={[styles.recentActivityDate, { color: themeHook.colors.textTertiary }]}>
                          {new Date(booking.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {booking.scheduledTime}
                        </Text>
                      </View>
                      <View style={styles.recentActivityRight}>
                        <View style={[
                          styles.recentActivityStatusBadge,
                          booking.status === 'COMPLETED' && { backgroundColor: '#16A34A' + '20', borderColor: '#16A34A' },
                          booking.status === 'CONFIRMED' && { backgroundColor: '#9333EA' + '20', borderColor: '#9333EA' },
                          booking.status === 'PENDING' && { backgroundColor: '#fbbf24' + '20', borderColor: '#fbbf24' },
                        ]}>
                          <Text style={[
                            styles.recentActivityStatusText,
                            { color: themeHook.colors.text }
                          ]}>
                            {booking.status}
                          </Text>
                        </View>
                        {booking.payment?.amount && (
                          <Text style={[styles.recentActivityAmount, { color: themeHook.colors.text }]}>
                            ${booking.payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recent Activity Empty State - Client */}
            {user.userType === 'CLIENT' && !isLoadingClientData && recentBookings.length === 0 && (
              <View style={[styles.recentActivitySection, { backgroundColor: themeHook.colors.background }]}>
                <Text style={[styles.recentActivityTitle, { color: themeHook.colors.text }]}>Recent Activity</Text>
                <View style={[styles.recentActivityEmptyState, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
                  <Ionicons name="calendar-outline" size={48} color={themeHook.colors.textTertiary} />
                  <Text style={[styles.recentActivityEmptyText, { color: themeHook.colors.text }]}>
                    No bookings yet
                  </Text>
                  <Text style={[styles.recentActivityEmptySubtext, { color: themeHook.colors.textSecondary }]}>
                    Your recent bookings will appear here
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Provider Profile Info */}
        {user?.userType === 'PROVIDER' && (
          <View style={[styles.providerInfoSection, { backgroundColor: themeHook.colors.background }]}>
            {isLoadingProfile ? (
              <ActivityIndicator size="small" color={themeHook.colors.primary} />
            ) : providerProfile ? (
              <>
                {providerProfile.bio && (
                  <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderWidth: 2, borderColor: themeHook.colors.primary, borderRadius: theme.radii.lg, padding: themeHook.spacing.lg }]}>
                    <Text style={[styles.infoLabel, { color: themeHook.colors.text }]}>Bio</Text>
                    <Text style={[styles.infoValue, { color: themeHook.colors.textSecondary }]}>{providerProfile.bio}</Text>
                  </View>
                )}
                {providerProfile.specialties && providerProfile.specialties.length > 0 ? (
                  <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderWidth: 2, borderColor: themeHook.colors.primary, borderRadius: theme.radii.lg, padding: themeHook.spacing.lg }]}>
                    <Text style={[styles.infoLabel, { color: themeHook.colors.text }]}>Specialties</Text>
                    <View style={styles.specialtiesContainer}>
                      {providerProfile.specialties.map((specialty, index) => (
                        <View key={index} style={[styles.specialtyTag, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}>
                          <Text style={[styles.specialtyText, { color: themeHook.colors.primary }]}>{specialty}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderWidth: 2, borderColor: themeHook.colors.primary, borderRadius: theme.radii.lg, padding: themeHook.spacing.lg }]}>
                    <Text style={[styles.infoLabel, { color: themeHook.colors.text }]}>Specialties</Text>
                    <Text style={[styles.infoValue, { color: themeHook.colors.textTertiary, fontStyle: 'italic' }]}>
                      No specialties added yet
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.infoCard, { backgroundColor: themeHook.colors.surface, borderWidth: 1, borderColor: themeHook.colors.border, borderRadius: theme.radii.lg, padding: themeHook.spacing.lg }]}>
                <Text style={[styles.infoValue, { color: themeHook.colors.textSecondary }]}>No profile information yet</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionLabel, { color: themeHook.colors.textSecondary }]}>Account</Text>
          {user?.userType === 'PROVIDER' && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: themeHook.colors.border }]}
              onPress={() => router.push('/provider/edit-profile')}
            >
              <Ionicons name="person-outline" size={20} color={themeHook.colors.primary} />
              <Text style={[styles.menuText, { color: themeHook.colors.text }]}>
                {providerProfile ? 'Edit Provider Profile' : 'Complete Provider Profile'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: themeHook.colors.border }]} onPress={() => router.push('/payment/history')}>
            <Ionicons name="receipt-outline" size={20} color={themeHook.colors.primary} />
            <Text style={[styles.menuText, { color: themeHook.colors.text }]}>Payment History</Text>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
          </TouchableOpacity>

          <Text style={[styles.menuSectionLabel, { color: themeHook.colors.textSecondary }]}>Preferences</Text>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: themeHook.colors.border }]} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color={themeHook.colors.primary} />
            <Text style={[styles.menuText, { color: themeHook.colors.text }]}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
          </TouchableOpacity>

          <Text style={[styles.menuSectionLabel, { color: themeHook.colors.textSecondary }]}>Support</Text>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: themeHook.colors.border }]} onPress={() => router.push('/help-support')}>
            <Ionicons name="help-circle-outline" size={20} color={themeHook.colors.primary} />
            <Text style={[styles.menuText, { color: themeHook.colors.text }]}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: themeHook.colors.border }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: themeHook.colors.border }]} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <RNModal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setShowDeleteModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => !isDeleting && setShowDeleteModal(false)}>
          <View style={[styles.deleteModalOverlay, { backgroundColor: themeHook.colors.overlay }]}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.deleteModalContent, { backgroundColor: themeHook.colors.surface, marginBottom: insets.bottom }]}>
                <View style={styles.deleteModalHeader}>
                  <Ionicons name="alert-circle" size={48} color="#ef4444" />
                  <Text style={[styles.deleteModalTitle, { color: themeHook.colors.text }]}>Delete Account</Text>
                  <Text style={[styles.deleteModalMessage, { color: themeHook.colors.textSecondary }]}>
                    This action cannot be undone. This will permanently delete your account and all
                    associated data.
                  </Text>
                </View>

                <View style={styles.deleteModalInputContainer}>
                  <Text style={[styles.deleteModalInputLabel, { color: themeHook.colors.text }]}>
                    Type <Text style={[styles.deleteModalInputLabelBold, { color: themeHook.colors.text }]}>DELETE</Text> to confirm:
                  </Text>
                  <TextInput
                    style={[styles.deleteModalInput, { backgroundColor: themeHook.colors.background, borderColor: themeHook.colors.border, color: themeHook.colors.text }]}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholderTextColor={themeHook.colors.textTertiary}
                    editable={!isDeleting}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={[styles.deleteModalButton, styles.deleteModalButtonCancel, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}
                    onPress={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    <Text style={[styles.deleteModalButtonCancelText, { color: themeHook.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.deleteModalButton,
                      styles.deleteModalButtonConfirm,
                      deleteConfirmText !== 'DELETE' && styles.deleteModalButtonDisabled,
                    ]}
                    onPress={handleConfirmDelete}
                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.deleteModalButtonConfirmText}>Delete Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Alert Modal */}
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


      {/* Provider Detail Modal */}
      {user?.userType === 'PROVIDER' && user?.id && (
        <ProviderDetailModal
          visible={showProviderDetailModal}
          providerId={user.id}
          onClose={() => {
            setShowProviderDetailModal(false);
            setScrollToAvailability(false);
          }}
          initialTab={providerDetailInitialTab}
          scrollToAvailability={scrollToAvailability}
        />
      )}

      {/* Network Error Modal */}
      <NetworkErrorModal
        visible={networkErrorModal.visible}
        onClose={() => setNetworkErrorModal({ visible: false, message: '' })}
        onRetry={networkErrorModal.onRetry}
        message={networkErrorModal.message}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  title: {
    ...theme.typography.h1,
    fontSize: 24,
    fontWeight: '700',
  },
  headerEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing['2xl'],
  },
  // Hero Section (Provider)
  heroSection: {
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  heroPatternRow: {
    flexDirection: 'row',
    flex: 1,
  },
  heroPatternCell: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  heroPatternCellAlt: {
    opacity: 0.9,
  },
  heroPatternRadial: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '200%',
    height: '200%',
    marginTop: '-100%',
    marginLeft: '-100%',
    borderRadius: 1000,
    opacity: 0.2,
  },
  heroContent: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  heroAvatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: theme.colors.white,
    ...theme.shadows.card,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.white,
  },
  heroRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    ...theme.shadows.card,
  },
  heroRatingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroReviewCount: {
    fontSize: 12,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  heroEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  heroEmail: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  // Quick Stats Section
  quickStatsSection: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderTopWidth: 1,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 2,
  },
  quickStatCardServices: {
    borderColor: theme.colors.primary[500],
  },
  quickStatCardCredentials: {
    borderColor: '#9333EA',
  },
  quickStatCardAvailability: {
    borderColor: '#16A34A',
  },
  quickStatCardRating: {
    borderColor: '#fbbf24',
  },
  bankAccountStatusCard: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
  },
  bankAccountStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bankAccountStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  profileSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  profileCard: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.card,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
    position: 'relative',
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.white,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    ...theme.typography.display,
    fontSize: 28,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  email: {
    ...theme.typography.body,
  },
  menuSection: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  menuSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.neutral[900],
  },
  logoutText: {
    color: '#ef4444',
  },
  providerInfoSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  infoCard: {
    marginBottom: theme.spacing.lg,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.neutral[900],
    lineHeight: 24,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    fontWeight: '500',
  },
  // Delete Account Modal
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  deleteModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  deleteModalTitle: {
    ...theme.typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[900],
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  deleteModalMessage: {
    ...theme.typography.body,
    color: theme.colors.neutral[600],
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalInputContainer: {
    marginBottom: theme.spacing.xl,
  },
  deleteModalInputLabel: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.sm,
  },
  deleteModalInputLabelBold: {
    fontWeight: '700',
    color: '#ef4444',
  },
  deleteModalInput: {
    borderWidth: 2,
    borderColor: theme.colors.neutral[300],
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.neutral[900],
    backgroundColor: theme.colors.white,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalButtonCancel: {
    borderWidth: 1,
  },
  deleteModalButtonCancelText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  deleteModalButtonConfirm: {
    backgroundColor: '#ef4444',
  },
  deleteModalButtonDisabled: {
    backgroundColor: theme.colors.neutral[300],
    opacity: 0.5,
  },
  deleteModalButtonConfirmText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.white,
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
    borderRadius: 60,
    gap: 4,
  },
  photoOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  photoOverlayTextSmall: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  // Recent Activity Section (Client)
  recentActivitySection: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  recentActivityTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentActivityCard: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
  },
  recentActivityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentActivityInfo: {
    flex: 1,
  },
  recentActivityProviderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  recentActivityServiceName: {
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
  recentActivityDate: {
    fontSize: 12,
  },
  recentActivityRight: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  recentActivityStatusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
  },
  recentActivityStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recentActivityAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentActivityEmptyState: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  recentActivityEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  recentActivityEmptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    marginTop: theme.spacing.sm,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
