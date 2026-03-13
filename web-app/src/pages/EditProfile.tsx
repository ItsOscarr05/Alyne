import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FormField } from '../components/ui/FormField';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth';
import styles from './EditProfile.module.css';

export function EditProfile() {
  const { user, setUserFromResponse } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setPhoneNumber(user.phoneNumber ?? '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updated = await authService.updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      setUserFromResponse(updated);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/settings" className={styles.back}>
          Back to settings
        </Link>
        <h1 className={styles.title}>Edit profile</h1>
        <p className={styles.subtitle}>Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <FormField
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <FormField
          label="Phone number"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        {error && <p className={styles.error} role="alert">{error}</p>}
        {saved && <p className={styles.saved}>Profile saved.</p>}

        <Button
          type="submit"
          variant="primary"
          title="Save"
          fullWidth
          loading={loading}
        />
      </form>
    </div>
  );
}
