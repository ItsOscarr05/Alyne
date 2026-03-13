import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { PasswordRequirements } from '../../components/ui/PasswordRequirements';
import { useAuth } from '../../hooks/useAuth';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validateEmail, validatePassword } from '../../utils/validation';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import styles from './AuthForms.module.css';

export function Register() {
  const navigate = useNavigate();
  const modal = useModal();
  const { register } = useAuth();
  const [userType, setUserType] = useState<'provider' | 'client' | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailValid = validateEmail(email);
  const passwordResult = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isValid =
    userType !== null &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailValid &&
    passwordResult.valid &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !userType) return;
    if (password !== confirmPassword) {
      modal.showAlert({
        title: 'Validation Error',
        message: 'Passwords do not match',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await register(email, password, firstName, lastName, userType);
      if (userType === 'provider') {
        navigate('/provider/onboarding');
      } else {
        navigate('/client/onboarding');
      }
    } catch (err: unknown) {
      modal.showAlert({
        title: getErrorTitle(err) || 'Sign Up Failed',
        message: getUserFriendlyError(err) || 'An error occurred. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sign up</h1>
      <p className={styles.subtitle}>Create your Alyne account</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.userTypeSection}>
          <label className={styles.userTypeLabel}>I am a...</label>
          <div className={styles.userTypeButtons}>
            <button
              type="button"
              className={`${styles.userTypeBtn} ${userType === 'provider' ? styles.userTypeBtnActive : ''}`}
              onClick={() => setUserType('provider')}
            >
              Provider
            </button>
            <button
              type="button"
              className={`${styles.userTypeBtn} ${userType === 'client' ? styles.userTypeBtnActive : ''}`}
              onClick={() => setUserType('client')}
            >
              Client
            </button>
          </div>
        </div>

        <FormField
          label="First name"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoComplete="given-name"
        />
        <FormField
          label="Last name"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          autoComplete="family-name"
        />
        <FormField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          error={email && !emailValid ? 'Invalid email address' : undefined}
          autoComplete="email"
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          required
          error={password && !passwordResult.valid ? passwordResult.message : undefined}
          autoComplete="new-password"
        />
        <PasswordRequirements password={password} isFocused={passwordFocused} />
        <FormField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          error={
            confirmPassword && !passwordsMatch
              ? 'Passwords do not match'
              : undefined
          }
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          title="Create account"
          loading={loading}
          disabled={!isValid}
          fullWidth
          className={styles.submitBtn}
        />
      </form>

      <p className={styles.footer}>
        Already have an account?{' '}
        <Link to="/auth/login" className={styles.link}>
          Log in
        </Link>
      </p>

      {modal.alertVisible && modal.alertOptions && (
        <AlertModal
          visible={modal.alertVisible}
          onClose={modal.hideAlert}
          title={modal.alertOptions.title}
          message={modal.alertOptions.message}
          type={modal.alertOptions.type}
          buttonText={modal.alertOptions.buttonText}
          onButtonPress={modal.alertOptions.onButtonPress}
        />
      )}
    </div>
  );
}
