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
import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { providerService, ProviderDetail, Service, Review } from '../services/provider';
import { reviewService } from '../services/review';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { logger } from '../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';
import { formatTime12Hour } from '../utils/timeUtils';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { EditReviewModal } from './EditReviewModal';
import { AlertModal } from './ui/AlertModal';
import { ConfirmModal } from './ui/ConfirmModal';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../utils/animations';
import { AnimatedLoadingState } from './AnimatedLoadingState';

interface ProviderDetailModalProps {
  visible: boolean;
  providerId: string | null;
  onClose: () => void;
  initialTab?: 'about' | 'services' | 'reviews';
  scrollToAvailability?: boolean;
  /** When user taps "Book Session", called with providerId so parent can open booking modal (after closing this one). */
  onBookSession?: (providerId: string) => void;
}

export function ProviderDetailModal({ visible, providerId, onClose, initialTab = 'about', scrollToAvailability = false, onBookSession }: ProviderDetailModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { onProviderRatingUpdate } = useSocket();
  const { theme: themeHook, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>(initialTab);
  const scrollViewRef = useRef<ScrollView>(null);
  const availabilitySectionRef = useRef<View>(null);
  const [availabilityYPosition, setAvailabilityYPosition] = useState<number | null>(null);
  const scrollAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const currentScrollYRef = useRef(0);
  const tabOpacityAnim = useRef(new Animated.Value(1)).current;
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
      // Set the active tab when modal opens
      if (initialTab) {
        setActiveTab(initialTab);
      }
    } else {
      // Reset state when modal closes
      setProvider(null);
      setIsLoading(true);
      setActiveTab(initialTab);
      setAvailabilityYPosition(null);
    }
  }, [visible, providerId, initialTab]);

  // Scroll to availability section when needed
  useEffect(() => {
    if (visible && scrollToAvailability && activeTab === 'about' && provider && scrollViewRef.current) {
      // Wait for the availability section to be measured
      if (availabilityYPosition === null) {
        return;
      }
      
      // Use requestAnimationFrame for smoother animation timing
      const frameId = requestAnimationFrame(() => {
        // Add a small delay to ensure the content is fully rendered and measured
        const timeoutId = setTimeout(() => {
          if (scrollViewRef.current && availabilityYPosition !== null) {
            const targetY = Math.max(0, availabilityYPosition - 150);
            const startY = currentScrollYRef.current;
            
            // Stop any existing animation
            scrollAnimationRef.current?.stop();
            
            // Create animated value starting from current position
            const animatedValue = new Animated.Value(startY);
            
            // Create listener to update scroll position
            const listenerId = animatedValue.addListener(({ value }) => {
              scrollViewRef.current?.scrollTo({
                y: value,
                animated: false, // We're manually animating
              });
            });
            
            // Animate to target position over 800ms with easing
            scrollAnimationRef.current = Animated.timing(animatedValue, {
              toValue: targetY,
              duration: 800, // 800ms animation duration
              useNativeDriver: false, // scrollTo doesn't support native driver
            });
            
            scrollAnimationRef.current.start(({ finished }) => {
              if (finished) {
                animatedValue.removeListener(listenerId);
              }
            });
          }
        }, 400); // Delay to ensure layout and measurement are complete
        
        return () => clearTimeout(timeoutId);
      });
      
      return () => {
        cancelAnimationFrame(frameId);
        scrollAnimationRef.current?.stop();
      };
    }
  }, [visible, scrollToAvailability, activeTab, provider, availabilityYPosition]);

  // Animate tab switch with cross-fade
  const prevTabRef = useRef<'about' | 'services' | 'reviews'>(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab && provider) {
      // Cross-fade: fade out, then fade in
      Animated.sequence([
        Animated.timing(tabOpacityAnim, {
          toValue: 0,
          duration: ANIMATION_DURATIONS.FAST / 2,
          easing: ANIMATION_EASING.easeIn,
          useNativeDriver: true,
        }),
        Animated.timing(tabOpacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATIONS.FAST / 2,
          easing: ANIMATION_EASING.easeOut,
          useNativeDriver: true,
        }),
      ]).start();
      prevTabRef.current = activeTab;
    }
  }, [activeTab, provider, tabOpacityAnim]);

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
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color={themeHook.colors.textTertiary} />);
    }
    return stars;
  };

  const handleBookSession = () => {
    if (!providerId) return;
    if (onBookSession) {
      onBookSession(providerId);
      onClose();
    }
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
        <View style={[styles.modalOverlay, { backgroundColor: themeHook.colors.overlay, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary, maxHeight: '90%' }]}>
              {/* Close Button */}
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: themeHook.colors.surfaceElevated }]} onPress={onClose}>
                <Ionicons name="close" size={28} color={themeHook.colors.text} />
              </TouchableOpacity>

              {isLoading ? (
                <AnimatedLoadingState 
                  visible={isLoading}
                  style={styles.loadingContainer}
                />
              ) : !provider ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.errorText, { color: themeHook.colors.textSecondary }]}>Provider not found</Text>
                </View>
              ) : (
                <>
                  <ScrollView 
                    ref={scrollViewRef}
                    style={styles.scrollView} 
                    showsVerticalScrollIndicator={false}
                    onScroll={(event) => {
                      currentScrollYRef.current = event.nativeEvent.contentOffset.y;
                    }}
                    scrollEventThrottle={16}
                  >
                    {/* Profile Header */}
                    <View style={[styles.profileHeader, { backgroundColor: themeHook.colors.surface, borderBottomColor: themeHook.colors.border }]}>
                      <View style={styles.profileHeaderRow}>
                        <View style={[styles.profileAvatar, { borderColor: themeHook.colors.primary }]}>
                          {provider.profilePhoto ? (
                            <Image
                              source={{ uri: provider.profilePhoto }}
                              style={styles.profileAvatarImage}
                              contentFit="cover"
                              transition={200}
                              placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                              cachePolicy="memory-disk"
                              onError={() => {
                                // Silently handle image load errors
                              }}
                            />
                          ) : (
                            <View style={[styles.profileAvatarPlaceholder, { backgroundColor: themeHook.colors.primaryLight }]}>
                              <Ionicons name="person" size={32} color={themeHook.colors.textSecondary} />
                            </View>
                          )}
                        </View>

                        <View style={styles.profileHeaderContent}>
                          <View style={styles.nameRow}>
                            <Text style={[styles.name, { color: themeHook.colors.text }]}>{provider.name}</Text>
                            {provider.isVerified && (
                              <Ionicons name="checkmark-circle" size={20} color={themeHook.colors.success} />
                            )}
                          </View>

                          <View style={styles.ratingRow}>
                            <View style={styles.stars}>{renderStars(provider.rating)}</View>
                            <Text style={[styles.ratingText, { color: themeHook.colors.textSecondary }]}>
                              {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
                            </Text>
                          </View>

                          {provider.specialties.length > 0 && (
                            <View style={styles.specialties}>
                              {provider.specialties.map((specialty, index) => (
                                <View key={index} style={[styles.specialtyTag, { backgroundColor: themeHook.colors.primaryLight }]}>
                                  <Text style={[styles.specialtyText, { color: themeHook.colors.primary }]}>{specialty}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabs, { backgroundColor: themeHook.colors.surface, borderBottomColor: themeHook.colors.border }]}>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'about' && styles.activeTab, activeTab === 'about' && { borderBottomColor: themeHook.colors.primary }]}
                        onPress={() => setActiveTab('about')}
                      >
                        <Text
                          style={[styles.tabText, { color: themeHook.colors.textSecondary }, activeTab === 'about' && styles.activeTabText, activeTab === 'about' && { color: themeHook.colors.primary }]}
                        >
                          About
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'services' && styles.activeTab, activeTab === 'services' && { borderBottomColor: themeHook.colors.primary }]}
                        onPress={() => setActiveTab('services')}
                      >
                        <Text
                          style={[styles.tabText, { color: themeHook.colors.textSecondary }, activeTab === 'services' && styles.activeTabText, activeTab === 'services' && { color: themeHook.colors.primary }]}
                        >
                          Services
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.tab, activeTab === 'reviews' && styles.activeTab, activeTab === 'reviews' && { borderBottomColor: themeHook.colors.primary }]}
                        onPress={() => setActiveTab('reviews')}
                      >
                        <Text
                          style={[styles.tabText, { color: themeHook.colors.textSecondary }, activeTab === 'reviews' && styles.activeTabText, activeTab === 'reviews' && { color: themeHook.colors.primary }]}
                        >
                          Reviews ({provider.reviewCount})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    <View style={styles.tabContent}>
                      <Animated.View style={{ opacity: tabOpacityAnim, flex: 1 }}>
                        {activeTab === 'about' && (
                          <View>
                          {provider.bio && (
                            <View style={styles.section}>
                              <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>About</Text>
                              <Text style={[styles.bioText, { color: themeHook.colors.textSecondary }]}>{provider.bio}</Text>
                            </View>
                          )}

                          {provider.credentials && provider.credentials.length > 0 && (
                            <>
                              <View style={[styles.sectionDivider, { backgroundColor: themeHook.colors.border }]} />
                              <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Credentials</Text>
                                {provider.credentials.map((cred) => (
                                  <View key={cred.id} style={styles.credentialItem}>
                                    <Ionicons name="checkmark-circle" size={20} color={themeHook.colors.success} />
                                    <View style={styles.credentialInfo}>
                                      <Text style={[styles.credentialName, { color: themeHook.colors.text }]}>{cred.name}</Text>
                                      {cred.issuer && (
                                        <Text style={[styles.credentialIssuer, { color: themeHook.colors.textSecondary }]}>{cred.issuer}</Text>
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
                                  <View style={[styles.sectionDivider, { backgroundColor: themeHook.colors.border }]} />
                                  <View 
                                    ref={availabilitySectionRef}
                                    style={styles.section}
                                    onLayout={(event) => {
                                      // Use requestAnimationFrame to ensure layout is complete before measuring
                                      requestAnimationFrame(() => {
                                        // Measure the availability section's position
                                        // The 'y' parameter is relative to the ScrollView's content container
                                        // which is exactly what we need for scrollTo
                                        availabilitySectionRef.current?.measure((x, y, width, height, pageX, pageY) => {
                                          // 'y' is the position relative to the ScrollView content, perfect for scrollTo
                                          setAvailabilityYPosition(y);
                                        });
                                      });
                                    }}
                                  >
                                    <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Availability</Text>
                                    <View style={styles.availabilityDaysRow}>
                                      {availableDays.map((day) => (
                                        <View
                                          key={day.label}
                                          style={[styles.availabilityDayPill, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primary }]}
                                        >
                                          <Text style={[styles.availabilityDayPillText, { color: themeHook.colors.primary }]}>
                                            {day.label}
                                          </Text>
                                          <Text style={[styles.availabilityTimeSmall, { color: themeHook.colors.textSecondary }]}>
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
                          <View style={[styles.sectionDivider, { backgroundColor: themeHook.colors.border }]} />
                          <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Session Format & Location</Text>
                            <View style={styles.infoRow}>
                              <Ionicons name="location-outline" size={18} color={themeHook.colors.textTertiary} />
                              <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
                                Sessions are held within the provider&apos;s listed service area.
                                Exact address is shared after booking is confirmed.
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Ionicons name="desktop-outline" size={18} color={themeHook.colors.textTertiary} />
                              <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
                                Many providers can offer virtual sessions on request. Use Messages
                                to confirm what works best for you.
                              </Text>
                            </View>
                          </View>

                          {/* Approach & style */}
                          <View style={[styles.sectionDivider, { backgroundColor: themeHook.colors.border }]} />
                          <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Approach & Style</Text>
                            <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
                              Sessions focus on your goals, at your pace. Expect a calm,
                              collaborative environment with space for questions and check‑ins
                              throughout.
                            </Text>
                            {provider.specialties && provider.specialties.length > 0 && (
                              <View style={styles.chipRow}>
                                {provider.specialties.slice(0, 3).map((tag) => (
                                  <View key={tag} style={[styles.chip, { backgroundColor: themeHook.colors.primaryLight }]}>
                                    <Text style={[styles.chipText, { color: themeHook.colors.primary }]}>{tag}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>

                          {/* Logistics & expectations */}
                          <View style={[styles.sectionDivider, { backgroundColor: themeHook.colors.border }]} />
                          <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Logistics & Expectations</Text>
                            <View style={styles.infoRow}>
                              <Ionicons name="time-outline" size={18} color={themeHook.colors.textTertiary} />
                              <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
                                Please arrive a few minutes early (or join virtually on time) so you
                                can get the full benefit of your session.
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Ionicons name="refresh-outline" size={18} color={themeHook.colors.textTertiary} />
                              <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
                                If you need to reschedule or cancel, reach out as soon as possible
                                so the provider can open the spot for someone else.
                              </Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Ionicons
                                name="information-circle-outline"
                                size={18}
                                color={themeHook.colors.textTertiary}
                              />
                              <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>
                                Use Messages to clarify anything before your first visit—what to
                                bring, how to prepare, or what to expect.
                              </Text>
                            </View>
                          </View>

                          {/* Contact Info */}
                          <View style={[styles.sectionDivider, { backgroundColor: themeHook.colors.border }]} />
                          <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: themeHook.colors.text }]}>Contact Info</Text>
                            <View style={styles.infoRow}>
                              <Ionicons name="mail-outline" size={18} color={themeHook.colors.textTertiary} />
                              <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>{provider.email}</Text>
                            </View>
                            {provider.phoneNumber && (
                              <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={18} color={themeHook.colors.textTertiary} />
                                <Text style={[styles.infoText, { color: themeHook.colors.textSecondary }]}>{provider.phoneNumber}</Text>
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
                                      <View style={[styles.serviceCard, { backgroundColor: themeHook.isDark ? '#4A6FA5' : themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
                                        <View style={styles.serviceHeader}>
                                          <View style={styles.serviceTitleRow}>
                                            <Text style={[styles.serviceName, { color: themeHook.colors.text }]}>{service.name}</Text>
                                            <Text style={styles.serviceDurationChip}>
                                              <Ionicons
                                                name="time-outline"
                                                size={12}
                                                color={themeHook.colors.textTertiary}
                                              />{' '}
                                              <Text style={[styles.serviceDurationChipText, { color: themeHook.colors.textTertiary }]}>
                                                {service.duration} min
                                              </Text>
                                            </Text>
                                          </View>
                                          <View style={styles.servicePriceTag}>
                                            <Text style={[styles.servicePriceAmount, { color: themeHook.colors.primary }]}>
                                              ${service.price}/session
                                            </Text>
                                          </View>
                                        </View>
                                        {service.description && (
                                          <Text
                                            style={[styles.serviceDescription, { color: themeHook.colors.textSecondary }]}
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
                            <AnimatedEmptyState>
                              <Text style={[styles.emptyText, { color: themeHook.colors.textSecondary }]}>No services available</Text>
                            </AnimatedEmptyState>
                          )}
                        </View>
                      )}

                      {activeTab === 'reviews' && (
                        <View>
                          {provider.reviews && provider.reviews.length > 0 ? (
                            <View style={styles.gridContainer}>
                              {provider.reviews.map((review) => (
                                <View key={review.id} style={styles.reviewCardWrapper}>
                                  <View style={[styles.reviewCard, { backgroundColor: themeHook.isDark ? '#4A6FA5' : themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
                                    <View style={styles.reviewHeader}>
                                      <View style={styles.reviewerInfo}>
                                        <View style={[styles.reviewerAvatar, { backgroundColor: themeHook.colors.primary }]}>
                                          <Text style={[styles.reviewerInitials, { color: themeHook.colors.white }]}>
                                            {review.client.firstName[0]}
                                            {review.client.lastName[0]}
                                          </Text>
                                        </View>
                                        <View style={styles.reviewerTextBlock}>
                                          <Text style={[styles.reviewerName, { color: themeHook.colors.text }]} numberOfLines={1}>
                                            {review.client.firstName} {review.client.lastName}
                                          </Text>
                                          <View style={styles.reviewMetaRow}>
                                            <View style={[styles.reviewRatingPill, { backgroundColor: themeHook.isDark ? '#78350F' : '#FEF3C7' }]}>
                                              <Ionicons name="star" size={12} color="#fbbf24" />
                                              <Text style={[styles.reviewRatingText, { color: themeHook.isDark ? '#FCD34D' : '#92400E' }]}>
                                                {review.rating.toFixed(1)}
                                              </Text>
                                            </View>
                                            <View style={styles.reviewStars}>
                                              {renderStars(review.rating)}
                                            </View>
                                            <Text style={[styles.reviewDate, { color: themeHook.colors.textTertiary }]} numberOfLines={1}>
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
                                                color={themeHook.colors.primary}
                                              />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                              style={styles.deleteButton}
                                              onPress={() => handleDeleteReview(review.id)}
                                            >
                                              <Ionicons
                                                name="trash-outline"
                                                size={16}
                                                color={themeHook.colors.error}
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
                                              color={themeHook.colors.error}
                                            />
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    </View>

                                    <View style={[styles.reviewCardDivider, { backgroundColor: themeHook.colors.border }]} />

                                    {review.comment && (
                                      <Text
                                        style={[styles.reviewComment, { color: themeHook.colors.textSecondary }]}
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
                            <View style={styles.emptyTextContainer}>
                              <Text style={[styles.emptyText, { color: themeHook.colors.textSecondary }]}>No reviews yet</Text>
                            </View>
                          )}
                        </View>
                      )}
                      </Animated.View>
                    </View>
                  </ScrollView>

                  {/* Book Button */}
                  <View style={[styles.footer, { backgroundColor: themeHook.colors.surface, borderTopColor: themeHook.colors.border }]}>
                    {user?.userType === 'CLIENT' && providerId && (
                      <TouchableOpacity
                        style={[styles.messageButton, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}
                        onPress={() => {
                          onClose();
                          router.push(`/messages/${providerId}`);
                        }}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={themeHook.colors.primary} />
                        <Text style={[styles.messageButtonText, { color: themeHook.colors.primary }]}>Message</Text>
                      </TouchableOpacity>
                    )}
                    {onBookSession && (
                      <TouchableOpacity style={[styles.bookButton, { backgroundColor: themeHook.colors.primary }]} onPress={handleBookSession}>
                        <Text style={[styles.bookButtonText, { color: themeHook.colors.white }]}>Book Session</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

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
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
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
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  specialtyTag: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
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
    // borderBottomColor set via inline styles
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  activeTabText: {
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
    marginBottom: theme.spacing.md,
  },
  sectionDivider: {
    height: 1,
    marginVertical: theme.spacing.lg,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
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
    marginBottom: 2,
  },
  credentialIssuer: {
    fontSize: 13,
  },
  availabilityDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  availabilityDayPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  availabilityDayPillDisabled: {
    // backgroundColor set via inline styles
  },
  availabilityDayPillText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  availabilityDayPillTextDisabled: {
    // color set via inline styles
  },
  availabilityTimeSmall: {
    fontSize: 9,
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
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.md,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  serviceCardWrapper: {
    width: '100%',
  },
  serviceCard: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 180,
  },
  serviceHeader: {
    flexDirection: 'column',
    gap: 8,
  },
  serviceTitleRow: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  serviceDurationChip: {
    marginTop: 3,
    fontSize: 11,
  },
  serviceDurationChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  servicePriceTag: {
    alignItems: 'flex-start',
  },
  servicePriceAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  reviewCardWrapper: {
    width: '100%',
  },
  reviewCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 180,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    position: 'relative',
    paddingRight: 40,
    minWidth: 0,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitials: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reviewRatingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-start',
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  flagButton: {
    padding: 4,
  },
  reviewCardDivider: {
    height: 1,
    marginVertical: theme.spacing.sm,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  emptyTextContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
  },
  messageButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderWidth: 2,
    flex: 1,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bookButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    flex: 1,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
