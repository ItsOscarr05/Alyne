import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  MessageCircle,
  Sparkles,
  ArrowRight,
  User,
  Briefcase,
  ChevronDown,
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
    description:
      'Browse verified wellness providers in your area. Filter by specialty, availability, and reviews.',
  },
  {
    icon: Calendar,
    title: 'Book',
    description:
      'Schedule sessions that fit your life. Instant confirmation and easy rescheduling.',
  },
  {
    icon: MessageCircle,
    title: 'Connect',
    description:
      'Message providers directly before and after sessions. Secure, in-app communication.',
  },
];

const steps = [
  { num: 1, label: 'Create an account' },
  { num: 2, label: 'Find your provider' },
  { num: 3, label: 'Book and enjoy' },
];

const stats = [
  { value: '500+', label: 'providers' },
  { value: '10K+', label: 'sessions booked' },
  { value: 'Verified', label: 'professionals' },
];

const audienceProps = [
  {
    icon: User,
    title: 'For clients',
    description: 'Discover and book wellness pros near you. Filter by specialty, read reviews, message directly.',
    cta: 'Find providers',
    href: '/auth/register',
  },
  {
    icon: Briefcase,
    title: 'For providers',
    description: 'Grow your practice. Get discovered, manage bookings, get paid securely.',
    cta: 'List your services',
    href: '/auth/register',
  },
];

const testimonials = [
  {
    quote: 'Alyne made it easy to find the right massage therapist. I booked my first session in under two minutes.',
    name: 'Jordan K.',
    role: 'Client',
  },
  {
    quote: 'Alyne helped me grow my yoga practice. The booking system saves me hours every week.',
    name: 'Sarah M.',
    role: 'Yoga Instructor',
  },
  {
    quote: 'Finally, a platform that understands wellness professionals. Getting paid is seamless.',
    name: 'Alex T.',
    role: 'Massage Therapist',
  },
];

const faqItems = [
  {
    question: 'How do I find a provider?',
    answer: 'Search by specialty, location, and availability. Filter by price, rating, and reviews to find the best match for your needs.',
  },
  {
    question: 'Is my payment secure?',
    answer: 'Yes. We use Stripe for all payments. Your card details are never stored on our servers, and all transactions are encrypted.',
  },
  {
    question: 'How do providers get paid?',
    answer: 'Providers receive payments through Stripe Connect. Funds are transferred to their linked bank account after each completed session.',
  },
  {
    question: 'Can I cancel or reschedule a booking?',
    answer: 'Yes. You can reschedule or cancel bookings from your dashboard. Check the provider\'s cancellation policy for any applicable fees.',
  },
];

const mockProviders = [
  { name: 'Sarah J.', specialty: 'Yoga', price: 75 },
  { name: 'Michael C.', specialty: 'Massage', price: 90 },
  { name: 'Emma R.', specialty: 'Coaching', price: 120 },
  { name: 'David L.', specialty: 'Meditation', price: 60 },
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
      <a href="#main" className="skipLink">
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <img src="/logo.png" alt="" className={styles.logoImg} />
            <span className={styles.logoText}>Alyne</span>
          </Link>
          <nav className={styles.nav}>
            <div className={styles.navSectionLinks}>
              <a href="#audience" className={styles.navSectionLink}>For Everyone</a>
              <a href="#product" className={styles.navSectionLink}>See Alyne</a>
              <a href="#features" className={styles.navSectionLink}>How it works</a>
              <a href="#testimonials" className={styles.navSectionLink}>Testimonials</a>
              <a href="#faq" className={styles.navSectionLink}>FAQ</a>
            </div>
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
        </div>
      </header>

      <main id="main">
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              <Sparkles size={16} aria-hidden />
              The wellness marketplace
            </p>
            <h1 className={styles.heroTitle}>Find your wellness match. Book in minutes.</h1>
            <p className={styles.heroSubtitle}>
              Massage, yoga, coaching, and more. Connect with verified professionals near you and
              schedule sessions that fit your life.
            </p>
            <div className={styles.heroActions}>
              {isAuthenticated ? (
                <Link to="/discover">
                  <Button variant="primary" title="Discover Providers" className={styles.heroCtaPrimary} />
                </Link>
              ) : (
                <>
                  <Link to="/auth/register">
                    <Button variant="primary" title="Get Started Free" className={styles.heroCtaPrimary} />
                  </Link>
                  <Link to="/auth/login">
                    <Button variant="secondary" title="Sign In" className={styles.heroCtaSecondary} />
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroMockup}>
              <div className={styles.mockupBar}>
                <span className={styles.mockupDot} />
                <span className={styles.mockupDot} />
                <span className={styles.mockupDot} />
              </div>
              <div className={styles.mockupGrid}>
                {mockProviders.map((p, i) => (
                  <div key={i} className={styles.mockupCard}>
                    <div className={styles.mockupAvatar} />
                    <div className={styles.mockupInfo}>
                      <span className={styles.mockupName}>{p.name}</span>
                      <span className={styles.mockupSpecialty}>{p.specialty}</span>
                      <span className={styles.mockupPrice}>From ${p.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.stats}>
          <div className={styles.statsInner}>
            {stats.map(({ value, label }, i) => (
              <div key={i} className={styles.statItem}>
                <span className={styles.statValue}>{value}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="audience" className={styles.audience}>
          <h2 className={styles.sectionTitle}>Built for everyone</h2>
          <div className={styles.audienceGrid}>
            {audienceProps.map(({ icon: Icon, title, description, cta, href }, i) => (
              <article key={i} className={styles.audienceCard}>
                <div className={styles.audienceIcon}>
                  <Icon size={32} aria-hidden />
                </div>
                <h3 className={styles.audienceTitle}>{title}</h3>
                <p className={styles.audienceDesc}>{description}</p>
                <Link to={href} className={styles.audienceCta}>
                  {cta}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="product" className={styles.productPreview}>
          <h2 className={styles.sectionTitle}>See Alyne in action</h2>
          <p className={styles.sectionSubtitle}>
            Browse providers, filter by your needs, and book in a few taps.
          </p>
          <div className={styles.previewFrame}>
            <div className={styles.previewBar}>
              <span className={styles.previewUrl}>alyne.com/discover</span>
            </div>
            <div className={styles.previewMockGrid}>
              {mockProviders.map((p, i) => (
                <div key={i} className={styles.previewCard}>
                  <div className={styles.previewAvatar} />
                  <div className={styles.previewMeta}>
                    <span className={styles.previewName}>{p.name}</span>
                    <span className={styles.previewDetail}>{p.specialty} • From ${p.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.steps}>
          <div className={styles.stepsInner}>
            {steps.map(({ num, label }) => (
              <div key={num} className={styles.step}>
                <span className={styles.stepNum}>{num}</span>
                <span className={styles.stepLabel}>{label}</span>
                {num < steps.length && (
                  <ArrowRight size={20} className={styles.stepArrow} aria-hidden />
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className={styles.features}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <p className={styles.sectionSubtitle}>
            From discovery to booking, Alyne makes wellness simple.
          </p>
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

        <section id="testimonials" className={styles.testimonials}>
          <h2 className={styles.sectionTitle}>What people are saying</h2>
          <div className={styles.testimonialGrid}>
            {testimonials.map(({ quote, name, role }, i) => (
              <blockquote key={i} className={styles.testimonialCard}>
                <p className={styles.testimonialQuote}>"{quote}"</p>
                <footer className={styles.testimonialFooter}>
                  <span className={styles.testimonialAvatar}>{name.charAt(0)}</span>
                  <div>
                    <cite className={styles.testimonialName}>{name}</cite>
                    <span className={styles.testimonialRole}>{role}</span>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section id="faq" className={styles.faq}>
          <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
          <div className={styles.faqList}>
            {faqItems.map(({ question, answer }, i) => (
              <details key={i} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {question}
                  <ChevronDown size={20} className={styles.faqChevron} aria-hidden />
                </summary>
                <p className={styles.faqAnswer}>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to find your wellness match?</h2>
            <p className={styles.ctaSubtitle}>Join thousands of clients and providers on Alyne.</p>
            {!isAuthenticated && (
              <Link to="/auth/register">
                <Button variant="primary" title="Create free account" />
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <h4 className={styles.footerHeading}>Legal</h4>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerHeading}>Company</h4>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <Link to="/" className={styles.footerLogo}>
            <img src="/logo.png" alt="Alyne" className={styles.footerLogoImg} />
          </Link>
          <p className={styles.footerCopy}>&copy; {new Date().getFullYear()} Alyne. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
