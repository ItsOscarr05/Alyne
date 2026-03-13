import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingCard } from '../components/cards/BookingCard';
import { bookingService } from '../services/booking';
import { useAuth } from '../hooks/useAuth';
import type { BookingCardData } from '../components/cards/BookingCard';
import styles from './Bookings.module.css';

type Tab = 'upcoming' | 'past' | 'declined';

const statusToTab: Record<string, Tab> = {
  PENDING: 'upcoming',
  CONFIRMED: 'upcoming',
  COMPLETED: 'past',
  CANCELLED: 'past',
  DECLINED: 'declined',
};

export function Bookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const role = user?.userType === 'PROVIDER' ? 'provider' : 'client';
  const userId = user?.id;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await bookingService.getBookings(undefined, role, userId);
      setBookings(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [role, userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = bookings.filter((b) => statusToTab[b.status] === tab);

  const handleCancel = async (id: string) => {
    try {
      await bookingService.cancelBooking(id);
      setSelectedBookingId(null);
      fetchBookings();
    } catch {
      // error toast could be added
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await bookingService.declineBooking(id);
      setSelectedBookingId(null);
      fetchBookings();
    } catch {
      // error toast could be added
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await bookingService.completeBooking(id);
      setSelectedBookingId(null);
      fetchBookings();
    } catch {
      // error toast could be added
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Bookings</h1>

      <div className={styles.tabs}>
        {(['upcoming', 'past', 'declined'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}{' '}
          <button type="button" onClick={fetchBookings} className={styles.retryLink}>
            Try again
          </button>
        </p>
      )}

      {loading && !error && (
        <p className={styles.empty}>Loading bookings…</p>
      )}

      {!loading && !error && (
        <div className={styles.list}>
          {filtered.length > 0 ? (
            filtered.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={() => setSelectedBookingId(booking.id)}
                onDecline={
                  role === 'provider' && booking.status === 'PENDING'
                    ? () => handleDecline(booking.id)
                    : undefined
                }
                onComplete={
                  role === 'provider' && booking.status === 'CONFIRMED'
                    ? () => handleComplete(booking.id)
                    : undefined
                }
                onMessagePress={() => navigate('/messages')}
                showMessageButton={booking.status === 'CONFIRMED' || booking.status === 'PENDING'}
              />
            ))
          ) : (
            <p className={styles.empty}>
              No {tab} bookings.
            </p>
          )}
        </div>
      )}

      {selectedBookingId && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-detail-title"
          onClick={() => setSelectedBookingId(null)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="booking-detail-title">Booking details</h2>
            <p>
              {filtered.find((b) => b.id === selectedBookingId)?.providerName} –{' '}
              {filtered.find((b) => b.id === selectedBookingId)?.serviceName}
            </p>
            <div className={styles.modalActions}>
              {role === 'client' &&
                (filtered.find((b) => b.id === selectedBookingId)?.status === 'PENDING' ||
                  filtered.find((b) => b.id === selectedBookingId)?.status === 'CONFIRMED') && (
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => handleCancel(selectedBookingId)}
                  >
                    Cancel booking
                  </button>
                )}
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSelectedBookingId(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
