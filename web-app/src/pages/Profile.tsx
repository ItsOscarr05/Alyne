import { Link } from 'react-router-dom';
import { User, Calendar, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import styles from './Profile.module.css';

export function Profile() {
  const { user } = useAuth();
  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : 'User';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt="" className={styles.avatarImg} />
          ) : (
            <User size={48} />
          )}
        </div>
        <div className={styles.info}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.email}>{user?.email ?? '—'}</p>
        </div>
      </div>

      <nav className={styles.nav}>
        <Link to="/bookings" className={styles.navItem}>
          <Calendar size={20} />
          <span>Bookings</span>
        </Link>
        <Link to="/messages" className={styles.navItem}>
          <MessageCircle size={20} />
          <span>Messages</span>
        </Link>
        <Link to="/settings" className={styles.navItem}>
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
}
