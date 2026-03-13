import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  MessageCircle,
  Heart,
  Shield,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import styles from './Landing.module.css';

const GUEST_PROVIDER_EMAIL = 'yoga@alyne.com';
const GUEST_PROVIDER_PASSWORD = 'provider123';

const features = [
  {
    icon: Search,
    title: 'Discover',
    description: 'Browse verified wellness providers in your area. Filter by specialty, availability, and reviews.',
  },
  {
    icon: Calendar,
    title: 'Book',
    description: 'Schedule sessions that fit your life. Instant confirmation and easy rescheduling.',
  },
  {
    icon: MessageCircle,
    title: 'Connect',
    description: 'Message providers directly before and after sessions. Secure, in-app communication.',
  },
];

const steps = [
  { num: 1, label: 'Create an account' },
  { num: 2, label: 'Find your provider' },
  { num: 3, label: 'Book and enjoy' },
];

export function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const { user } = await login(GUEST_PROVIDER_EMAIL, GUEST_PROVIDER_PASSWORD);
      if (user.userType === 'PROVIDER') {
        navigate(user.providerOnboardingComplete ? '/provider/dashboard' : '/provider/onboarding');
      } else {
        navigate('/discover');
      }
    } catch {
      try {
        const { user } = await login('test@alyne.com', 'test123');
        navigate(user.userType === 'PROVIDER' ? '/provider/dashboard' : '/discover');
      } catch {
        // ignore - seed may not be run
      }
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Alyne
        </Link>
        <nav className={styles.nav}>
          {isAuthenticated ? (
            <Link to="/discover">
              <Button variant="primary" title="Go to App" />
            </Link>
          ) : (
            <>
              {import.meta.env.DEV && (
                <button
                  type="button"
                  className={styles.guestBtn}
                  onClick={handleGuestLogin}
                  disabled={guestLoading}
                >
                  {guestLoading ? 'Logging in…' : 'Guest Login (Dev)'}
                </button>
              )}
              <Link to="/auth/login" className={styles.loginLink}>
                Sign in
              </Link>
              <Link to="/auth/register">
                <Button variant="primary" title="Get Started" />
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              <Sparkles size={16} aria-hidden />
              The wellness marketplace
            </p>
            <h1 className={styles.heroTitle}>
              Find trusted wellness professionals near you
            </h1>
            <p className={styles.heroSubtitle}>
              Massage, coaching, yoga, and more. Book sessions in minutes, connect with providers who care.
            </p>
            <div className={styles.heroActions}>
              {isAuthenticated ? (
                <Link to="/discover">
                  <Button variant="primary" title="Discover Providers" />
                </Link>
              ) : (
                <>
                  <Link to="/auth/register">
                    <Button variant="primary" title="Get Started Free" />
                  </Link>
                  <Link to="/auth/login">
                    <Button variant="secondary" title="Sign In" />
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <Heart size={20} className={styles.heroCardIcon} aria-hidden />
                <span>Wellness session</span>
              </div>
              <p className={styles.heroCardText}>
                Book massage, yoga, coaching & more from trusted local professionals
              </p>
            </div>
          </div>
        </section>

        <section className={styles.trust}>
          <div className={styles.trustItem}>
            <Shield size={20} aria-hidden />
            <span>Verified providers</span>
          </div>
          <div className={styles.trustItem}>
            <Calendar size={20} aria-hidden />
            <span>Easy booking</span>
          </div>
          <div className={styles.trustItem}>
            <MessageCircle size={20} aria-hidden />
            <span>Direct messaging</span>
          </div>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.featureGrid}>
            {features.map(({ icon: Icon, title, description }, i) => (
              <article key={i} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <Icon size={28} aria-hidden />
                </div>
                <h3 className={styles.featureTitle}>{title}</h3>
                <p className={styles.featureDesc}>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.steps}>
          <div className={styles.stepsInner}>
            {steps.map(({ num, label }) => (
              <div key={num} className={styles.step}>
                <span className={styles.stepNum}>{num}</span>
                <span className={styles.stepLabel}>{label}</span>
                {num < steps.length && (
                  <ArrowRight
                    size={20}
                    className={styles.stepArrow}
                    aria-hidden
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to find your wellness match?</h2>
            <p className={styles.ctaSubtitle}>
              Join thousands of clients and providers on Alyne.
            </p>
            {!isAuthenticated && (
              <div className={styles.ctaActions}>
                <Link to="/auth/register">
                  <Button variant="primary" title="Create free account" />
                </Link>
                <Link to="/auth/welcome">
                  <Button variant="secondary" title="Learn more" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link to="/" className={styles.footerLogo}>
            Alyne
          </Link>
          <nav className={styles.footerNav}>
            <Link to="/auth/login">Sign in</Link>
            <Link to="/auth/register">Sign up</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
