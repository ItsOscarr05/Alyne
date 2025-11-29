import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { providerService, ProviderDetail, Service, Review } from '../../services/provider';
import { reviewService } from '../../services/review';
import { useAuth } from '../../hooks/useAuth';

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
      const confirmed = window.confirm('Are you sure you want to flag this review? It will be hidden and reviewed by our team.');
      if (!confirmed) {
        return;
      }
      
      try {
        await reviewService.flagReview(reviewId);
        window.alert('Success! Review has been flagged. Thank you for your report.');
        // Reload provider to refresh reviews
        loadProvider();
      } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message 
          || error.response?.data?.message 
          || error.message 
          || 'Failed to flag review';
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
                const errorMessage = error.response?.data?.error?.message 
                  || error.response?.data?.message 
                  || error.message 
                  || 'Failed to flag review';
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
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
        {/* Header Image */}
        <View style={styles.imageContainer}>
          {provider.profilePhoto ? (
            <Image 
              source={{ uri: provider.profilePhoto }} 
              style={styles.headerImage}
              contentFit="cover"
              transition={200}
              placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="person" size={64} color="#94a3b8" />
            </View>
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButtonOverlay}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{provider.name}</Text>
            {provider.isVerified && (
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
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
              )}

              {provider.availability && provider.availability.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Availability</Text>
                  {provider.availability.map((slot) => {
                    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = daysOfWeek[slot.dayOfWeek];
                    return (
                      <View key={slot.id} style={styles.availabilityItem}>
                        <View style={styles.availabilityDayRow}>
                          <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                          <Text style={styles.availabilityDay}>{dayName}</Text>
                        </View>
                        <View style={styles.availabilityTimeRow}>
                          <Text style={styles.availabilityTime}>
                            {slot.startTime} - {slot.endTime}
                          </Text>
                          {slot.isRecurring && (
                            <Text style={styles.availabilityRecurring}>Recurring</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {activeTab === 'services' && (
            <View>
              {provider.services && provider.services.length > 0 ? (
                provider.services.map((service) => (
                  <View key={service.id} style={styles.serviceCard}>
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.servicePrice}>${service.price}</Text>
                    </View>
                    {service.description && (
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    )}
                    <View style={styles.serviceMeta}>
                      <Ionicons name="time-outline" size={16} color="#64748b" />
                      <Text style={styles.serviceDuration}>{service.duration} minutes</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No services available</Text>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View>
              {provider.reviews && provider.reviews.length > 0 ? (
                provider.reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewerInfo}>
                        <View style={styles.reviewerAvatar}>
                          <Text style={styles.reviewerInitials}>
                            {review.client.firstName[0]}{review.client.lastName[0]}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.reviewerName}>
                            {review.client.firstName} {review.client.lastName}
                          </Text>
                          <View style={styles.reviewStars}>
                            {renderStars(review.rating)}
                          </View>
                        </View>
                      </View>
                      <View style={styles.reviewHeaderRight}>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Text>
                        <View style={styles.reviewActions}>
                          {user && user.id === review.clientId && (
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
                          {user && user.id !== review.clientId && (
                            <TouchableOpacity
                              style={styles.flagButton}
                              onPress={() => handleFlagReview(review.id)}
                            >
                              <Ionicons name="flag-outline" size={16} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                ))
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
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
  availabilityItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  availabilityDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  availabilityDay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  availabilityTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityTime: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  availabilityRecurring: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  serviceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 20,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#64748b',
  },
  reviewCard: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewHeaderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
    marginTop: 8,
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

