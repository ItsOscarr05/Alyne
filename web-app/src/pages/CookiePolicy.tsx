import { Link } from 'react-router-dom';
import styles from './PolicyPage.module.css';

export function CookiePolicy() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <img src="/logo.png" alt="Alyne" className={styles.logoImg} />
        </Link>
        <Link to="/" className={styles.backLink}>
          Back to home
        </Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>Cookie Policy</h1>
        <p className={styles.updated}>Last updated: {new Date().toLocaleDateString()}</p>
        <div className={styles.content}>
          <p style={{ fontStyle: 'italic' }}>
            This Cookie Policy explains how Alyne, Inc. (&quot;Alyne,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) uses cookies
            and similar technologies when you use our mobile application, website, and related
            services (collectively, the &quot;Service&quot;). This policy supplements our Privacy Policy.
          </p>
          <h2>What Are Cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. They help
            our site remember your preferences, keep you signed in, and improve your experience.
            Similar technologies include web beacons, pixel tags, and local storage.
          </p>
          <h2>How We Use Cookies and Tracking Technologies</h2>
          <p>
            We use cookies, web beacons, pixel tags, and similar tracking technologies to collect
            information about your interactions with the Service. These technologies help us analyze
            usage patterns, personalize content, and improve the Service. We use them for:
          </p>
          <ul>
            <li>Authentication and session management to keep you signed in</li>
            <li>Security purposes to help detect and prevent fraud</li>
            <li>Understanding how visitors use our platform and which features are most popular</li>
            <li>Improving our services and developing new features</li>
          </ul>
          <p>
            You can control cookies through your browser settings, though disabling cookies may
            limit your ability to use certain features of the Service.
          </p>
          <h2>Managing Cookies</h2>
          <p>
            Most web browsers allow you to manage your cookie preferences through their settings.
            You can typically block or delete cookies, though doing so may affect the functionality
            of the Service. For more information about how we collect, use, and protect your
            information, please see our Privacy Policy.
          </p>
          <h2>Contact</h2>
          <p>
            For cookie-related questions, please contact us at privacy@alyne.com.
          </p>
        </div>
      </main>
    </div>
  );
}
