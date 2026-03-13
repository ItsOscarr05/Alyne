import { Calendar, MapPin, DollarSign, MessageCircle, X, CheckCircle } from 'lucide-react';
import { formatTime12Hour } from '../../utils/timeUtils';
import styles from './BookingCard.module.css';

export interface BookingCardData {
  id: string;
  providerId: string;
  providerName: string;
  providerPhoto?: string;
  serviceName: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DECLINED';
  scheduledDate: string;
  scheduledTime: string;
  price: number;
  location?: string;
  notes?: string;
}

interface BookingCardProps {
  booking: BookingCardData;
  onPress: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onMessagePress?: () => void;
  showMessageButton?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#9333EA',
  PENDING: '#f59e0b',
  COMPLETED: '#16A34A',
  CANCELLED: '#ef4444',
  DECLINED: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  DECLINED: 'Declined',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAddress(location?: string): string {
  if (!location) return '';
  try {
    const parsed = typeof location === 'string' ? JSON.parse(location) : location;
    return parsed?.address || location;
  } catch {
    return location;
  }
}

export function BookingCard({
  booking,
  onPress,
  onDecline,
  onComplete,
  onMessagePress,
  showMessageButton = false,
}: BookingCardProps) {
  const statusColor = STATUS_COLORS[booking.status] || '#64748b';
  const borderColor = booking.status === 'CONFIRMED' ? 'var(--color-primary)' : statusColor;

  return (
    <article
      className={styles.card}
      style={{ borderColor }}
      onClick={onPress}
      onKeyDown={(e) => e.key === 'Enter' && onPress()}
      role="button"
      tabIndex={0}
    >
      <div className={styles.header}>
        <div className={styles.providerInfo}>
          <div className={styles.avatar}>
            {booking.providerPhoto ? (
              <img src={booking.providerPhoto} alt="" />
            ) : (
              <span>
                {booking.providerName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
            )}
          </div>
          <div>
            <h3 className={styles.providerName}>{booking.providerName}</h3>
            <p className={styles.serviceName}>{booking.serviceName}</p>
          </div>
        </div>
        <span
          className={styles.statusBadge}
          style={{ backgroundColor: `${statusColor}20`, borderColor: statusColor, color: statusColor }}
        >
          {STATUS_LABELS[booking.status]}
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <Calendar size={16} />
          <span>
            {formatDate(booking.scheduledDate)} at {formatTime12Hour(booking.scheduledTime)}
          </span>
        </div>

        {booking.location && (
          <div className={styles.detailRow}>
            <MapPin size={16} />
            <span>{formatAddress(booking.location)}</span>
          </div>
        )}

        <div className={styles.priceRow}>
          <div className={styles.detailRow}>
            <DollarSign size={16} />
            <span>${booking.price}/session</span>
          </div>
          <div className={styles.actions}>
            {onDecline && (
              <button
                type="button"
                className={styles.iconButton}
                style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDecline();
                }}
                aria-label="Decline"
              >
                <X size={20} />
              </button>
            )}
            {onComplete && (
              <button
                type="button"
                className={styles.iconButton}
                style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete();
                }}
                aria-label="Complete"
              >
                <CheckCircle size={20} />
              </button>
            )}
            {showMessageButton && onMessagePress && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onMessagePress();
                }}
                aria-label="Message"
              >
                <MessageCircle size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {booking.notes && (
        <div className={styles.notes}>
          <span className={styles.notesLabel}>Notes:</span>
          <p>{booking.notes}</p>
        </div>
      )}
    </article>
  );
}
