import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';
import { providerService } from '../../services/provider';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { theme } from '../../theme';

interface ProviderProfile {
  id: string;
  bio: string | null;
  specialties: string[];
  services: Array<{ id: string; name: string; price: number; duration: number }>;
  credentials: Array<{ id: string; name: string; issuer: string | null }>;
  availability: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string }>;
  rating?: number;
  reviewCount?: number;
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
      logger.debug('Loading provider profile for user', { userId: user.id });
      // Get provider profile using the user's own ID
      const profile = await providerService.getById(user.id);
      logger.debug('Provider profile loaded', { 
        hasProfile: !!profile,
        specialtiesCount: Array.isArray(profile?.specialties) ? profile.specialties.length : 0,
        servicesCount: profile?.services?.length || 0,
      });
      
      if (profile) {
        setProviderProfile({
          id: profile.id,
          bio: profile.bio || null,
          specialties: Array.isArray(profile.specialties) ? profile.specialties : [],
          services: Array.isArray(profile.services) ? profile.services : [],
          credentials: Array.isArray(profile.credentials) ? profile.credentials : [],
          availability: Array.isArray(profile.availability) ? profile.availability : [],
          rating: profile.rating || 0,
          reviewCount: profile.reviewCount || 0,
        });
        logger.debug('Provider profile state set', {
          bio: profile.bio,
          specialtiesCount: Array.isArray(profile.specialties) ? profile.specialties.length : 0,
          servicesCount: Array.isArray(profile.services) ? profile.services.length : 0,
          credentialsCount: Array.isArray(profile.credentials) ? profile.credentials.length : 0,
          availabilityCount: Array.isArray(profile.availability) ? profile.availability.length : 0,
        });
      }
    } catch (error: any) {
      logger.error('Error loading provider profile', error);
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
        <Text style={styles.title}>
          {user?.userType === 'PROVIDER' ? 'Provider Profile' : 'Profile'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {user && (
          <>
            {/* Hero Section - Provider Only */}
            {user.userType === 'PROVIDER' ? (
              <View style={styles.heroSection}>
                <View style={styles.heroContent}>
                  <TouchableOpacity
                    style={styles.heroEditButton}
                    onPress={() => router.push('/provider/onboarding')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary[500]} />
                  </TouchableOpacity>
                  <View style={styles.heroAvatarContainer}>
                    <View style={styles.heroAvatar}>
                      {user.profilePhoto ? (
                        <Image
                          source={{ uri: user.profilePhoto }}
                          style={styles.heroAvatarImage}
                          contentFit="cover"
                        />
                      ) : (
                        <Text style={styles.heroAvatarText}>
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </Text>
                      )}
                    </View>
                    {providerProfile && providerProfile.rating > 0 && (
                      <View style={styles.heroRatingBadge}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.heroRatingText}>
                          {providerProfile.rating.toFixed(1)}
                        </Text>
                        {providerProfile.reviewCount > 0 && (
                          <Text style={styles.heroReviewCount}>
                            ({providerProfile.reviewCount})
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <Text style={styles.heroName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <View style={styles.heroEmailContainer}>
                    <Ionicons name="mail-outline" size={14} color={theme.colors.neutral[500]} />
                    <Text style={styles.heroEmail}>{user.email}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.profileSection}>
                <View style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => router.push('/settings/edit-profile')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="create-outline" size={20} color={theme.colors.primary[500]} />
                    </TouchableOpacity>
                    <View style={styles.avatarWrapper}>
                      <View style={styles.avatar}>
                        {user.profilePhoto ? (
                          <Image
                            source={{ uri: user.profilePhoto }}
                            style={styles.avatarImage}
                            contentFit="cover"
                          />
                        ) : (
                          <Text style={styles.avatarText}>
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </Text>
                        )}
                      </View>
                      <View style={styles.userTypeBadge}>
                        <Ionicons name="person" size={12} color={theme.colors.white} />
                        <Text style={styles.userTypeText}>Client</Text>
                      </View>
                    </View>
                    <View style={styles.editButtonPlaceholder} />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.name}>
                      {user.firstName} {user.lastName}
                    </Text>
                    <View style={styles.emailContainer}>
                      <Ionicons name="mail-outline" size={16} color={theme.colors.neutral[500]} />
                      <Text style={styles.email}>{user.email}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats - Provider Only */}
            {user.userType === 'PROVIDER' && providerProfile && (
              <View style={styles.quickStatsSection}>
                <View style={styles.quickStatsGrid}>
                  <View style={[styles.quickStatCard, styles.quickStatCardServices]}>
                    <Ionicons name="briefcase-outline" size={24} color={theme.colors.primary[500]} />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.services?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Services</Text>
                  </View>
                  <View style={[styles.quickStatCard, styles.quickStatCardCredentials]}>
                    <Ionicons name="ribbon-outline" size={24} color="#9333EA" />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.credentials?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Credentials</Text>
                  </View>
                  <View style={[styles.quickStatCard, styles.quickStatCardAvailability]}>
                    <Ionicons name="calendar-outline" size={24} color="#16A34A" />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.availability?.length || 0}
                    </Text>
                    <Text style={styles.quickStatLabel}>Days Available</Text>
                  </View>
                  <View style={[styles.quickStatCard, styles.quickStatCardRating]}>
                    <Ionicons name="star-outline" size={24} color="#fbbf24" />
                    <Text style={styles.quickStatNumber}>
                      {providerProfile.rating > 0 ? providerProfile.rating.toFixed(1) : 'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Rating</Text>
                  </View>
                </View>
              </View>
            )}
          </>
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
              </>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoValue}>No profile information yet</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionLabel}>Account</Text>
          {user?.userType === 'PROVIDER' && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/provider/onboarding')}
            >
              <Ionicons name="person-outline" size={20} color={theme.colors.primary[500]} />
              <Text style={styles.menuText}>
                {providerProfile ? 'Edit Provider Profile' : 'Complete Provider Profile'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/payment/history')}
          >
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.menuText}>Payment History</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <Text style={styles.menuSectionLabel}>Preferences</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <Text style={styles.menuSectionLabel}>Support</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/help-support')}
          >
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary[500]} />
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
    backgroundColor: theme.colors.neutral[50],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.white,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.neutral[900],
  },
  content: {
    flex: 1,
  },
  // Hero Section (Provider)
  heroSection: {
    backgroundColor: theme.colors.white,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  heroContent: {
    alignItems: 'center',
    position: 'relative',
  },
  heroEditButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  heroAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: theme.colors.white,
    ...theme.shadows.card,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  heroAvatarImage: {
    width: '100%',
    height: '100%',
  },
  heroAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.white,
  },
  heroRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    ...theme.shadows.sm,
  },
  heroRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  heroReviewCount: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  heroEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  heroEmail: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  // Quick Stats Section
  quickStatsSection: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderWidth: 2,
  },
  quickStatCardServices: {
    borderColor: theme.colors.primary[500],
  },
  quickStatCardCredentials: {
    borderColor: '#9333EA',
  },
  quickStatCardAvailability: {
    borderColor: '#16A34A',
  },
  quickStatCardRating: {
    borderColor: '#fbbf24',
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  quickStatLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    fontWeight: '500',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: theme.colors.neutral[50],
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  profileCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.card,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
    position: 'relative',
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.white,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.white,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.white,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  editButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    ...theme.typography.display,
    fontSize: 28,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  email: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
  },
  menuSection: {
    backgroundColor: theme.colors.white,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  menuSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.neutral[900],
  },
  logoutText: {
    color: '#ef4444',
  },
  providerInfoSection: {
    backgroundColor: theme.colors.white,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  infoCard: {
    marginBottom: theme.spacing.lg,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.neutral[900],
    lineHeight: 24,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyTag: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
  },
  specialtyText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.lg,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary[500],
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    fontWeight: '500',
  },
});

