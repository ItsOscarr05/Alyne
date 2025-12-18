import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { FormField } from '../../components/ui/FormField';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';

export default function RegisterScreen() {
  const router = useRouter();
  const modal = useModal();
  const { register } = useAuth();
  const [userType, setUserType] = useState<'provider' | 'client' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!userType || !email || !password || !firstName || !lastName) {
      modal.showAlert({
        title: 'Required',
        message: 'Please fill in all fields',
        type: 'warning',
      });
      return;
    }

    if (password.length < 8) {
      modal.showAlert({
        title: 'Invalid Password',
        message: 'Password must be at least 8 characters',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, firstName, lastName, userType);
      router.replace('/(tabs)');
    } catch (error: any) {
      modal.showAlert({
        title: 'Registration Failed',
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
              <Ionicons name="person-add" size={32} color={theme.colors.white} />
            </View>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Alyne community</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.userTypeCard}>
            <Text style={styles.userTypeLabel}>I am a...</Text>
            <View style={styles.userTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'provider' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('provider')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={userType === 'provider' ? theme.colors.primary[500] : theme.colors.neutral[500]}
                />
                <Text
                  style={[
                    styles.userTypeButtonText,
                    userType === 'provider' && styles.userTypeButtonTextActive,
                  ]}
                >
                  Provider
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'client' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('client')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={userType === 'client' ? theme.colors.primary[500] : theme.colors.neutral[500]}
                />
                <Text
                  style={[
                    styles.userTypeButtonText,
                    userType === 'client' && styles.userTypeButtonTextActive,
                  ]}
                >
                  Client
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Account Information</Text>
            
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
              label="Password"
              placeholder="Create a password (min. 8 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={isLoading}
              disabled={!userType || isLoading}
              style={styles.primaryButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
  userTypeCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    ...theme.shadows.card,
  },
  userTypeLabel: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
    fontSize: 16,
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
  userTypeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radii.md,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  userTypeButtonActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  userTypeButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.neutral[500],
  },
  userTypeButtonTextActive: {
    color: theme.colors.primary[500],
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

