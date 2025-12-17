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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <FormField
          label="Current Password"
          placeholder="Enter your current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />

        <FormField
          label="New Password"
          placeholder="Enter your new password (min. 8 characters)"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />

        <FormField
          label="Confirm New Password"
          placeholder="Confirm your new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

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
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
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
    padding: theme.spacing.xl,
  },
  changeButton: {
    marginTop: theme.spacing.xl,
  },
});

