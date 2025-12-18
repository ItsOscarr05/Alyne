import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../../theme';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const modal = useModal();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      // TODO: Implement API call to change password
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      modal.showAlert({
        title: 'Success',
        message: 'Password changed successfully',
        type: 'success',
        onButtonPress: () => router.back(),
      });
    } catch (error: any) {
      modal.showAlert({
        title: 'Error',
        message: 'Failed to change password. Please check your current password and try again.',
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

          <FormField
            label="Current Password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />

          <View style={styles.fieldSpacer} />

          <FormField
            label="New Password"
            placeholder="Enter your new password (min. 8 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          <View style={styles.fieldSpacer} />

          <FormField
            label="Confirm New Password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Password Requirements</Text>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.requirementText}>At least 8 characters long</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.requirementText}>Mix of letters and numbers recommended</Text>
          </View>
          <View style={styles.requirementItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.requirementText}>Use a unique password not used elsewhere</Text>
          </View>
        </View>

        <Button
          title="Change Password"
          onPress={handleChangePassword}
          loading={isLoading}
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
});
