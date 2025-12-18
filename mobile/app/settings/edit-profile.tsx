import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';

export default function EditProfileScreen() {
  const router = useRouter();
  const modal = useModal();
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!firstName || !lastName || !email) {
      modal.showAlert({
        title: 'Required',
        message: 'Please fill in all fields',
        type: 'warning',
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API call to update profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      modal.showAlert({
        title: 'Success',
        message: 'Profile updated successfully',
        type: 'success',
        onButtonPress: () => router.back(),
      });
    } catch (error: any) {
      modal.showAlert({
        title: 'Error',
        message: 'Failed to update profile. Please try again.',
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
          <Text style={styles.title}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.headerDivider} />
        
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.infoText}>
              Update your personal information. Changes will be reflected across your account.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          
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
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={isLoading}
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
  saveButton: {
    marginTop: theme.spacing.md,
  },
});

