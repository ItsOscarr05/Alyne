import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { PasswordRequirements } from '../../components/ui/PasswordRequirements';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validateEmail, validatePassword } from '../../utils/passwordValidation';
import { authService } from '../../services/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const modal = useModal();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'reset'>('email');

  // Validate form fields for email step
  const isEmailStepValid = useMemo(() => {
    return validateEmail(email);
  }, [email]);

  // Validate form fields for reset step
  const isResetStepValid = useMemo(() => {
    return (
      resetToken.trim().length === 6 &&
      validatePassword(newPassword) &&
      newPassword === confirmPassword
    );
  }, [resetToken, newPassword, confirmPassword]);

  const handleRequestReset = async () => {
    if (!validateEmail(email)) {
      modal.showAlert({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      modal.showAlert({
        title: 'Reset Link Sent',
        message: 'If an account exists with this email, a password reset link has been sent.',
        type: 'success',
        onButtonPress: () => setStep('reset'),
      });
    } catch (error: any) {
      modal.showAlert({
        title: 'Request Failed',
        message: error.response?.data?.error?.message || error.message || 'Failed to send reset link',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword(newPassword)) {
      modal.showAlert({
        title: 'Invalid Password',
        message: 'Password does not meet requirements',
        type: 'warning',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      modal.showAlert({
        title: 'Password Mismatch',
        message: 'Passwords do not match',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      modal.showAlert({
        title: 'Password Reset',
        message: 'Your password has been reset successfully. You can now sign in.',
        type: 'success',
        onButtonPress: () => router.replace('/(auth)/login'),
      });
    } catch (error: any) {
      modal.showAlert({
        title: 'Reset Failed',
        message: error.response?.data?.error?.message || error.message || 'Failed to reset password',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="key-outline" size={32} color={theme.colors.white} />
            </View>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {step === 'email' ? 'Reset Password' : 'Set New Password'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter your email to receive a reset code'
                : 'Enter your reset code and new password'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.formCard}>
            {step === 'email' ? (
              <>
                <Text style={styles.cardTitle}>Request Reset</Text>
                
                <FormField
                  label="Email"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  required
                  error={email && !validateEmail(email) ? 'Invalid email address' : undefined}
                />

                <Button
                  title="Send Reset Link"
                  onPress={handleRequestReset}
                  loading={isLoading}
                  disabled={!isEmailStepValid || isLoading}
                  style={styles.primaryButton}
                />
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Reset Password</Text>
                
                <FormField
                  label="Reset Code"
                  placeholder="Enter the 6-digit code from your email"
                  value={resetToken}
                  onChangeText={setResetToken}
                  autoCapitalize="characters"
                  maxLength={6}
                  required
                />

                <View style={styles.fieldSpacer} />

                <FormField
                  label="New Password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setIsNewPasswordFocused(true)}
                  onBlur={() => setIsNewPasswordFocused(false)}
                  secureTextEntry
                  required
                />

                <PasswordRequirements password={newPassword} isFocused={isNewPasswordFocused} />

                <View style={styles.fieldSpacer} />

                <FormField
                  label="Confirm Password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  required
                />

                <Button
                  title="Reset Password"
                  onPress={handleResetPassword}
                  loading={isLoading}
                  disabled={!isResetStepValid || isLoading}
                  style={styles.primaryButton}
                />
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing['2xl'],
    marginBottom: theme.spacing['2xl'],
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: theme.spacing.xs,
    zIndex: 1,
  },
  logoContainer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  form: {
    flex: 1,
    marginTop: theme.spacing.xl,
  },
  formCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    ...theme.shadows.card,
  },
  cardTitle: {
    ...theme.typography.h2,
    fontSize: 20,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  fieldSpacer: {
    height: theme.spacing.md,
  },
  primaryButton: {
    marginTop: theme.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
  },
  footerLink: {
    ...theme.typography.body,
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
});

