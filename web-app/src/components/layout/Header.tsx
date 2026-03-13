import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Calendar, MessageCircle, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import styles from './Header.module.css';

const MAX_WIDTH = 1320;

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const isProvider = user?.userType === 'PROVIDER';
  const showSearch = location.pathname === '/discover';

  const navLinks = [
    ...(isProvider ? [] : [{ path: '/discover', label: 'Discover', icon: Search }]),
    ...(isProvider ? [{ path: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/messages', label: 'Messages', icon: MessageCircle },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const handleSearch = (query: string) => {
    navigate(`/discover?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner} style={{ maxWidth: MAX_WIDTH }}>
        <Link to={isProvider ? '/provider/dashboard' : '/discover'} className={styles.logo}>
          Alyne
        </Link>

        {showSearch && (
          <div className={styles.search}>
            <SearchBar
              key={searchQuery}
              onSearch={handleSearch}
              placeholder="Search providers..."
              defaultValue={searchQuery}
            />
          </div>
        )}

        <nav className={styles.nav}>
          {!isLoading &&
            navLinks.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
              return (
                <Link
                  key={path}
                  to={path}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
        </nav>

        <div className={styles.profile}>
          {isAuthenticated ? (
            <div className={styles.profileDropdown} ref={dropdownRef}>
              <button
                className={styles.profileButton}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <User size={20} />
                <span>Account</span>
              </button>
              {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                <Link to="/profile" onClick={() => setDropdownOpen(false)}>Profile</Link>
                <Link to="/settings" onClick={() => setDropdownOpen(false)}>Settings</Link>
                <button onClick={async () => { setDropdownOpen(false); await logout(); navigate('/auth/login'); }}>Log out</button>
              </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/auth/login" className={styles.authLink}>
                Log in
              </Link>
              <Link to="/auth/register">
                <Button variant="primary" title="Sign up" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
