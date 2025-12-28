import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validateEmail } from '../../utils/passwordValidation';

export default function LoginScreen() {
  const router = useRouter();
  const modal = useModal();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      // Route based on user type - navigate immediately
      if (response.user.userType === 'PROVIDER') {
        // Navigate immediately to dashboard
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/(tabs)'); // Defaults to discover/index for clients
      }
    } catch (error: any) {
      modal.showAlert({
        title: 'Login Failed',
        message: error.response?.data?.error?.message || error.message || 'An error occurred',
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
            onPress={() => router.push('/(auth)/welcome')}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="lock-closed" size={32} color={theme.colors.white} />
            </View>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to Alyne</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Sign In</Text>
            
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
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    marginTop: theme.spacing.lg,
  },
  forgotPasswordButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  forgotPasswordText: {
    ...theme.typography.body,
    color: theme.colors.primary[500],
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
    color: theme.colors.neutral[500],
  },
  footerLink: {
    ...theme.typography.body,
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
});

