import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { onboardingService } from '../../services/onboarding';
import * as ImagePicker from 'expo-image-picker';

type Step = 'profile' | 'services' | 'credentials' | 'availability' | 'complete';

export default function ProviderOnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [loading, setLoading] = useState(false);

  // Redirect if not a provider
  useEffect(() => {
    if (user && user.userType !== 'PROVIDER') {
      router.replace('/(tabs)/profile');
    }
  }, [user, router]);

  // Profile state
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Service state
  const [services, setServices] = useState<Array<{
    id?: string;
    name: string;
    description: string;
    price: string;
    duration: string;
  }>>([{ name: '', description: '', price: '', duration: '' }]);

  // Credential state
  const [credentials, setCredentials] = useState<Array<{
    id?: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
  }>>([{ name: '', issuer: '', issueDate: '', expiryDate: '' }]);

  // Availability state
  const [availability, setAvailability] = useState<Array<{
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
  }>>([]);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfilePhoto(base64);
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim()) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([...services, { name: '', description: '', price: '', duration: '' }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const addCredential = () => {
    setCredentials([...credentials, { name: '', issuer: '', issueDate: '', expiryDate: '' }]);
  };

  const removeCredential = (index: number) => {
    setCredentials(credentials.filter((_, i) => i !== index));
  };

  const updateCredential = (index: number, field: string, value: string) => {
    const updated = [...credentials];
    updated[index] = { ...updated[index], [field]: value };
    setCredentials(updated);
  };

  const toggleAvailability = (dayOfWeek: number) => {
    const existing = availability.find((a) => a.dayOfWeek === dayOfWeek);
    if (existing) {
      setAvailability(availability.filter((a) => a.dayOfWeek !== dayOfWeek));
    } else {
      setAvailability([...availability, { dayOfWeek, startTime: '09:00', endTime: '17:00', isRecurring: true }]);
    }
  };

  const updateAvailabilityTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    const updated = availability.map((a) =>
      a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
    );
    setAvailability(updated);
  };

  const handleSaveProfile = async () => {
    if (!bio.trim()) {
      Alert.alert('Required', 'Please enter a bio.');
      return;
    }

    setLoading(true);
    try {
      // Update profile photo if selected
      if (profilePhoto) {
        await onboardingService.updateUserProfile({ profilePhoto });
        await refreshUser();
      }

      // Get user location (for MVP, use default or prompt)
      const serviceArea = {
        center: { lat: 0, lng: 0 }, // TODO: Get actual location
        radius: 20,
      };

      await onboardingService.updateProfile({
        bio,
        specialties,
        serviceArea,
      });

      setCurrentStep('services');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServices = async () => {
    const validServices = services.filter((s) => s.name.trim() && s.price && s.duration);
    if (validServices.length === 0) {
      Alert.alert('Required', 'Please add at least one service.');
      return;
    }

    setLoading(true);
    try {
      for (const service of validServices) {
        await onboardingService.createService({
          name: service.name,
          description: service.description,
          price: parseFloat(service.price),
          duration: parseInt(service.duration, 10),
        });
      }
      setCurrentStep('credentials');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save services');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    setLoading(true);
    try {
      const validCredentials = credentials.filter((c) => c.name.trim());
      for (const credential of validCredentials) {
        await onboardingService.createCredential({
          name: credential.name,
          issuer: credential.issuer || undefined,
          issueDate: credential.issueDate || undefined,
          expiryDate: credential.expiryDate || undefined,
        });
      }
      setCurrentStep('availability');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvailability = async () => {
    setLoading(true);
    try {
      for (const slot of availability) {
        await onboardingService.createAvailability({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: slot.isRecurring,
        });
      }
      setCurrentStep('complete');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save availability');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    router.replace('/(tabs)/profile');
  };

  const renderProfileStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepDescription}>
        Create your professional profile to start attracting clients
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Profile Photo</Text>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          {profilePhoto ? (
            <Text style={styles.photoButtonText}>Photo selected ✓</Text>
          ) : (
            <>
              <Ionicons name="camera-outline" size={24} color="#2563eb" />
              <Text style={styles.photoButtonText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Bio *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell clients about your experience and approach..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Specialties</Text>
        <View style={styles.specialtyInputContainer}>
          <TextInput
            style={styles.specialtyInput}
            placeholder="e.g., Personal Training, Yoga"
            value={specialtyInput}
            onChangeText={setSpecialtyInput}
            onSubmitEditing={addSpecialty}
          />
          <TouchableOpacity style={styles.addButton} onPress={addSpecialty}>
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.specialtyTags}>
          {specialties.map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <Text style={styles.specialtyTagText}>{specialty}</Text>
              <TouchableOpacity onPress={() => removeSpecialty(index)}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveProfile}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderServicesStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Your Services</Text>
      <Text style={styles.stepDescription}>
        Define the services you offer and their pricing
      </Text>

      {services.map((service, index) => (
        <View key={index} style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceNumber}>Service {index + 1}</Text>
            {services.length > 1 && (
              <TouchableOpacity onPress={() => removeService(index)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Service name *"
            value={service.name}
            onChangeText={(value) => updateService(index, 'name', value)}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={service.description}
            onChangeText={(value) => updateService(index, 'description', value)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Price ($) *"
                value={service.price}
                onChangeText={(value) => updateService(index, 'price', value)}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Duration (min) *"
                value={service.duration}
                onChangeText={(value) => updateService(index, 'duration', value)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addService}>
        <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
        <Text style={styles.addServiceButtonText}>Add Another Service</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveServices}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCredentialsStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Your Credentials</Text>
      <Text style={styles.stepDescription}>
        Showcase your certifications and qualifications (optional)
      </Text>

      {credentials.map((credential, index) => (
        <View key={index} style={styles.serviceCard}>
          <View style={styles.serviceHeader}>
            <Text style={styles.serviceNumber}>Credential {index + 1}</Text>
            {credentials.length > 1 && (
              <TouchableOpacity onPress={() => removeCredential(index)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Credential name *"
            value={credential.name}
            onChangeText={(value) => updateCredential(index, 'name', value)}
          />
          <TextInput
            style={styles.input}
            placeholder="Issuing organization"
            value={credential.issuer}
            onChangeText={(value) => updateCredential(index, 'issuer', value)}
          />
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Issue date (YYYY-MM-DD)"
                value={credential.issueDate}
                onChangeText={(value) => updateCredential(index, 'issueDate', value)}
              />
            </View>
            <View style={styles.halfInput}>
              <TextInput
                style={styles.input}
                placeholder="Expiry date (YYYY-MM-DD)"
                value={credential.expiryDate}
                onChangeText={(value) => updateCredential(index, 'expiryDate', value)}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addServiceButton} onPress={addCredential}>
        <Ionicons name="add-circle-outline" size={20} color="#2563eb" />
        <Text style={styles.addServiceButtonText}>Add Another Credential</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveCredentials}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderAvailabilityStep = () => (
    <ScrollView style={styles.stepContent}>
      <Text style={styles.stepTitle}>Set Your Availability</Text>
      <Text style={styles.stepDescription}>
        When are you available for bookings?
      </Text>

      {daysOfWeek.map((day, dayIndex) => {
        const slot = availability.find((a) => a.dayOfWeek === dayIndex);
        return (
          <View key={dayIndex} style={styles.availabilityCard}>
            <TouchableOpacity
              style={styles.availabilityHeader}
              onPress={() => toggleAvailability(dayIndex)}
            >
              <Text style={styles.availabilityDay}>{day}</Text>
              {slot ? (
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              ) : (
                <Ionicons name="ellipse-outline" size={24} color="#cbd5e1" />
              )}
            </TouchableOpacity>
            {slot && (
              <View style={styles.availabilityTimes}>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:00"
                    value={slot.startTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'startTime', value)}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="17:00"
                    value={slot.endTime}
                    onChangeText={(value) => updateAvailabilityTime(dayIndex, 'endTime', value)}
                  />
                </View>
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSaveAvailability}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCompleteStep = () => (
    <View style={styles.completeContainer}>
      <Ionicons name="checkmark-circle" size={80} color="#10b981" />
      <Text style={styles.completeTitle}>Profile Complete!</Text>
      <Text style={styles.completeDescription}>
        Your provider profile is now set up. You can start receiving booking requests!
      </Text>
      <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
        <Text style={styles.primaryButtonText}>Go to Profile</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Setup</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.headerDivider} />

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((['profile', 'services', 'credentials', 'availability'].indexOf(currentStep) + 1) / 4) * 100}%`,
              },
            ]}
          />
        </View>

        {currentStep === 'profile' && renderProfileStep()}
        {currentStep === 'services' && renderServicesStep()}
        {currentStep === 'credentials' && renderCredentialsStep()}
        {currentStep === 'availability' && renderAvailabilityStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  stepContent: {
    flex: 1,
    padding: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  photoButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  specialtyInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  specialtyInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialtyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  specialtyTagText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 24,
  },
  addServiceButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  availabilityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  availabilityTimes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 12,
  },
  completeDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
});

