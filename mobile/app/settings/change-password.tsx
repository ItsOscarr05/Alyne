import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import { theme } from '../../theme';
import { FormField } from '../../components/ui/FormField';
import { PasswordRequirements } from '../../components/ui/PasswordRequirements';
import { Button } from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validatePassword } from '../../utils/passwordValidation';
import { authService } from '../../services/auth';
import { useAuth } from '../../hooks/useAuth';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const modal = useModal();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState(false);

  // Validate form fields
  const isFormValid = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      validatePassword(newPassword) &&
      newPassword === confirmPassword
    );
  }, [currentPassword, newPassword, confirmPassword]);

  // Verify current password on blur
  const handleCurrentPasswordBlur = async () => {
    if (!currentPassword.trim()) {
      setIsCurrentPasswordValid(false);
      return;
    }

    setIsVerifyingPassword(true);
    try {
      // Attempt to change password to the same password
      // If current password is correct, we'll get "New password must be different" error
      // If current password is incorrect, we'll get "Current password is incorrect" error
      await authService.changePassword(currentPassword, currentPassword);
      // This shouldn't happen, but if it does, password is valid
      setIsCurrentPasswordValid(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || '';
      // If error says password must be different, that means current password is correct
      if (errorMessage.includes('must be different') || errorMessage.includes('different from current')) {
        setIsCurrentPasswordValid(true);
      } else {
        // Any other error (like incorrect password) means it's not valid
        setIsCurrentPasswordValid(false);
      }
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Reset validation when password changes
  const handleCurrentPasswordChange = (text: string) => {
    setCurrentPassword(text);
    setIsCurrentPasswordValid(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      modal.showAlert({
        title: 'Required',
        message: 'Please fill in all fields',
        type: 'warning',
      });
      return;
    }

    if (newPassword.length < 8) {
      modal.showAlert({
        title: 'Invalid Password',
        message: 'Password must be at least 8 characters',
        type: 'warning',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      modal.showAlert({
        title: 'Password Mismatch',
        message: 'New password and confirmation do not match',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      // Logout and show success modal, then redirect to login page after 3 seconds
      await logout();
      modal.showAlert({
        title: 'Success',
        message: 'Password changed successfully. You will be redirected to sign in with your new password.',
        type: 'success',
        onButtonPress: () => {
          router.replace('/(auth)/login');
        },
      });
      // Redirect after 3 seconds
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to change password. Please check your current password and try again.';
      modal.showAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.headerDivider} />

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.infoText}>
              For your security, choose a strong password with at least 8 characters, including
              letters, numbers, and special characters.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Password Change</Text>

          <View style={styles.currentPasswordContainer}>
            <FormField
              label="Current Password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChangeText={handleCurrentPasswordChange}
              onBlur={handleCurrentPasswordBlur}
              secureTextEntry
              style={styles.currentPasswordInput}
            />
            {isVerifyingPassword && (
              <View style={styles.passwordIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              </View>
            )}
            {!isVerifyingPassword && isCurrentPasswordValid && currentPassword.trim().length > 0 && (
              <View style={styles.passwordIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              </View>
            )}
          </View>

          <View style={styles.fieldSpacer} />

          <FormField
            label="New Password"
            placeholder="Enter your new password"
            value={newPassword}
            onChangeText={setNewPassword}
            onFocus={() => setIsNewPasswordFocused(true)}
            onBlur={() => setIsNewPasswordFocused(false)}
            secureTextEntry
          />

          <PasswordRequirements password={newPassword} isFocused={isNewPasswordFocused} />

          <View style={styles.fieldSpacer} />

          <FormField
            label="Confirm New Password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <Button
          title="Change Password"
          onPress={handleChangePassword}
          loading={isLoading}
          disabled={!isFormValid || isLoading}
          style={styles.changeButton}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
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
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.neutral[900],
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
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.neutral[700],
    flex: 1,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  cardTitle: {
    ...theme.typography.h2,
    fontSize: 18,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.lg,
  },
  fieldSpacer: {
    height: theme.spacing.md,
  },
  requirementsCard: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  requirementsTitle: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  requirementText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.neutral[700],
    flex: 1,
  },
  changeButton: {
    marginTop: theme.spacing.md,
  },
  currentPasswordContainer: {
    position: 'relative',
  },
  currentPasswordInput: {
    marginBottom: 0,
  },
  passwordIndicator: {
    position: 'absolute',
    right: 60, // Position to the left of the eye icon (which is at ~16px from right)
    top: 36, // Position below label (label ~20px + margin ~8px = ~28px, plus a bit more for alignment)
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
