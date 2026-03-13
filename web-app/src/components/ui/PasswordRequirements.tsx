import { useMemo } from 'react';
import styles from './PasswordRequirements.module.css';

type PasswordStrength = 'weak' | 'medium' | 'strong';

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';
  let score = 0;
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;
  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
}

interface PasswordRequirementsProps {
  password: string;
  isFocused?: boolean;
}

export function PasswordRequirements({ password, isFocused = false }: PasswordRequirementsProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!isFocused) return null;

  const fill1 = strength !== 'weak' ? 100 : password.length > 0 ? 100 : 0;
  const fill2 = strength === 'medium' || strength === 'strong' ? 100 : 0;
  const fill3 = strength === 'strong' ? 100 : 0;

  const section1Color =
    strength === 'weak' ? 'var(--color-error)' : strength === 'medium' ? '#f59e0b' : 'var(--color-success)';
  const section2Color = strength === 'strong' ? 'var(--color-success)' : '#f59e0b';

  return (
    <div className={styles.container}>
      <div className={styles.meterContainer}>
        <div className={styles.section}>
          <div
            className={styles.sectionFill}
            style={{ width: `${fill1}%`, backgroundColor: section1Color }}
          />
        </div>
        <div className={styles.section}>
          <div
            className={styles.sectionFill}
            style={{ width: `${fill2}%`, backgroundColor: section2Color }}
          />
        </div>
        <div className={styles.section}>
          <div
            className={styles.sectionFill}
            style={{ width: `${fill3}%`, backgroundColor: 'var(--color-success)' }}
          />
        </div>
      </div>
      {password.length > 0 && (
        <span className={styles.strengthLabel}>
          {strength === 'weak' && 'Weak'}
          {strength === 'medium' && 'Medium'}
          {strength === 'strong' && 'Strong'}
        </span>
      )}
    </div>
  );
}
