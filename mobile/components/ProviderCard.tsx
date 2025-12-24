import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export interface ProviderCardData {
  id: string;
  name: string;
  specialties: string[];
  distance: number; // in miles
  startingPrice: number;
  rating: number;
  reviewCount: number;
  profilePhoto?: string;
  isAvailableNow?: boolean;
  bio?: string;
}

interface ProviderCardProps {
  provider: ProviderCardData;
  onPress: () => void;
}

export function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const formatDistance = (miles: number) => {
    if (miles < 1) {
      return `${Math.round(miles * 10) / 10} mi`;
    }
    return `${Math.round(miles)} mi`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#fbbf24" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#fbbf24" />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#d1d5db" />
      );
    }

    return stars;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.content}>
        {/* Header Row: Avatar, Name, Distance */}
        <View style={styles.headerRow}>
          <View style={styles.avatarContainer}>
            {provider.profilePhoto ? (
              <Image 
                source={{ uri: provider.profilePhoto }} 
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={32} color={theme.colors.neutral[500]} />
              </View>
            )}
            {provider.isAvailableNow && (
              <View style={styles.availableIndicator} />
            )}
          </View>
          
          <View style={styles.nameSection}>
            <Text style={styles.name} numberOfLines={1}>
              {provider.name}
            </Text>
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.distance}>{formatDistance(provider.distance)}</Text>
            </View>
          </View>
        </View>

        {/* Specialties Row */}
        <View style={styles.specialtiesRow}>
          {provider.specialties.slice(0, 3).map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <Text style={styles.specialtyText}>{specialty}</Text>
            </View>
          ))}
          {provider.specialties.length > 3 && (
            <Text style={styles.moreSpecialties}>+{provider.specialties.length - 3} more</Text>
          )}
        </View>

        {/* Bio Section */}
        {provider.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText} numberOfLines={4} ellipsizeMode="tail">
              {provider.bio}
            </Text>
          </View>
        )}

        {/* Spacer to fill remaining space */}
        <View style={styles.spacer} />

        {/* Footer Row: Price and Rating */}
        <View style={styles.footerRow}>
          {provider.startingPrice > 0 && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>Starting at ${provider.startingPrice.toFixed(0)}</Text>
            </View>
          )}
          <View style={styles.footerRight}>
            {provider.reviewCount > 0 ? (
              <View style={styles.ratingRow}>
                <View style={styles.stars}>{renderStars(provider.rating)}</View>
                <Text style={styles.ratingValue}>{provider.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({provider.reviewCount} reviews)</Text>
              </View>
            ) : (
              <Text style={styles.noReviews}>No reviews yet</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    ...theme.shadows.card,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    height: 280,
  },
  content: {
    padding: theme.spacing.lg,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.neutral[50],
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  availableIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.semantic.success,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  nameSection: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...theme.typography.h2,
    fontSize: 18,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  distance: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  bioSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  bioText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.neutral[600],
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  specialtyTag: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
  },
  specialtyText: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  moreSpecialties: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    marginTop: theme.spacing.xs,
  },
  priceContainer: {
    flex: 1,
  },
  footerRight: {
    marginLeft: theme.spacing.md,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  reviewCount: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
  },
  noReviews: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
    fontStyle: 'italic',
  },
  priceText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
});


