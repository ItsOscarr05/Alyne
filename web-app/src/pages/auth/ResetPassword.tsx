import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { PasswordRequirements } from '../../components/ui/PasswordRequirements';
import { authService } from '../../services/auth';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { validateEmail, validatePassword } from '../../utils/validation';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import styles from './AuthForms.module.css';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const modal = useModal();

  const [step, setStep] = useState<'email' | 'reset'>(tokenFromUrl ? 'reset' : 'email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isEmailValid = validateEmail(email);
  const passwordResult = validatePassword(newPassword);
  const isResetValid =
    token.trim().length >= 6 &&
    passwordResult.valid &&
    newPassword === confirmPassword;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStep('reset');
    } catch (err: unknown) {
      modal.showAlert({
        title: getErrorTitle(err) || 'Error',
        message: getUserFriendlyError(err),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isResetValid) return;
    if (newPassword !== confirmPassword) {
      modal.showAlert({
        title: 'Validation Error',
        message: 'Passwords do not match',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      modal.showAlert({
        title: getErrorTitle(err) || 'Error',
        message: getUserFriendlyError(err),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Password reset</h1>
        <p className={styles.subtitle}>Your password has been reset. You can now sign in.</p>
        <Link to="/auth/login">
          <Button variant="primary" title="Back to login" fullWidth />
        </Link>
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

  if (step === 'email') {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.subtitle}>Enter your email to receive a reset code</p>
        <form onSubmit={handleRequestReset} className={styles.form}>
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          />
          <Button
            type="submit"
            variant="primary"
            title="Send reset code"
            loading={loading}
            disabled={!isEmailValid}
            fullWidth
            className={styles.submitBtn}
          />
        </form>
        <p className={styles.footer}>
          <Link to="/auth/login" className={styles.link}>Back to login</Link>
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Set new password</h1>
      <p className={styles.subtitle}>Enter the 6-digit code from your email and your new password</p>
      <form onSubmit={handleResetPassword} className={styles.form}>
        <FormField
          label="Reset code"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter 6-digit code"
          maxLength={6}
          required
        />
        <FormField
          label="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onFocus={() => setNewPasswordFocused(true)}
          onBlur={() => setNewPasswordFocused(false)}
          required
          error={newPassword && !passwordResult.valid ? passwordResult.message : undefined}
          autoComplete="new-password"
        />
        <PasswordRequirements password={newPassword} isFocused={newPasswordFocused} />
        <FormField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          variant="primary"
          title="Reset password"
          loading={loading}
          disabled={!isResetValid}
          fullWidth
          className={styles.submitBtn}
        />
      </form>
      <p className={styles.footer}>
        <Link to="/auth/login" className={styles.link}>Back to login</Link>
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
