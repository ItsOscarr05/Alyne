import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validateEmail } from '../../utils/validation';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import styles from './AuthForms.module.css';

const REMEMBERED_EMAIL_KEY = 'remembered_email';
const REMEMBERED_PASSWORD_KEY = 'remembered_password';
const GUEST_PROVIDER_EMAIL = 'yoga@alyne.com';
const GUEST_PROVIDER_PASSWORD = 'provider123';

export function Login() {
  const navigate = useNavigate();
  const modal = useModal();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    const rememberedPassword = localStorage.getItem(REMEMBERED_PASSWORD_KEY);
    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRememberMe(true);
    }
  }, []);

  const isValid = validateEmail(email) && password.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      modal.showAlert({
        title: 'Required',
        message: 'Please enter your email and password',
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const { user } = await login(email, password);
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        localStorage.setItem(REMEMBERED_PASSWORD_KEY, password);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
      }
      if (user.userType === 'PROVIDER') {
        if (user.providerOnboardingComplete !== true) {
          navigate('/provider/onboarding');
        } else {
          navigate('/provider/dashboard');
        }
      } else {
        navigate('/discover');
      }
    } catch (err: unknown) {
      modal.showAlert({
        title: getErrorTitle(err) || 'Login Failed',
        message: getUserFriendlyError(err) || 'An error occurred during login. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    try {
      const { user } = await login(GUEST_PROVIDER_EMAIL, GUEST_PROVIDER_PASSWORD);
      if (user.userType === 'PROVIDER') {
        navigate(user.providerOnboardingComplete ? '/provider/dashboard' : '/provider/onboarding');
      } else {
        navigate('/discover');
      }
    } catch {
      try {
        const { user } = await login('test@alyne.com', 'test123');
        navigate(user.userType === 'PROVIDER' ? '/provider/dashboard' : '/discover');
      } catch {
        modal.showAlert({ title: 'Guest Login', message: 'Run `pnpm seed` in the backend to create test users.', type: 'error' });
      }
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link to="/auth/welcome" className={styles.backLink}>
        ← Back
      </Link>
      <h1 className={styles.title}>Log in</h1>
      <p className={styles.subtitle}>Sign in to your Alyne account</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>

        <Link to="/auth/reset-password" className={styles.link}>
          Forgot password?
        </Link>

        <Button
          type="submit"
          variant="primary"
          title="Log in"
          loading={loading}
          disabled={!isValid}
          fullWidth
          className={styles.submitBtn}
        />

        {import.meta.env.DEV && (
          <button
            type="button"
            className={styles.guestLink}
            onClick={handleGuestLogin}
            disabled={guestLoading}
          >
            {guestLoading ? 'Logging in…' : 'Guest Login (Dev)'}
          </button>
        )}
      </form>

      <p className={styles.footer}>
        Don&apos;t have an account?{' '}
        <Link to="/auth/register" className={styles.link}>
          Sign up
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
