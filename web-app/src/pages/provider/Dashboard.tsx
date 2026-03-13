import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, MessageCircle } from 'lucide-react';
import { bookingService } from '../../services/booking';
import { useAuth } from '../../hooks/useAuth';
import type { BookingCardData } from '../../components/cards/BookingCard';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await bookingService.getBookings(undefined, 'provider', user?.id);
      setBookings(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'PENDING'
  );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Provider Dashboard</h1>

      {error && (
        <p className={styles.error} role="alert">
          {error}{' '}
          <button type="button" onClick={fetchBookings} className={styles.retryLink}>
            Try again
          </button>
        </p>
      )}

      {loading && !error && <p className={styles.loading}>Loading…</p>}

      {!loading && (
      <>
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <Calendar size={24} />
          <div>
            <p className={styles.statValue}>{upcomingBookings.length}</p>
            <p className={styles.statLabel}>Upcoming bookings</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <DollarSign size={24} />
          <div>
            <p className={styles.statValue}>$0</p>
            <p className={styles.statLabel}>This month</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <MessageCircle size={24} />
          <div>
            <p className={styles.statValue}>0</p>
            <p className={styles.statLabel}>Unread messages</p>
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upcoming appointments</h2>
        {upcomingBookings.length > 0 ? (
          <ul className={styles.bookingList}>
            {upcomingBookings.map((b) => (
              <li
                key={b.id}
                className={styles.bookingItem}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/bookings')}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/bookings')}
              >
                <span className={styles.bookingService}>{b.serviceName}</span>
                <span className={styles.bookingClient}>with {b.providerName}</span>
                <span className={styles.bookingDate}>
                  {b.scheduledDate} at {b.scheduledTime}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No upcoming appointments.</p>
        )}
      </section>
      </>
      )}
    </div>
  );
}
