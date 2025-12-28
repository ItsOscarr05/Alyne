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
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { theme } from '../../theme';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { EditProviderModal } from '../../components/EditProviderModal';
import * as ImagePicker from 'expo-image-picker';
import { onboardingService } from '../../services/onboarding';
import { storage } from '../../utils/storage';
import { plaidService } from '../../services/plaid';

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
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, deleteAccount, refreshUser } = useAuth();
  const modal = useModal();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isHoveringPhoto, setIsHoveringPhoto] = useState(false);

  useEffect(() => {
    if (user?.userType === 'PROVIDER') {
      loadProviderProfile();
    }
  }, [user]);

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
        // Check bank account status
        let bankAccountVerified = false;
        try {
          const bankInfo = await plaidService.getBankAccountInfo();
          if (bankInfo && bankInfo.verified) {
            bankAccountVerified = true;
          }
        } catch (error) {
          // Bank account not connected or error - that's okay
          logger.debug('No bank account info', error);
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
      // Profile might not exist yet, that's okay
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
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {user?.userType === 'PROVIDER' ? 'Provider Profile' : 'Profile'}
          </Text>
          <TouchableOpacity
            style={styles.headerEditButton}
            onPress={() => {
              if (user?.userType === 'PROVIDER') {
                setShowEditModal(true);
              } else {
                router.push('/settings/edit-profile');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerDivider} />
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
                          ]}
                        />
                      ))}
                    </View>
                  ))}
                  {/* Radial gradient effect */}
                  <View style={styles.heroPatternRadial} />
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
                    {providerProfile && providerProfile.rating && providerProfile.rating > 0 && (
                      <View style={styles.heroRatingBadge}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.heroRatingText}>
                          {providerProfile.rating.toFixed(1)}
                        </Text>
                        {providerProfile.reviewCount && providerProfile.reviewCount > 0 && (
                          <Text style={styles.heroReviewCount}>
                            ({providerProfile.reviewCount})
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.heroName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <View style={styles.heroEmailContainer}>
                    <Ionicons name="mail-outline" size={14} color={theme.colors.neutral[500]} />
                    <Text style={styles.heroEmail}>{user.email}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.profileSection}>
                <View style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <View style={styles.avatarWrapper}>
                      <TouchableOpacity
                        style={styles.avatar}
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
                              style={styles.avatarImage}
                              contentFit="cover"
                            />
                            {(isHoveringPhoto || isUpdatingPhoto) && (
                              <View style={styles.photoOverlay}>
                                {isUpdatingPhoto ? (
                                  <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                  <>
                                    <Ionicons name="camera" size={20} color="#ffffff" />
                                    <Text style={styles.photoOverlayTextSmall}>Change</Text>
                                  </>
                                )}
                              </View>
                            )}
                          </>
                        ) : (
                          <>
                            <Text style={styles.avatarText}>
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </Text>
                            {(isHoveringPhoto || isUpdatingPhoto) && (
                              <View style={styles.photoOverlay}>
                                {isUpdatingPhoto ? (
                                  <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                  <>
                                    <Ionicons name="camera" size={20} color="#ffffff" />
                                    <Text style={styles.photoOverlayTextSmall}>Add Photo</Text>
                                  </>
                                )}
                              </View>
                            )}
                          </>
                        )}
                      </TouchableOpacity>
                      <View style={styles.userTypeBadge}>
                        <Ionicons name="person" size={12} color={theme.colors.white} />
                        <Text style={styles.userTypeText}>Client</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.name}>
                      {user.firstName} {user.lastName}
                    </Text>
                    <View style={styles.emailContainer}>
                      <Ionicons name="mail-outline" size={16} color={theme.colors.neutral[500]} />
                      <Text style={styles.email}>{user.email}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats - Provider Only */}
            {user.userType === 'PROVIDER' && providerProfile && (
              <View style={styles.quickStatsSection}>
                <View style={styles.quickStatsGrid}>
                  <View style={[styles.quickStatCard, styles.quickStatCardServices]}>
                    <Ionicons
                      name="briefcase-outline"
                      size={24}
                      color={theme.colors.primary[500]}
                    />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.services?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Services</Text>
                  </View>
                  <View style={[styles.quickStatCard, styles.quickStatCardCredentials]}>
                    <Ionicons name="ribbon-outline" size={24} color="#9333EA" />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.credentials?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Credentials</Text>
                  </View>
                  <View style={[styles.quickStatCard, styles.quickStatCardAvailability]}>
                    <Ionicons name="calendar-outline" size={24} color="#16A34A" />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.availability?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Days Available</Text>
                  </View>
                  <View style={[styles.quickStatCard, styles.quickStatCardRating]}>
                    <Ionicons name="star-outline" size={24} color="#fbbf24" />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.rating && providerProfile.rating > 0
                        ? providerProfile.rating.toFixed(1)
                        : 'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Rating</Text>
                  </View>
                </View>
                {/* Bank Account Status */}
                <View style={styles.bankAccountStatusCard}>
                  <View style={styles.bankAccountStatusRow}>
                    <Ionicons
                      name={providerProfile.bankAccountVerified ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={providerProfile.bankAccountVerified ? "#16a34a" : "#ef4444"}
                    />
                    <Text style={styles.bankAccountStatusText}>
                      Bank Account: {providerProfile.bankAccountVerified ? "Connected" : "Not Connected"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Provider Profile Info */}
        {user?.userType === 'PROVIDER' && (
          <View style={styles.providerInfoSection}>
            {isLoadingProfile ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : providerProfile ? (
              <>
                {providerProfile.bio && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Bio</Text>
                    <Text style={styles.infoValue}>{providerProfile.bio}</Text>
                  </View>
                )}
                {providerProfile.specialties && providerProfile.specialties.length > 0 ? (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Specialties</Text>
                    <View style={styles.specialtiesContainer}>
                      {providerProfile.specialties.map((specialty, index) => (
                        <View key={index} style={styles.specialtyTag}>
                          <Text style={styles.specialtyText}>{specialty}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Specialties</Text>
                    <Text style={[styles.infoValue, { color: '#94a3b8', fontStyle: 'italic' }]}>
                      No specialties added yet
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoValue}>No profile information yet</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionLabel}>Account</Text>
          {user?.userType === 'PROVIDER' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="person-outline" size={20} color={theme.colors.primary[500]} />
              <Text style={styles.menuText}>
                {providerProfile ? 'Edit Provider Profile' : 'Complete Provider Profile'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/payment/history')}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.menuText}>Payment History</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <Text style={styles.menuSectionLabel}>Preferences</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <Text style={styles.menuSectionLabel}>Support</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/help-support')}>
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Delete Account</Text>
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
          <View style={styles.deleteModalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.deleteModalContent}>
                <View style={styles.deleteModalHeader}>
                  <Ionicons name="alert-circle" size={48} color="#ef4444" />
                  <Text style={styles.deleteModalTitle}>Delete Account</Text>
                  <Text style={styles.deleteModalMessage}>
                    This action cannot be undone. This will permanently delete your account and all
                    associated data.
                  </Text>
                </View>

                <View style={styles.deleteModalInputContainer}>
                  <Text style={styles.deleteModalInputLabel}>
                    Type <Text style={styles.deleteModalInputLabelBold}>DELETE</Text> to confirm:
                  </Text>
                  <TextInput
                    style={styles.deleteModalInput}
                    value={deleteConfirmText}
                    onChangeText={setDeleteConfirmText}
                    placeholderTextColor={theme.colors.neutral[300]}
                    editable={!isDeleting}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.deleteModalButtons}>
                  <TouchableOpacity
                    style={[styles.deleteModalButton, styles.deleteModalButtonCancel]}
                    onPress={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                  >
                    <Text style={styles.deleteModalButtonCancelText}>Cancel</Text>
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

      {/* Edit Provider Modal */}
      {user?.userType === 'PROVIDER' && (
        <EditProviderModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadProviderProfile();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
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
    backgroundColor: '#CBD5E1',
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  title: {
    ...theme.typography.h1,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[900],
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
    backgroundColor: theme.colors.primary[50],
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
    backgroundColor: theme.colors.primary[50],
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    ...theme.shadows.card,
  },
  heroRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  heroReviewCount: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.neutral[900],
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
    borderTopColor: theme.colors.neutral[200],
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
  },
  bankAccountStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bankAccountStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  quickStatLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    fontWeight: '500',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: theme.colors.neutral[50],
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  profileCard: {
    backgroundColor: theme.colors.white,
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
    color: theme.colors.white,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.white,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    ...theme.typography.display,
    fontSize: 28,
    color: theme.colors.neutral[900],
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
    color: theme.colors.neutral[500],
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
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  specialtyText: {
    fontSize: 14,
    color: theme.colors.primary[500],
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
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
  },
  deleteModalButtonCancelText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.neutral[700],
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
});
