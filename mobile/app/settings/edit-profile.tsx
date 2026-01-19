import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { onboardingService } from '../../services/onboarding';
import { storage } from '../../utils/storage';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';

const USER_KEY = 'user_data';

export default function EditProfileScreen() {
  const router = useRouter();
  const modal = useModal();
  const { user, refreshUser } = useAuth();
  const { theme: themeHook } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePhoto || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  
  // Track original state for change detection
  const [originalState, setOriginalState] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    profilePhoto: string | null;
  } | null>(null);

  // Initialize original state and current state from user data
  useEffect(() => {
    if (user) {
      const original = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        profilePhoto: user.profilePhoto || null,
      };
      setOriginalState(original);
      setFirstName(original.firstName);
      setLastName(original.lastName);
      setEmail(original.email);
      setPhoneNumber(original.phoneNumber);
      setProfilePhoto(original.profilePhoto);
    }
  }, [user?.id]); // Only re-initialize if user ID changes

  // Update profile photo when user object changes
  useEffect(() => {
    if (user?.profilePhoto) {
      setProfilePhoto(user.profilePhoto);
    }
  }, [user?.profilePhoto]);

  // Check if there are unsaved changes
  const hasChanges = originalState ? (
    firstName !== originalState.firstName ||
    lastName !== originalState.lastName ||
    email !== originalState.email ||
    phoneNumber !== originalState.phoneNumber ||
    profilePhoto !== originalState.profilePhoto
  ) : false;

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

      if (result.canceled) {
        return;
      }

      if (result.assets[0]) {
        setIsUpdatingPhoto(true);
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfilePhoto(base64);
        
        // Update profile photo via API immediately
        try {
          const updatedUserResponse = await onboardingService.updateUserProfile({ profilePhoto: base64 });
          
          if (updatedUserResponse?.data) {
            await storage.setItem(USER_KEY, JSON.stringify(updatedUserResponse.data));
            await refreshUser();
            modal.showAlert({
              title: 'Success',
              message: 'Profile photo updated successfully',
              type: 'success',
            });
          }
        } catch (error: any) {
          logger.error('Error updating profile photo', error);
          // Revert photo on error
          setProfilePhoto(originalState?.profilePhoto || null);
          modal.showAlert({
            title: 'Error',
            message: getUserFriendlyError(error),
            type: 'error',
          });
        } finally {
          setIsUpdatingPhoto(false);
        }
      }
    } catch (error: any) {
      logger.error('Error picking image', error);
      setIsUpdatingPhoto(false);
      modal.showAlert({
        title: 'Error',
        message: 'Failed to pick image. Please try again.',
        type: 'error',
      });
    }
  };

  const validateForm = (): string | null => {
    if (!firstName.trim()) {
      return 'First name is required';
    }
    if (!lastName.trim()) {
      return 'Last name is required';
    }
    if (!email.trim()) {
      return 'Email is required';
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    // Basic phone validation (if provided)
    if (phoneNumber.trim() && phoneNumber.trim().length < 10) {
      return 'Please enter a valid phone number';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      modal.showAlert({
        title: 'Validation Error',
        message: validationError,
        type: 'warning',
      });
      return;
    }

    if (!hasChanges) {
      modal.showAlert({
        title: 'No Changes',
        message: 'You haven\'t made any changes to save.',
        type: 'info',
      });
      return;
    }

    setIsLoading(true);
    try {
      const updateData: {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        profilePhoto?: string;
      } = {};

      if (firstName !== originalState?.firstName) {
        updateData.firstName = firstName.trim();
      }
      if (lastName !== originalState?.lastName) {
        updateData.lastName = lastName.trim();
      }
      if (phoneNumber !== originalState?.phoneNumber) {
        updateData.phoneNumber = phoneNumber.trim() || undefined;
      }
      if (profilePhoto !== originalState?.profilePhoto) {
        updateData.profilePhoto = profilePhoto || undefined;
      }

      const updatedUserResponse = await onboardingService.updateUserProfile(updateData);
      
      if (updatedUserResponse?.data) {
        await storage.setItem(USER_KEY, JSON.stringify(updatedUserResponse.data));
        await refreshUser();
        
        // Update original state to reflect saved changes
        setOriginalState({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
          profilePhoto,
        });

        modal.showAlert({
          title: 'Success',
          message: 'Profile updated successfully',
          type: 'success',
          onButtonPress: () => router.back(),
        });
      }
    } catch (error: any) {
      logger.error('Error updating profile', error);
      modal.showAlert({
        title: getErrorTitle(error),
        message: getUserFriendlyError(error),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 + insets.top : insets.top}
    >
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, theme.spacing.xl) }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeHook.colors.text }]}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        
        {/* Profile Photo Section */}
        <View style={styles.profilePhotoSection}>
          <TouchableOpacity
            style={styles.profilePhotoContainer}
            onPress={pickImage}
            disabled={isUpdatingPhoto}
            activeOpacity={0.8}
          >
            {isUpdatingPhoto ? (
              <View style={[styles.profilePhotoPlaceholder, { backgroundColor: themeHook.colors.surfaceElevated }]}>
                <ActivityIndicator size="large" color={themeHook.colors.primary} />
              </View>
            ) : profilePhoto ? (
              <View style={[styles.profilePhotoWrapper, { borderColor: themeHook.colors.primary }]}>
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.profilePhoto}
                  resizeMode="cover"
                />
                <View style={[styles.profilePhotoOverlay, { backgroundColor: themeHook.colors.overlay }]}>
                  <Ionicons name="camera" size={24} color={themeHook.colors.white} />
                  <Text style={styles.profilePhotoOverlayText}>Change Photo</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.profilePhotoPlaceholder, { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border }]}>
                <Ionicons name="person-circle-outline" size={64} color={themeHook.colors.primary} />
                <Text style={[styles.profilePhotoPlaceholderText, { color: themeHook.colors.textSecondary }]}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.infoCard, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={themeHook.colors.primary} />
            <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
              Update your personal information. Changes will be reflected across your account.
            </Text>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.cardTitle, { color: themeHook.colors.text }]}>Personal Information</Text>
          
          <FormField
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <View style={styles.fieldSpacer} />

          <FormField
            label="Last Name"
            placeholder="Enter your last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <View style={styles.fieldSpacer} />

          <FormField
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.fieldSpacer} />

          <FormField
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={isLoading}
          disabled={!hasChanges || isLoading}
          style={styles.saveButton}
        />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerDivider: {
    height: 1,
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  infoCard: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.body,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    ...theme.typography.h2,
    fontSize: 18,
    marginBottom: theme.spacing.lg,
  },
  fieldSpacer: {
    height: theme.spacing.md,
  },
  saveButton: {
    marginTop: theme.spacing.md,
  },
  profilePhotoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  profilePhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  profilePhotoOverlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoPlaceholderText: {
    fontSize: 12,
    marginTop: theme.spacing.xs,
    fontWeight: '500',
  },
});

