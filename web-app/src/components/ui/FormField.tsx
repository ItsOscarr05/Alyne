import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './FormField.module.css';

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
}

export function FormField({
  label,
  error,
  required,
  type = 'text',
  ...inputProps
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const hasError = Boolean(error);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && isPasswordVisible ? 'text' : type;

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      <div
        className={`${styles.inputWrapper} ${hasError ? styles.hasError : ''} ${isFocused ? styles.focused : ''}`}
      >
        <input
          type={inputType}
          className={`${styles.input} ${isPasswordField ? styles.inputWithIcon : ''}`}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputProps.id || 'field'}-error` : undefined}
          {...inputProps}
        />
        {isPasswordField && (
          <button
            type="button"
            className={styles.eyeButton}
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
      {hasError && (
        <p id={`${inputProps.id || 'field'}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
