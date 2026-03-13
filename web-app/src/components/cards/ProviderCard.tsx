import { Star, MapPin, User } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './ProviderCard.module.css';

export interface ProviderCardData {
  id: string;
  name: string;
  specialties: string[];
  distance: number;
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
  showBookButton?: boolean;
}

function formatDistance(miles: number): string {
  if (miles < 1) return `${Math.round(miles * 10) / 10} mi`;
  return `${Math.round(miles)} mi`;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - Math.ceil(rating);

  return (
    <span className={styles.stars} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: fullStars }, (_, i) => (
        <Star key={i} size={14} fill="var(--color-rating)" color="var(--color-rating)" />
      ))}
      {hasHalfStar && (
        <span key="half" className={styles.halfStar}>
          <Star size={14} fill="var(--color-rating)" color="var(--color-rating)" />
        </span>
      )}
      {Array.from({ length: emptyStars }, (_, i) => (
        <Star key={`e-${i}`} size={14} color="var(--color-text-tertiary)" />
      ))}
    </span>
  );
}

export function ProviderCard({ provider, onPress, showBookButton = true }: ProviderCardProps) {
  return (
    <article
      className={styles.card}
      onClick={onPress}
      onKeyDown={(e) => e.key === 'Enter' && onPress()}
      role="button"
      tabIndex={0}
    >
      <div className={styles.header}>
        <div className={styles.avatarContainer}>
          {provider.profilePhoto ? (
            <img src={provider.profilePhoto} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <User size={32} />
            </div>
          )}
          {provider.isAvailableNow && <span className={styles.availableBadge} />}
        </div>
        <div className={styles.nameSection}>
          <h3 className={styles.name}>{provider.name}</h3>
          <div className={styles.distance}>
            <MapPin size={14} />
            <span>{formatDistance(provider.distance)}</span>
          </div>
        </div>
      </div>

      <div className={styles.specialties}>
        {provider.specialties.slice(0, 3).map((s, i) => (
          <span key={i} className={styles.specialtyTag}>
            {s}
          </span>
        ))}
        {provider.specialties.length > 3 && (
          <span className={styles.more}>+{provider.specialties.length - 3} more</span>
        )}
      </div>

      {provider.bio && (
        <p className={styles.bio}>{provider.bio}</p>
      )}

      <div className={styles.footer}>
        {provider.startingPrice > 0 && (
          <span className={styles.price}>Starting at ${provider.startingPrice.toFixed(0)}</span>
        )}
        <div className={styles.rating}>
          {provider.reviewCount > 0 ? (
            <>
              <StarRating rating={provider.rating} />
              <span className={styles.ratingValue}>{provider.rating.toFixed(1)}</span>
              <span className={styles.reviewCount}>({provider.reviewCount} reviews)</span>
            </>
          ) : (
            <span className={styles.noReviews}>No reviews yet</span>
          )}
        </div>
      </div>

      {showBookButton && (
        <div className={styles.bookButton} onClick={(e) => e.stopPropagation()}>
          <Button title="Book" variant="primary" onPress={onPress} />
        </div>
      )}
    </article>
  );
}
