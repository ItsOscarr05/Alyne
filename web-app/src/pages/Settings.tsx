import { Link } from 'react-router-dom';
import { Moon, Sun, User } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import styles from './Settings.module.css';

export function Settings() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.themeRow}>
          <span className={styles.label}>Theme</span>
          <div className={styles.themeOptions}>
            <button
              type="button"
              className={`${styles.themeBtn} ${themeMode === 'light' ? styles.active : ''}`}
              onClick={() => setThemeMode('light')}
            >
              <Sun size={18} />
              Light
            </button>
            <button
              type="button"
              className={`${styles.themeBtn} ${themeMode === 'dark' ? styles.active : ''}`}
              onClick={() => setThemeMode('dark')}
            >
              <Moon size={18} />
              Dark
            </button>
            <button
              type="button"
              className={`${styles.themeBtn} ${themeMode === 'system' ? styles.active : ''}`}
              onClick={() => setThemeMode('system')}
            >
              System
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <Link to="/settings/edit-profile" className={styles.settingRow}>
          <User size={20} />
          <span>Edit profile</span>
        </Link>
      </section>
    </div>
  );
}
