import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { MainContent } from './MainContent';
import styles from './AppShell.module.css';

export function AppShell() {
  return (
    <div className={styles.appShell}>
      <a href="#main-content" className="skipLink">
        Skip to main content
      </a>
      <Header />
      <MainContent />
    </div>
  );
}
