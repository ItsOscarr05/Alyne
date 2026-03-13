import { ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

export function Button({
  title,
  children,
  onPress,
  onClick,
  loading = false,
  disabled = false,
  variant = 'primary',
  type = 'button',
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const handleClick = onClick ?? onPress;

  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]} ${isDisabled ? styles.disabled : ''} ${fullWidth ? styles.fullWidth : ''} ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        title ?? children
      )}
    </button>
  );
}
