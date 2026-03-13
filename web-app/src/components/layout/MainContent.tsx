import { Outlet } from 'react-router-dom';
import styles from './MainContent.module.css';

const MAX_WIDTH = 1320;

export function MainContent() {
  return (
    <main className={styles.main}>
      <div id="main-content" className={styles.inner} style={{ maxWidth: MAX_WIDTH }}>
        <Outlet />
      </div>
    </main>
  );
}
