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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { reviewService } from '../../services/review';
import { logger } from '../../utils/logger';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';

export default function SubmitReviewScreen() {
  const router = useRouter();
  const { bookingId, providerId, providerName } = useLocalSearchParams<{
    bookingId: string;
    providerId: string;
    providerName?: string;
  }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // Check if review already exists
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!bookingId) {
        setChecking(false);
        return;
      }

      try {
        const result = await reviewService.getReviewByBooking(bookingId);
        if (result.data) {
          setHasExistingReview(true);
          if (Platform.OS === 'web') {
            alert('You have already submitted a review for this booking.');
          } else {
            Alert.alert('Already Reviewed', 'You have already submitted a review for this booking.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          }
          // Navigate back after a short delay
          setTimeout(() => {
            router.back();
          }, 1000);
        }
      } catch (error: any) {
        // Review doesn't exist, which is fine
        console.log('No existing review found (this is expected)');
      } finally {
        setChecking(false);
      }
    };

    checkExistingReview();
  }, [bookingId, router]);

  const handleSubmit = async () => {
    if (!rating) {
      if (Platform.OS === 'web') {
        alert('Please select a rating');
      } else {
        Alert.alert('Required', 'Please select a rating');
      }
      return;
    }

    if (!bookingId || !providerId) {
      if (Platform.OS === 'web') {
        alert('Error: Missing booking or provider information');
      } else {
        Alert.alert('Error', 'Missing booking or provider information');
      }
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting review with data:', { bookingId, providerId, rating, comment: comment.trim() || undefined });
      const result = await reviewService.submitReview({
        bookingId,
        providerId,
        rating,
        comment: comment.trim() || undefined,
      });
      console.log('Review submitted successfully:', result);

      if (Platform.OS === 'web') {
        alert('Thank you for your review!');
        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 500);
      } else {
        Alert.alert('Success', 'Thank you for your review!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      logger.error('Error submitting review', error);
      const errorMessage = getUserFriendlyError(error);
      const errorTitle = getErrorTitle(error);
      
      // Handle "review already exists" error gracefully
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('already submitted')) {
        if (Platform.OS === 'web') {
          alert('You have already submitted a review for this booking.');
        } else {
          Alert.alert('Already Reviewed', 'You have already submitted a review for this booking.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
        setTimeout(() => {
          router.back();
        }, 1000);
      } else {
        if (Platform.OS === 'web') {
          alert(`${errorTitle}: ${errorMessage}`);
        } else {
          Alert.alert(errorTitle, errorMessage);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
        >
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

  if (checking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Checking...</Text>
        </View>
      </View>
    );
  }

  if (hasExistingReview) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write a Review</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.alreadyReviewedText}>You have already reviewed this booking</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.label}>How was your experience?</Text>
          {providerName && (
            <Text style={styles.providerName}>with {providerName}</Text>
          )}
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
          style={[styles.submitButton, (!rating || submitting) && styles.submitButtonDisabled]}
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
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
  backButton: {
    marginTop: 24,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

