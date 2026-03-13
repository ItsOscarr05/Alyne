import { Link } from 'react-router-dom';
import { Search, Calendar, MessageCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import styles from './Welcome.module.css';

const features = [
  {
    icon: Search,
    title: 'Discover Providers',
    description: 'Find trusted wellness professionals near you',
  },
  {
    icon: Calendar,
    title: 'Book Sessions',
    description: 'Schedule appointments that work for you',
  },
  {
    icon: MessageCircle,
    title: 'Stay Connected',
    description: 'Message providers directly and securely',
  },
];

export function Welcome() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome to Alyne</h1>
        <p className={styles.subtitle}>
          Connect with wellness professionals in your area
        </p>
      </div>

      <div className={styles.features}>
        {features.map(({ icon: Icon, title, description }, i) => (
          <div key={i} className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Icon size={28} />
            </div>
            <h3 className={styles.featureTitle}>{title}</h3>
            <p className={styles.featureDesc}>{description}</p>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <Link to="/auth/register">
          <Button
            variant="primary"
            title="Get Started"
            className={styles.primaryBtn}
          />
        </Link>
        <Link to="/auth/login">
          <Button
            variant="secondary"
            title="Sign In"
            className={styles.secondaryBtn}
          />
        </Link>
      </div>
    </div>
  );
}
