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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewService } from '../services/review';
import { logger } from '../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';
import { AlertModal } from './ui/AlertModal';
import { useTheme } from '../contexts/ThemeContext';

interface EditReviewModalProps {
  visible: boolean;
  reviewId: string | null;
  providerName?: string;
  initialRating?: number;
  initialComment?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditReviewModal({
  visible,
  reviewId,
  providerName,
  initialRating,
  initialComment,
  onClose,
  onSuccess,
}: EditReviewModalProps) {
  const themeHook = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialRatingValue, setInitialRatingValue] = useState<number>(0);
  const [initialCommentValue, setInitialCommentValue] = useState<string>('');
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

  // Load initial review data when modal opens
  useEffect(() => {
    if (visible && reviewId) {
      const ratingValue = initialRating || 0;
      const commentValue = initialComment || '';
      
      setRating(ratingValue);
      setComment(commentValue);
      setInitialRatingValue(ratingValue);
      setInitialCommentValue(commentValue);
      setLoading(false);
    } else {
      setRating(0);
      setComment('');
      setInitialRatingValue(0);
      setInitialCommentValue('');
      setSubmitting(false);
      setLoading(true);
    }
  }, [visible, reviewId, initialRating, initialComment]);

  // Check if any changes have been made (but rating must be > 0)
  const hasChanges = rating > 0 && (rating !== initialRatingValue || comment.trim() !== initialCommentValue.trim());

  const handleSubmit = async () => {
    if (!rating) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Required',
        message: 'Please select a rating',
      });
      return;
    }

    if (!reviewId) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Missing review information',
      });
      return;
    }

    setSubmitting(true);
    try {
      logger.debug('Updating review', { reviewId, rating });
      const result = await reviewService.updateReview(reviewId, {
        rating,
        comment: comment.trim() || undefined,
      });
      logger.info('Review updated successfully', { reviewId: result.id });

      setAlertModal({
        visible: true,
        type: 'success',
        title: 'Success',
        message: 'Review updated successfully!',
      });
    } catch (error: any) {
      logger.error('Error updating review', error);
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Failed to update review. Please try again.';

      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlertClose = () => {
    setAlertModal({ ...alertModal, visible: false });
  };

  const handleSuccessAlertClose = () => {
    setAlertModal({ ...alertModal, visible: false });
    onClose();
    onSuccess?.();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => {
            // Toggle selection: if already selected, deselect; otherwise select
            if (rating === i) {
              setRating(0);
            } else {
              setRating(i);
            }
          }}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#fbbf24' : themeHook.colors.textTertiary}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
              {/* Close Button */}
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: themeHook.colors.surfaceElevated }]} onPress={onClose}>
                <Ionicons name="close" size={28} color={themeHook.colors.text} />
              </TouchableOpacity>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={themeHook.colors.primary} />
                  <Text style={[styles.loadingText, { color: themeHook.colors.text }]}>Loading...</Text>
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
                      <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: themeHook.colors.text }]}>Edit Review</Text>
                    <View style={styles.backButton} />
                  </View>
                  <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: themeHook.colors.text }]}>How was your experience?</Text>
                    {providerName && <Text style={[styles.providerName, { color: themeHook.colors.textSecondary }]}>with {providerName}</Text>}
                    <View style={styles.starsContainer}>{renderStars()}</View>
                    {rating > 0 && (
                      <Text style={[styles.ratingText, { color: themeHook.colors.primary }]}>
                        {rating === 1 && 'Poor'}
                        {rating === 2 && 'Fair'}
                        {rating === 3 && 'Good'}
                        {rating === 4 && 'Very Good'}
                        {rating === 5 && 'Excellent'}
                      </Text>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: themeHook.colors.text }]}>Tell us more (optional)</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: themeHook.colors.surfaceElevated, borderColor: themeHook.colors.border, color: themeHook.colors.text }]}
                      placeholder="Share your experience with this provider..."
                      placeholderTextColor={themeHook.colors.textTertiary}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    <Text style={[styles.charCount, { color: themeHook.colors.textTertiary }]}>{comment.length}/500</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!rating || submitting || !hasChanges) 
                        ? { backgroundColor: themeHook.isDark ? themeHook.colors.textTertiary : '#cbd5e1' }
                        : { backgroundColor: themeHook.colors.primary },
                    ]}
                    onPress={handleSubmit}
                    disabled={!rating || submitting || !hasChanges}
                  >
                    {submitting ? (
                      <ActivityIndicator color={themeHook.colors.white} />
                    ) : (
                      <Text style={styles.submitButtonText}>Update Review</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        onClose={alertModal.type === 'success' ? handleSuccessAlertClose : handleAlertClose}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText="OK"
        onButtonPress={alertModal.type === 'success' ? handleSuccessAlertClose : undefined}
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
});
