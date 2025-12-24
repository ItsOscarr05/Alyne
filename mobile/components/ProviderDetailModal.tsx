import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal as RNModal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { providerService, ProviderDetail, Service, Review } from '../services/provider';
import { reviewService } from '../services/review';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { logger } from '../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';
import { formatTime12Hour } from '../utils/timeUtils';
import { theme } from '../theme';
import { CreateBookingModal } from './CreateBookingModal';
import { EditReviewModal } from './EditReviewModal';
import { AlertModal } from './ui/AlertModal';
import { ConfirmModal } from './ui/ConfirmModal';

interface ProviderDetailModalProps {
  visible: boolean;
  providerId: string | null;
  onClose: () => void;
}

export function ProviderDetailModal({ visible, providerId, onClose }: ProviderDetailModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { onProviderRatingUpdate } = useSocket();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');
  const [isBookingModalVisible, setIsBookingModalVisible] = useState(false);
  const [isEditReviewModalVisible, setIsEditReviewModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<{
    reviewId: string;
    rating: number;
    comment: string;
  } | null>(null);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (visible && providerId) {
      loadProvider();
    } else {
      // Reset state when modal closes
      setProvider(null);
      setIsLoading(true);
      setActiveTab('about');
    }
  }, [visible, providerId]);

  // Listen for real-time provider rating updates
  useEffect(() => {
    const unsubscribe = onProviderRatingUpdate((data) => {
      logger.debug('Provider rating updated via Socket.io in modal', {
        providerId: data.providerId,
        rating: data.rating,
        reviewCount: data.reviewCount,
      });

      // Update the provider if it matches the current provider
      if (provider && provider.id === data.providerId) {
        setProvider((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rating: data.rating,
            reviewCount: data.reviewCount,
          };
        });
      }
    });

    return unsubscribe;
  }, [onProviderRatingUpdate, provider]);

  const loadProvider = async () => {
    if (!providerId) return;

    setIsLoading(true);
    try {
      logger.debug('Loading provider', { providerId });
      const data = await providerService.getById(providerId);
      logger.debug('Provider data loaded', { providerId, hasData: !!data });
      setProvider(data);
    } catch (error: any) {
      logger.error('Error loading provider', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      setAlertModal({
        visible: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
      });
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
    if (!providerId) return;
    setIsBookingModalVisible(true);
  };

  const handleFlagReview = async (reviewId: string) => {
    setConfirmModal({
      visible: true,
      type: 'warning',
      title: 'Flag Review',
      message: 'Are you sure you want to flag this review? It will be hidden and reviewed by our team.',
      onConfirm: async () => {
        try {
          await reviewService.flagReview(reviewId);
          setAlertModal({
            visible: true,
            type: 'success',
            title: 'Success',
            message: 'Review has been flagged. Thank you for your report.',
          });
          // Reload provider to refresh reviews
          loadProvider();
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message ||
            'Failed to flag review';
          setAlertModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: errorMessage,
          });
        }
      },
    });
  };

  const handleDeleteReview = async (reviewId: string) => {
    setConfirmModal({
      visible: true,
      type: 'danger',
      title: 'Delete Review',
      message: 'Are you sure you want to delete this review? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await reviewService.deleteReview(reviewId);
          setAlertModal({
            visible: true,
            type: 'success',
            title: 'Success',
            message: 'Review deleted successfully',
          });
          // Reload provider to refresh reviews
          loadProvider();
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message ||
            'Failed to delete review';
          setAlertModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: errorMessage,
          });
        }
      },
    });
  };

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              {/* Close Button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={28} color="#1e293b" />
              </TouchableOpacity>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              ) : !provider ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.errorText}>Provider not found</Text>
                </View>
              ) : (
                <>
                  <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                      <View style={styles.profileHeaderRow}>
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
                        <Text
                          style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}
                        >
                          About
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'services' && styles.activeTab]}
                        onPress={() => setActiveTab('services')}
                      >
                        <Text
                          style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}
                        >
                          Services
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
                        onPress={() => setActiveTab('reviews')}
                      >
                        <Text
                          style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}
                        >
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
                                const slots = provider.availability.filter(
                                  (slot) => slot.dayOfWeek === index
                                );
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
                                Sessions are held within the provider&apos;s listed service area.
                                Exact address is shared after booking is confirmed.
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Ionicons name="desktop-outline" size={18} color="#64748b" />
                              <Text style={styles.infoText}>
                                Many providers can offer virtual sessions on request. Use Messages
                                to confirm what works best for you.
                              </Text>
                            </View>
                          </View>

                          {/* Approach & style */}
                          <View style={styles.sectionDivider} />
                          <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Approach & Style</Text>
                            <Text style={styles.infoText}>
                              Sessions focus on your goals, at your pace. Expect a calm,
                              collaborative environment with space for questions and check‑ins
                              throughout.
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
                                Please arrive a few minutes early (or join virtually on time) so you
                                can get the full benefit of your session.
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Ionicons name="refresh-outline" size={18} color="#64748b" />
                              <Text style={styles.infoText}>
                                If you need to reschedule or cancel, reach out as soon as possible
                                so the provider can open the spot for someone else.
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Ionicons
                                name="information-circle-outline"
                                size={18}
                                color="#64748b"
                              />
                              <Text style={styles.infoText}>
                                Use Messages to clarify anything before your first visit—what to
                                bring, how to prepare, or what to expect.
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
                                              <Ionicons
                                                name="time-outline"
                                                size={12}
                                                color="#64748b"
                                              />{' '}
                                              <Text style={styles.serviceDurationChipText}>
                                                {service.duration} min
                                              </Text>
                                            </Text>
                                          </View>
                                          <View style={styles.servicePriceTag}>
                                            <Text style={styles.servicePriceAmount}>
                                              ${service.price}/session
                                            </Text>
                                          </View>
                                        </View>
                                        {service.description && (
                                          <Text
                                            style={styles.serviceDescription}
                                            numberOfLines={3}
                                            ellipsizeMode="tail"
                                          >
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
                                            <View style={styles.reviewStars}>
                                              {renderStars(review.rating)}
                                            </View>
                                            <Text style={styles.reviewDate} numberOfLines={1}>
                                              {new Date(review.createdAt).toLocaleDateString()}
                                            </Text>
                                          </View>
                                        </View>
                                      </View>

                                      <View style={styles.reviewActions}>
                                        {user && user.id === review.client.id && (
                                          <>
                                            <TouchableOpacity
                                              style={styles.editButton}
                                              onPress={() => {
                                                setSelectedReview({
                                                  reviewId: review.id,
                                                  rating: review.rating,
                                                  comment: review.comment || '',
                                                });
                                                setIsEditReviewModalVisible(true);
                                              }}
                                            >
                                              <Ionicons
                                                name="pencil-outline"
                                                size={16}
                                                color="#2563eb"
                                              />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                              style={styles.deleteButton}
                                              onPress={() => handleDeleteReview(review.id)}
                                            >
                                              <Ionicons
                                                name="trash-outline"
                                                size={16}
                                                color="#ef4444"
                                              />
                                            </TouchableOpacity>
                                          </>
                                        )}
                                        {user && user.id !== review.client.id && (
                                          <TouchableOpacity
                                            style={styles.flagButton}
                                            onPress={() => handleFlagReview(review.id)}
                                          >
                                            <Ionicons
                                              name="flag-outline"
                                              size={16}
                                              color="#ef4444"
                                            />
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    </View>

                                    {review.comment && (
                                      <Text
                                        style={styles.reviewComment}
                                        numberOfLines={4}
                                        ellipsizeMode="tail"
                                      >
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
                    {user?.userType === 'CLIENT' && providerId && (
                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={() => {
                          onClose();
                          router.push(`/messages/${providerId}`);
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color="#2563eb" />
                        <Text style={styles.messageButtonText}>Message</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.bookButton} onPress={handleBookSession}>
                      <Text style={styles.bookButtonText}>Book Session</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Create Booking Modal */}
      <CreateBookingModal
        visible={isBookingModalVisible}
        providerId={providerId}
        onClose={() => setIsBookingModalVisible(false)}
      />

      {/* Edit Review Modal */}
      <EditReviewModal
        visible={isEditReviewModalVisible}
        reviewId={selectedReview?.reviewId || null}
        providerName={provider?.name}
        initialRating={selectedReview?.rating}
        initialComment={selectedReview?.comment}
        onClose={() => {
          setIsEditReviewModalVisible(false);
          setSelectedReview(null);
        }}
        onSuccess={() => {
          // Reload provider to refresh reviews
          if (providerId) {
            loadProvider();
          }
        }}
      />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        onClose={() => setAlertModal({ ...alertModal, visible: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal({ ...confirmModal, visible: false })}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.type === 'danger' ? 'Delete' : 'Flag'}
        onConfirm={confirmModal.onConfirm}
      />
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92.5%',
    maxWidth: 600,
    height: '90%',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: '#2563eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: theme.colors.white,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.neutral[700],
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  specialtyTag: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary[500],
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    paddingHorizontal: theme.spacing.xl,
  },
  tab: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary[500],
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.neutral[500],
  },
  activeTabText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  tabContent: {
    padding: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: theme.spacing.lg,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.neutral[700],
  },
  credentialItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.neutral[900],
    marginBottom: 2,
  },
  credentialIssuer: {
    fontSize: 13,
    color: theme.colors.neutral[700],
  },
  availabilityDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  availabilityDayPill: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: '#2563eb',
    minWidth: 60,
    alignItems: 'center',
  },
  availabilityDayPillDisabled: {
    backgroundColor: theme.colors.neutral[50],
  },
  availabilityDayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[500],
    marginBottom: 2,
  },
  availabilityDayPillTextDisabled: {
    color: theme.colors.neutral[500],
  },
  availabilityTimeSmall: {
    fontSize: 9,
    color: theme.colors.neutral[700],
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.neutral[700],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  chip: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.md,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary[500],
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  serviceDurationChip: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748b',
  },
  serviceDurationChipText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  servicePriceTag: {
    alignItems: 'flex-end',
  },
  servicePriceAmount: {
    fontSize: 16,
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
  reviewerTextBlock: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: 4,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  reviewRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reviewRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  flagButton: {
    padding: 4,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.neutral[700],
    marginTop: 12,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    padding: theme.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  messageButton: {
    backgroundColor: theme.colors.white,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    flex: 1,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
  bookButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    flex: 1,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
