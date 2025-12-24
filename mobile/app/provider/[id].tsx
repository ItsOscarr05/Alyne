import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { providerService, ProviderDetail, Service, Review } from '../../services/provider';
import { reviewService } from '../../services/review';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import { formatTime12Hour } from '../../utils/timeUtils';

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');

  useEffect(() => {
    loadProvider();
  }, [id]);

  // Reload provider when screen comes into focus (e.g., after editing a review)
  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadProvider();
      }
    }, [id])
  );

  const loadProvider = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      logger.debug('Loading provider', { providerId: id });
      const data = await providerService.getById(id);
      logger.debug('Provider data loaded', { providerId: id, hasData: !!data });
      setProvider(data);
    } catch (error: any) {
      logger.error('Error loading provider', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#fbbf24" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#fbbf24" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#d1d5db" />);
    }
    return stars;
  };

  const handleBookSession = () => {
    if (!id) return;
    router.push({
      pathname: '/booking/create',
      params: { providerId: id },
    });
  };

  const handleFlagReview = async (reviewId: string) => {
    // On web, use window.confirm as fallback
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to flag this review? It will be hidden and reviewed by our team.'
      );
      if (!confirmed) {
        return;
      }

      try {
        await reviewService.flagReview(reviewId);
        window.alert('Success! Review has been flagged. Thank you for your report.');
        // Reload provider to refresh reviews
        loadProvider();
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message ||
          'Failed to flag review';
        window.alert(`Error: ${errorMessage}`);
      }
    } else {
      // Show confirmation dialog for native
      Alert.alert(
        'Flag Review',
        'Are you sure you want to flag this review? It will be hidden and reviewed by our team.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Flag',
            style: 'destructive',
            onPress: async () => {
              try {
                await reviewService.flagReview(reviewId);
                Alert.alert('Success', 'Review has been flagged. Thank you for your report.');
                // Reload provider to refresh reviews
                loadProvider();
              } catch (error: any) {
                const errorMessage =
                  error.response?.data?.error?.message ||
                  error.response?.data?.message ||
                  error.message ||
                  'Failed to flag review';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Provider not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>
            <View style={styles.profileAvatar}>
              {provider.profilePhoto ? (
                <Image
                  source={{ uri: provider.profilePhoto }}
                  style={styles.profileAvatarImage}
                  contentFit="cover"
                  transition={200}
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Ionicons name="person" size={32} color="#94a3b8" />
                </View>
              )}
            </View>

            <View style={styles.profileHeaderContent}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{provider.name}</Text>
                {provider.isVerified && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                )}
              </View>

              <View style={styles.ratingRow}>
                <View style={styles.stars}>{renderStars(provider.rating)}</View>
                <Text style={styles.ratingText}>
                  {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
                </Text>
              </View>

              {provider.specialties.length > 0 && (
                <View style={styles.specialties}>
                  {provider.specialties.map((specialty, index) => (
                    <View key={index} style={styles.specialtyTag}>
                      <Text style={styles.specialtyText}>{specialty}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'services' && styles.activeTab]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
              Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
              Reviews ({provider.reviewCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'about' && (
            <View>
              {provider.bio && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{provider.bio}</Text>
                </View>
              )}

              {provider.credentials && provider.credentials.length > 0 && (
                <>
                  <View style={styles.sectionDivider} />
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Credentials</Text>
                    {provider.credentials.map((cred) => (
                      <View key={cred.id} style={styles.credentialItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        <View style={styles.credentialInfo}>
                          <Text style={styles.credentialName}>{cred.name}</Text>
                          {cred.issuer && (
                            <Text style={styles.credentialIssuer}>{cred.issuer}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {provider.availability &&
                provider.availability.length > 0 &&
                (() => {
                  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                  type DaySummary = {
                    label: string;
                    hasAvailability: boolean;
                    timeRange?: string;
                  };

                  const summaries: DaySummary[] = daysOfWeek.map((label, index) => {
                    const slots = provider.availability.filter((slot) => slot.dayOfWeek === index);
                    if (slots.length === 0) {
                      return { label, hasAvailability: false };
                    }

                    const sorted = [...slots].sort((a, b) =>
                      a.startTime.localeCompare(b.startTime)
                    );
                    const first = sorted[0];
                    const last = sorted[sorted.length - 1];

                    return {
                      label,
                      hasAvailability: true,
                      timeRange: `${formatTime12Hour(first.startTime)} – ${formatTime12Hour(last.endTime)}`,
                    };
                  });

                  // Filter to only show days with availability
                  const availableDays = summaries.filter(day => day.hasAvailability);

                  return (
                    <>
                      <View style={styles.sectionDivider} />
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Availability</Text>
                        <View style={styles.availabilityDaysRow}>
                          {availableDays.map((day) => (
                            <View
                              key={day.label}
                              style={styles.availabilityDayPill}
                            >
                              <Text style={styles.availabilityDayPillText}>
                                {day.label}
                              </Text>
                              <Text style={styles.availabilityTimeSmall}>
                                {day.timeRange || '—'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </>
                  );
                })()}

              {/* Session format & location */}
              <View style={styles.sectionDivider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session Format & Location</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={18} color="#64748b" />
                  <Text style={styles.infoText}>
                    Sessions are held within the provider&apos;s listed service area. Exact address
                    is shared after booking is confirmed.
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="desktop-outline" size={18} color="#64748b" />
                  <Text style={styles.infoText}>
                    Many providers can offer virtual sessions on request. Use Messages to confirm
                    what works best for you.
                  </Text>
                </View>
              </View>

              {/* Approach & style */}
              <View style={styles.sectionDivider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Approach & Style</Text>
                <Text style={styles.infoText}>
                  Sessions focus on your goals, at your pace. Expect a calm, collaborative
                  environment with space for questions and check‑ins throughout.
                </Text>
                {provider.specialties && provider.specialties.length > 0 && (
                  <View style={styles.chipRow}>
                    {provider.specialties.slice(0, 3).map((tag) => (
                      <View key={tag} style={styles.chip}>
                        <Text style={styles.chipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Logistics & expectations */}
              <View style={styles.sectionDivider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Logistics & Expectations</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color="#64748b" />
                  <Text style={styles.infoText}>
                    Please arrive a few minutes early (or join virtually on time) so you can get the
                    full benefit of your session.
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="refresh-outline" size={18} color="#64748b" />
                  <Text style={styles.infoText}>
                    If you need to reschedule or cancel, reach out as soon as possible so the
                    provider can open the spot for someone else.
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={18} color="#64748b" />
                  <Text style={styles.infoText}>
                    Use Messages to clarify anything before your first visit—what to bring, how to
                    prepare, or what to expect.
                  </Text>
                </View>
              </View>

              {/* Contact Info */}
              <View style={styles.sectionDivider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Info</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="mail-outline" size={18} color="#64748b" />
                  <Text style={styles.infoText}>{provider.email}</Text>
                </View>
                {provider.phoneNumber && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={18} color="#64748b" />
                    <Text style={styles.infoText}>{provider.phoneNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {activeTab === 'services' && (
            <View>
              {provider.services && provider.services.length > 0 ? (
                (() => {
                  // Remove duplicates by service ID, and also by name+price combination
                  const seenIds = new Set<string>();
                  const seenKeys = new Set<string>();
                  const uniqueServices = provider.services.filter((service) => {
                    // First check by ID
                    if (seenIds.has(service.id)) {
                      return false;
                    }
                    seenIds.add(service.id);

                    // Also check by name+price combination to catch true duplicates
                    const key = `${service.name}|${service.price}`;
                    if (seenKeys.has(key)) {
                      return false;
                    }
                    seenKeys.add(key);

                    return true;
                  });

                  return (
                    <View style={styles.gridContainer}>
                      {uniqueServices.map((service) => (
                        <View key={service.id} style={styles.serviceCardWrapper}>
                          <View style={styles.serviceCard}>
                            <View style={styles.serviceHeader}>
                              <View style={styles.serviceTitleRow}>
                                <Text style={styles.serviceName}>{service.name}</Text>
                                <Text style={styles.serviceDurationChip}>
                                  <Ionicons name="time-outline" size={14} color="#64748b" />{' '}
                                  <Text style={styles.serviceDurationChipText}>
                                    {service.duration} min
                                  </Text>
                                </Text>
                              </View>
                              <View style={styles.servicePriceTag}>
                                <Text style={styles.servicePriceAmount}>${service.price}/session</Text>
                              </View>
                            </View>
                            {service.description && (
                              <Text style={styles.serviceDescription} numberOfLines={3} ellipsizeMode="tail">
                                {service.description}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                })()
              ) : (
                <Text style={styles.emptyText}>No services available</Text>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {provider.reviews && provider.reviews.length > 0 ? (
                <View style={styles.gridContainer}>
                  {provider.reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCardWrapper}>
                      <View style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewerInfo}>
                            <View style={styles.reviewerAvatar}>
                              <Text style={styles.reviewerInitials}>
                                {review.client.firstName[0]}
                                {review.client.lastName[0]}
                              </Text>
                            </View>
                            <View style={styles.reviewerTextBlock}>
                              <Text style={styles.reviewerName} numberOfLines={1}>
                                {review.client.firstName} {review.client.lastName}
                              </Text>
                              <View style={styles.reviewMetaRow}>
                                <View style={styles.reviewRatingPill}>
                                  <Ionicons name="star" size={12} color="#fbbf24" />
                                  <Text style={styles.reviewRatingText}>
                                    {review.rating.toFixed(1)}
                                  </Text>
                                </View>
                                <View style={styles.reviewStars}>{renderStars(review.rating)}</View>
                                <Text style={styles.reviewDate} numberOfLines={1}>
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.reviewActions}>
                            {user && user.id === review.client.id && (
                              <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => {
                                  router.push({
                                    pathname: '/review/edit',
                                    params: {
                                      reviewId: review.id,
                                      providerName: provider.name,
                                      initialRating: review.rating.toString(),
                                      initialComment: review.comment || '',
                                    },
                                  });
                                }}
                              >
                                <Ionicons name="pencil-outline" size={16} color="#2563eb" />
                              </TouchableOpacity>
                            )}
                            {user && user.id !== review.client.id && (
                              <TouchableOpacity
                                style={styles.flagButton}
                                onPress={() => handleFlagReview(review.id)}
                              >
                                <Ionicons name="flag-outline" size={16} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {review.comment && (
                          <Text style={styles.reviewComment} numberOfLines={4} ellipsizeMode="tail">
                            {review.comment}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No reviews yet</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookSession}>
          <Text style={styles.bookButtonText}>Book Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#64748b',
  },
  specialties: {
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
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2563eb',
    fontWeight: '600',
  },
  tabContent: {
    padding: 24,
    backgroundColor: '#ffffff',
    minHeight: 400,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  credentialIssuer: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563eb',
  },
  availabilityDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 8,
  },
  availabilityDayPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  availabilityDayPillDisabled: {
    opacity: 0.4,
  },
  availabilityDayPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1e293b',
  },
  availabilityDayPillTextDisabled: {
    color: '#94a3b8',
  },
  availabilityTimeSmall: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCardWrapper: {
    width: '48%',
  },
  serviceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 180,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitleRow: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  serviceDurationChip: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
  },
  serviceDurationChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  servicePriceTag: {
    alignItems: 'flex-end',
  },
  servicePriceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    lineHeight: 20,
    flex: 1,
  },
  reviewCardWrapper: {
    width: '48%',
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#2563eb',
    minHeight: 200,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  editButton: {
    padding: 4,
  },
  flagButton: {
    padding: 4,
  },
  reviewerInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  reviewerTextBlock: {
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#fef9c3',
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  reviewComment: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginTop: 12,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 40,
  },
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  bookButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
});
