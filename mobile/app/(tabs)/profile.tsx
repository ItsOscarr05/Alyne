import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { providerService } from '../../services/provider';

interface ProviderProfile {
  id: string;
  bio: string | null;
  specialties: string[];
  services: Array<{ id: string; name: string; price: number; duration: number }>;
  credentials: Array<{ id: string; name: string; issuer: string | null }>;
  availability: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (user?.userType === 'PROVIDER') {
      loadProviderProfile();
    }
  }, [user]);

  const loadProviderProfile = async () => {
    if (!user?.id) return;
    
    setIsLoadingProfile(true);
    try {
      console.log('Loading provider profile for user:', user.id);
      // Get provider profile using the user's own ID
      const profile = await providerService.getById(user.id);
      console.log('Provider profile loaded:', profile);
      console.log('Specialties:', profile?.specialties);
      console.log('Services:', profile?.services);
      console.log('Credentials:', profile?.credentials);
      console.log('Availability:', profile?.availability);
      
      if (profile) {
        setProviderProfile({
          id: profile.id,
          bio: profile.bio || null,
          specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
          services: Array.isArray(profile.services) ? profile.services : [],
          credentials: Array.isArray(profile.credentials) ? profile.credentials : [],
          availability: Array.isArray(profile.availability) ? profile.availability : [],
        });
        console.log('Provider profile state set:', {
          bio: profile.bio,
          specialtiesCount: Array.isArray(profile.specialties) ? profile.specialties.length : 0,
          servicesCount: Array.isArray(profile.services) ? profile.services.length : 0,
          credentialsCount: Array.isArray(profile.credentials) ? profile.credentials.length : 0,
          availabilityCount: Array.isArray(profile.availability) ? profile.availability.length : 0,
        });
      }
    } catch (error: any) {
      console.error('Error loading provider profile:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Profile might not exist yet, that's okay
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {user && (
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.firstName[0]}{user.lastName[0]}
                </Text>
              </View>
            </View>
            <Text style={styles.name}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeText}>
                {user.userType === 'PROVIDER' ? 'Provider' : 'Client'}
              </Text>
            </View>
          </View>
        )}

        {/* Provider Profile Info */}
        {user?.userType === 'PROVIDER' && (
          <View style={styles.providerInfoSection}>
            {isLoadingProfile ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : providerProfile ? (
              <>
                {providerProfile.bio && (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Bio</Text>
                    <Text style={styles.infoValue}>{providerProfile.bio}</Text>
                  </View>
                )}
                {providerProfile.specialties && providerProfile.specialties.length > 0 ? (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Specialties</Text>
                    <View style={styles.specialtiesContainer}>
                      {providerProfile.specialties.map((specialty, index) => (
                        <View key={index} style={styles.specialtyTag}>
                          <Text style={styles.specialtyText}>{specialty}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Specialties</Text>
                    <Text style={[styles.infoValue, { color: '#94a3b8', fontStyle: 'italic' }]}>
                      No specialties added yet
                    </Text>
                  </View>
                )}
                
                {/* Stats Section */}
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Profile Statistics</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>
                        {providerProfile.services ? providerProfile.services.length : 0}
                      </Text>
                      <Text style={styles.statLabel}>Services</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>
                        {providerProfile.credentials ? providerProfile.credentials.length : 0}
                      </Text>
                      <Text style={styles.statLabel}>Credentials</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statNumber}>
                        {providerProfile.availability ? providerProfile.availability.length : 0}
                      </Text>
                      <Text style={styles.statLabel}>Availability Days</Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoValue}>No profile information yet</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.menuSection}>
          {user?.userType === 'PROVIDER' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/provider/onboarding')}
            >
              <Ionicons name="person-outline" size={20} color="#1e293b" />
              <Text style={styles.menuText}>
                {providerProfile ? 'Edit Provider Profile' : 'Complete Provider Profile'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={20} color="#1e293b" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={20} color="#1e293b" />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={20} color="#1e293b" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  userTypeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  menuSection: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  logoutText: {
    color: '#ef4444',
  },
  providerInfoSection: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    padding: 24,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specialtyText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

