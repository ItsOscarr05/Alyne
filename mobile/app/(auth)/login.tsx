import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validateEmail } from '../../utils/passwordValidation';
import { storage } from '../../utils/storage';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';

const REMEMBERED_EMAIL_KEY = 'remembered_email';
const REMEMBERED_PASSWORD_KEY = 'remembered_password';

export default function LoginScreen() {
  const router = useRouter();
  const modal = useModal();
  const themeHook = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered credentials on mount
  useEffect(() => {
    const loadRememberedCredentials = async () => {
      try {
        const [rememberedEmail, rememberedPassword] = await Promise.all([
          storage.getItem(REMEMBERED_EMAIL_KEY),
          storage.getItem(REMEMBERED_PASSWORD_KEY),
        ]);
        if (rememberedEmail && rememberedPassword) {
          setEmail(rememberedEmail);
          setPassword(rememberedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        // Silently fail if we can't load remembered credentials
        console.error('Error loading remembered credentials:', error);
      }
    };
    loadRememberedCredentials();
  }, []);

  // Validate form fields
  const isFormValid = useMemo(() => {
    return validateEmail(email) && password.trim().length > 0;
  }, [email, password]);

  const handleLogin = async () => {
    if (!email || !password) {
      modal.showAlert({
        title: 'Required',
        message: 'Please enter your email and password',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await login(email, password);
      
      // Save or clear credentials based on "remember me" preference
      if (rememberMe) {
        await Promise.all([
          storage.setItem(REMEMBERED_EMAIL_KEY, email),
          storage.setItem(REMEMBERED_PASSWORD_KEY, password),
        ]);
      } else {
        await Promise.all([
          storage.removeItem(REMEMBERED_EMAIL_KEY),
          storage.removeItem(REMEMBERED_PASSWORD_KEY),
        ]);
      }
      
      // Route based on user type - providers must complete onboarding first
      if (response.user.userType === 'PROVIDER') {
        if (response.user.providerOnboardingComplete !== true) {
          router.replace('/provider/onboarding');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      } else {
        router.replace('/(tabs)'); // Defaults to discover/index for clients
      }
    } catch (error: any) {
      logger.error('Login error', error);
      modal.showAlert({
        title: getErrorTitle(error) || 'Login Failed',
        message: getUserFriendlyError(error) || 'An error occurred during login. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/welcome')}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: themeHook.colors.primary }]}>
              <Ionicons name="lock-closed" size={32} color={themeHook.colors.white} />
            </View>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: themeHook.colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: themeHook.colors.textSecondary }]}>Sign in to continue to Alyne</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={[styles.formCard, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
            <Text style={[styles.cardTitle, { color: themeHook.colors.text }]}>Sign In</Text>
            
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

            <View style={styles.fieldSpacer} />

            <FormField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              required
            />

            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, { borderColor: rememberMe ? themeHook.colors.primary : themeHook.colors.border, backgroundColor: rememberMe ? themeHook.colors.primary : 'transparent' }]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={16} color={themeHook.colors.white} />
                )}
              </View>
              <Text style={[styles.rememberMeText, { color: themeHook.colors.text }]}>Remember me</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!isFormValid || isLoading}
              style={styles.primaryButton}
            />

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push('/(auth)/reset-password')}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotPasswordText, { color: themeHook.colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: themeHook.colors.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.footerLink, { color: themeHook.colors.primary }]}>Sign Up</Text>
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
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    marginTop: theme.spacing.xl,
  },
  formCard: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  cardTitle: {
    ...theme.typography.h2,
    fontSize: 20,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  fieldSpacer: {
    height: theme.spacing.md,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  rememberMeText: {
    ...theme.typography.body,
    fontSize: 14,
  },
  primaryButton: {
    marginTop: theme.spacing.lg,
  },
  forgotPasswordButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  forgotPasswordText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    ...theme.typography.body,
  },
  footerLink: {
    ...theme.typography.body,
    fontWeight: '600',
  },
});

