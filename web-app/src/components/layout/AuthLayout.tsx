import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import styles from './AuthLayout.module.css';

export function AuthLayout() {
  return (
    <div className={styles.authLayout}>
      <Link to="/" className={styles.logo}>
        <img src="/logo.png" alt="Alyne" className={styles.logoImg} />
      </Link>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
