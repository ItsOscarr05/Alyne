import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal as RNModal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewService } from '../services/review';
import { logger } from '../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';
import { useModal } from '../hooks/useModal';
import { AlertModal } from './ui/AlertModal';

interface SubmitReviewModalProps {
  visible: boolean;
  bookingId: string | null;
  providerId: string | null;
  providerName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubmitReviewModal({
  visible,
  bookingId,
  providerId,
  providerName,
  onClose,
  onSuccess,
}: SubmitReviewModalProps) {
  const modal = useModal();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible && bookingId) {
      setRating(0);
      setComment('');
      setSubmitting(false);
      setChecking(true);
      setHasExistingReview(false);
      checkExistingReview();
    } else {
      setRating(0);
      setComment('');
      setSubmitting(false);
      setChecking(false);
      setHasExistingReview(false);
    }
  }, [visible, bookingId]);

  // Check if review already exists
  const checkExistingReview = async () => {
    if (!bookingId) {
      setChecking(false);
      return;
    }

    try {
      const result = await reviewService.getReviewByBooking(bookingId);
      if (result.data) {
        setHasExistingReview(true);
        modal.showAlert({
          title: 'Already Reviewed',
          message: 'You have already submitted a review for this booking.',
          type: 'info',
          onButtonPress: () => {
            modal.hideAlert();
            onClose();
          },
        });
        // Close after a short delay
        setTimeout(() => {
          modal.hideAlert();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      // Review doesn't exist, which is fine
      console.log('No existing review found (this is expected)');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!rating) {
      modal.showAlert({
        title: 'Required',
        message: 'Please select a rating',
        type: 'warning',
      });
      return;
    }

    if (!bookingId || !providerId) {
      modal.showAlert({
        title: 'Error',
        message: 'Missing booking or provider information',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting review with data:', {
        bookingId,
        providerId,
        rating,
        comment: comment.trim() || undefined,
      });
      const result = await reviewService.submitReview({
        bookingId,
        providerId,
        rating,
        comment: comment.trim() || undefined,
      });
      console.log('Review submitted successfully:', result);

      modal.showAlert({
        title: 'Success',
        message: 'Thank you for your review!',
        type: 'success',
        onButtonPress: () => {
          modal.hideAlert();
          onClose();
          onSuccess?.();
        },
      });

      // Close after a short delay
      setTimeout(() => {
        modal.hideAlert();
        onClose();
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      logger.error('Error submitting review', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);

      // Handle "review already exists" error gracefully
      if (
        errorMessage.toLowerCase().includes('already exists') ||
        errorMessage.toLowerCase().includes('already submitted')
      ) {
        modal.showAlert({
          title: 'Already Reviewed',
          message: 'You have already submitted a review for this booking.',
          type: 'info',
          onButtonPress: () => {
            modal.hideAlert();
            onClose();
          },
        });
        setTimeout(() => {
          modal.hideAlert();
          onClose();
        }, 1500);
      } else {
        modal.showAlert({
          title: errorTitle,
          message: errorMessage,
          type: 'error',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#fbbf24' : '#d1d5db'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <>
      <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContainer}>
                {/* Close Button */}
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={28} color="#1e293b" />
                </TouchableOpacity>

                {checking ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Checking...</Text>
                  </View>
                ) : hasExistingReview ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="checkmark-circle" size={64} color="#10b981" />
                    <Text style={styles.alreadyReviewedText}>
                      You have already reviewed this booking
                    </Text>
                    <TouchableOpacity style={styles.backButton} onPress={onClose}>
                      <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Header */}
                    <View style={styles.header}>
                      <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                      </TouchableOpacity>
                      <Text style={styles.headerTitle}>Write a Review</Text>
                      <View style={styles.backButton} />
                    </View>
                    <View style={styles.headerDivider} />

                    <View style={styles.section}>
                      <Text style={styles.label}>How was your experience?</Text>
                      {providerName && <Text style={styles.providerName}>with {providerName}</Text>}
                      <View style={styles.starsContainer}>{renderStars()}</View>
                      {rating > 0 && (
                        <Text style={styles.ratingText}>
                          {rating === 1 && 'Poor'}
                          {rating === 2 && 'Fair'}
                          {rating === 3 && 'Good'}
                          {rating === 4 && 'Very Good'}
                          {rating === 5 && 'Excellent'}
                        </Text>
                      )}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.label}>Tell us more (optional)</Text>
                      <TextInput
                        style={styles.textArea}
                        placeholder="Share your experience with this provider..."
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        maxLength={500}
                      />
                      <Text style={styles.charCount}>{comment.length}/500</Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        (!rating || submitting) && styles.submitButtonDisabled,
                      ]}
                      onPress={handleSubmit}
                      disabled={!rating || submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.submitButtonText}>Submit Review</Text>
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </RNModal>

      {/* Alert Modal */}
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
    </>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
    width: '95%',
    alignSelf: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  alreadyReviewedText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 120,
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
