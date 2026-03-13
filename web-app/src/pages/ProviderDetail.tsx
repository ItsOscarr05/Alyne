import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, User, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { providerService, type ProviderDetail } from '../services/provider';
import styles from './ProviderDetail.module.css';

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - Math.ceil(rating);
  return (
    <span className={styles.stars} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: fullStars }, (_, i) => (
        <Star key={i} size={18} fill="var(--color-rating)" color="var(--color-rating)" />
      ))}
      {hasHalfStar && (
        <span key="half" className={styles.halfStar}>
          <Star size={18} fill="var(--color-rating)" color="var(--color-rating)" />
        </span>
      )}
      {Array.from({ length: emptyStars }, (_, i) => (
        <Star key={`e-${i}`} size={18} color="var(--color-text-tertiary)" />
      ))}
    </span>
  );
}

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    providerService
      .getProvider(id)
      .then(setProvider)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load provider');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleBook = () => {
    if (provider) navigate(`/bookings?providerId=${provider.id}`);
  };

  if (!id) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>Invalid provider</p>
        <Link to="/discover">Back to Discover</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className={styles.page}>
        <p className={styles.error} role="alert">{error ?? 'Provider not found'}</p>
        <Link to="/discover" className={styles.backLink}>Back to Discover</Link>
      </div>
    );
  }

  const startingPrice = provider.services.length > 0
    ? Math.min(...provider.services.map((s) => Number(s.price) || 0))
    : 0;

  return (
    <div className={styles.page}>
      <Link to="/discover" className={styles.backLink}>
        <ArrowLeft size={20} />
        Back to Discover
      </Link>

      <div className={styles.header}>
        <div className={styles.avatarSection}>
          {provider.profilePhoto ? (
            <img src={provider.profilePhoto} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <User size={64} />
            </div>
          )}
          {provider.isVerified && <span className={styles.verified}>Verified</span>}
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>{provider.name}</h1>
          {provider.reviewCount > 0 && (
            <div className={styles.ratingRow}>
              <StarRating rating={provider.rating} />
              <span className={styles.ratingText}>
                {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
              </span>
            </div>
          )}
          {startingPrice > 0 && (
            <p className={styles.price}>Starting at ${startingPrice.toFixed(0)}</p>
          )}
        </div>
      </div>

      {provider.specialties.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Specialties</h2>
          <div className={styles.tags}>
            {provider.specialties.map((s, i) => (
              <span key={i} className={styles.tag}>{s}</span>
            ))}
          </div>
        </section>
      )}

      {provider.bio && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>
          <p className={styles.bio}>{provider.bio}</p>
        </section>
      )}

      {provider.services.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Services</h2>
          <ul className={styles.serviceList}>
            {provider.services.map((s) => (
              <li key={s.id} className={styles.serviceItem}>
                <div className={styles.serviceName}>{s.name}</div>
                {s.description && <p className={styles.serviceDesc}>{s.description}</p>}
                <div className={styles.serviceMeta}>
                  ${Number(s.price).toFixed(0)} · {s.duration} min
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {provider.reviews.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Reviews</h2>
          <ul className={styles.reviewList}>
            {provider.reviews.map((r) => (
              <li key={r.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <StarRating rating={r.rating} />
                  <span className={styles.reviewer}>
                    {r.client.firstName} {r.client.lastName}
                  </span>
                </div>
                {r.comment && <p className={styles.reviewComment}>{r.comment}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.footer}>
        <Button variant="primary" title="Book" onPress={handleBook} />
      </div>
    </div>
  );
}
