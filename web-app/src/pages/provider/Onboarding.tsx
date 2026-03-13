import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  User,
  Briefcase,
  Calendar,
  Award,
  CreditCard,
  CheckCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { LocationInput } from '../../components/ui/LocationInput';
import { useAuth } from '../../hooks/useAuth';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { onboardingService } from '../../services/onboarding';
import { stripeConnectService } from '../../services/stripeConnect';
import { authService } from '../../services/auth';
import { geocodeCityState } from '../../utils/geocode';
import { filterSpecialties } from '../../data/wellnessSpecialties';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import styles from './Onboarding.module.css';

type Step =
  | 'location'
  | 'profile'
  | 'services'
  | 'availability'
  | 'credentials'
  | 'bank'
  | 'complete';

const STEPS: Step[] = ['location', 'profile', 'services', 'availability', 'credentials', 'bank', 'complete'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  price: string;
  duration: string;
  durationUnit: 'min' | 'hr';
}

interface AvailabilityRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface CredentialRow {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
}

const DRAFT_KEY = 'provider_onboarding_draft';

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUserFromResponse } = useAuth();
  const modal = useModal();

  const [currentStep, setCurrentStep] = useState<Step>('location');
  const [loading, setLoading] = useState(false);

  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const [services, setServices] = useState<ServiceRow[]>([
    { id: '1', name: '', description: '', price: '', duration: '', durationUnit: 'min' },
  ]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [credentials, setCredentials] = useState<CredentialRow[]>([]);

  const currentStepIndex = STEPS.indexOf(currentStep) + 1;
  const filteredSpecialties = filterSpecialties(specialtySearch);

  useEffect(() => {
    if (user && user.userType !== 'PROVIDER') {
      navigate('/discover');
    }
  }, [user, navigate]);

  useEffect(() => {
    const step = searchParams.get('step');
    const stripe = searchParams.get('stripe');
    if (step === 'bank' || stripe) {
      setCurrentStep('bank');
    }
  }, [searchParams]);

  const saveDraft = useCallback(() => {
    if (!user?.id) return;
    const draft = {
      city,
      state,
      bio,
      specialties,
      services,
      availability,
      credentials,
      currentStep,
    };
    try {
      localStorage.setItem(`${DRAFT_KEY}_${user.id}`, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [user?.id, city, state, bio, specialties, services, availability, credentials, currentStep]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`${DRAFT_KEY}_${user.id}`);
      if (raw) {
        const draft = JSON.parse(raw);
        setCity(draft.city ?? '');
        setState(draft.state ?? '');
        setBio(draft.bio ?? '');
        setSpecialties(draft.specialties ?? []);
        setServices(draft.services ?? [{ id: '1', name: '', description: '', price: '', duration: '', durationUnit: 'min' }]);
        setAvailability(draft.availability ?? []);
        setCredentials(draft.credentials ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const toggleSpecialty = (value: string) => {
    setSpecialties((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const addService = () => {
    setServices((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: '',
        description: '',
        price: '',
        duration: '',
        durationUnit: 'min',
      },
    ]);
  };

  const removeService = (id: string) => {
    if (services.length <= 1) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: keyof ServiceRow, value: string | number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const addAvailability = () => {
    setAvailability((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      },
    ]);
  };

  const removeAvailability = (id: string) => {
    setAvailability((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAvailability = (id: string, field: keyof AvailabilityRow, value: number | string) => {
    setAvailability((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const addCredential = () => {
    setCredentials((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', issuer: '', issueDate: '', expiryDate: '' },
    ]);
  };

  const removeCredential = (id: string) => {
    setCredentials((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCredential = (id: string, field: keyof CredentialRow, value: string) => {
    setCredentials((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSaveLocation = async () => {
    if (!city.trim() || !state.trim()) {
      modal.showAlert({
        title: 'Location Required',
        message: 'Please enter city and state.',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const coords = await geocodeCityState(city, state);
      await onboardingService.updateProfile({
        serviceArea: {
          center: coords ?? { lat: 0, lng: 0 },
          radius: 25,
        },
      });
      setCurrentStep('profile');
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

  const handleSaveProfile = async () => {
    if (!bio.trim() || specialties.length === 0) {
      modal.showAlert({
        title: 'Profile Required',
        message: 'Please add a bio and at least one specialty.',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      await onboardingService.updateProfile({
        bio: bio.trim(),
        specialties,
      });
      if (profilePhoto) {
        await authService.updateProfile({ profilePhoto });
      }
      setCurrentStep('services');
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

  const handleSaveServices = async () => {
    const valid = services.filter((s) => s.name.trim() && s.price && s.duration);
    if (valid.length === 0) {
      modal.showAlert({
        title: 'Services Required',
        message: 'Add at least one service with name, price, and duration.',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      for (const s of valid) {
        const durationMin =
          s.durationUnit === 'hr'
            ? parseFloat(s.duration) * 60
            : parseFloat(s.duration);
        await onboardingService.createService({
          name: s.name.trim(),
          description: s.description.trim() || undefined,
          price: parseFloat(s.price),
          duration: Math.round(durationMin),
        });
      }
      setCurrentStep('availability');
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

  const handleSaveAvailability = async () => {
    if (availability.length === 0) {
      modal.showAlert({
        title: 'Availability Required',
        message: 'Add at least one availability slot.',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      for (const a of availability) {
        await onboardingService.createAvailability({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isRecurring: true,
        });
      }
      setCurrentStep('credentials');
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

  const handleSaveCredentials = async () => {
    setLoading(true);
    try {
      for (const c of credentials) {
        if (c.name.trim()) {
          await onboardingService.createCredential({
            name: c.name.trim(),
            issuer: c.issuer.trim() || undefined,
            issueDate: c.issueDate || undefined,
            expiryDate: c.expiryDate || undefined,
          });
        }
      }
      setCurrentStep('bank');
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

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/provider/onboarding?step=bank&stripe=return`;
      const { url } = await stripeConnectService.createOnboardingLink({
        returnPath: returnUrl,
        type: 'onboarding',
      });
      window.location.href = url;
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

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { user: updated } = await onboardingService.completeOnboarding();
      setUserFromResponse(updated);
      if (user?.id) {
        localStorage.removeItem(`${DRAFT_KEY}_${user.id}`);
      }
      navigate('/provider/dashboard');
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

  const goBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Provider Onboarding</h1>
      <p className={styles.subtitle}>Set up your wellness practice on Alyne</p>

      <div className={styles.progress}>
        <span className={styles.stepIndicator}>
          Step {currentStepIndex} of {STEPS.length}
        </span>
      </div>

      {currentStep === 'location' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <MapPin size={32} />
          </div>
          <h2 className={styles.stepTitle}>Location</h2>
          <p className={styles.stepDesc}>
            Tell us where you&apos;re based so clients in your area can discover you.
          </p>
          <LocationInput city={city} state={state} onCityChange={setCity} onStateChange={setState} />
          <Button
            title="Continue"
            variant="primary"
            onPress={handleSaveLocation}
            loading={loading}
            disabled={!city.trim() || !state.trim()}
            fullWidth
          />
        </div>
      )}

      {currentStep === 'profile' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <User size={32} />
          </div>
          <h2 className={styles.stepTitle}>Profile</h2>
          <p className={styles.stepDesc}>Tell clients about yourself and your expertise.</p>
          <FormField
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Your experience and approach..."
            required
          />
          <div className={styles.specialtySection}>
            <label className={styles.sectionLabel}>Specialties</label>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search specialties..."
              value={specialtySearch}
              onChange={(e) => setSpecialtySearch(e.target.value)}
            />
            <div className={styles.specialtyGrid}>
              {filteredSpecialties.slice(0, 20).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={`${styles.tag} ${specialties.includes(s.value) ? styles.tagSelected : ''}`}
                  onClick={() => toggleSpecialty(s.value)}
                >
                  {s.value}
                </button>
              ))}
            </div>
            {specialties.length > 0 && (
              <p className={styles.selectedHint}>Selected: {specialties.join(', ')}</p>
            )}
          </div>
          <div className={styles.actions}>
            <Button title="Back" variant="ghost" onPress={goBack} />
            <Button
              title="Continue"
              variant="primary"
              onPress={handleSaveProfile}
              loading={loading}
              disabled={!bio.trim() || specialties.length === 0}
              fullWidth
            />
          </div>
        </div>
      )}

      {currentStep === 'services' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <Briefcase size={32} />
          </div>
          <h2 className={styles.stepTitle}>Services</h2>
          <p className={styles.stepDesc}>Add the services you offer and their prices.</p>
          {services.map((s) => (
            <div key={s.id} className={styles.serviceRow}>
              <FormField
                label="Service name"
                value={s.name}
                onChange={(e) => updateService(s.id, 'name', e.target.value)}
                placeholder="e.g. Personal Training"
              />
              <FormField
                label="Description"
                value={s.description}
                onChange={(e) => updateService(s.id, 'description', e.target.value)}
              />
              <div className={styles.rowTwo}>
                <FormField
                  label="Price ($)"
                  type="number"
                  value={s.price}
                  onChange={(e) => updateService(s.id, 'price', e.target.value)}
                  placeholder="75"
                />
                <FormField
                  label="Duration"
                  type="number"
                  value={s.duration}
                  onChange={(e) => updateService(s.id, 'duration', e.target.value)}
                  placeholder="60"
                />
                <div className={styles.durationUnit}>
                  <label>
                    <input
                      type="radio"
                      checked={s.durationUnit === 'min'}
                      onChange={() => updateService(s.id, 'durationUnit', 'min')}
                    />
                    min
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={s.durationUnit === 'hr'}
                      onChange={() => updateService(s.id, 'durationUnit', 'hr')}
                    />
                    hr
                  </label>
                </div>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeService(s.id)}
                disabled={services.length <= 1}
              >
                <Trash2 size={18} /> Remove
              </button>
            </div>
          ))}
          <Button title="Add service" variant="ghost" onPress={addService} />
          <div className={styles.actions}>
            <Button title="Back" variant="ghost" onPress={goBack} />
            <Button
              title="Continue"
              variant="primary"
              onPress={handleSaveServices}
              loading={loading}
              disabled={services.every((s) => !s.name.trim())}
              fullWidth
            />
          </div>
        </div>
      )}

      {currentStep === 'availability' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <Calendar size={32} />
          </div>
          <h2 className={styles.stepTitle}>Availability</h2>
          <p className={styles.stepDesc}>When are you typically available?</p>
          {availability.length === 0 ? (
            <p className={styles.hint}>Click Add to add a time slot.</p>
          ) : (
            availability.map((a) => (
              <div key={a.id} className={styles.availRow}>
                <select
                  value={a.dayOfWeek}
                  onChange={(e) => updateAvailability(a.id, 'dayOfWeek', parseInt(e.target.value, 10))}
                  className={styles.select}
                >
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={a.startTime}
                  onChange={(e) => updateAvailability(a.id, 'startTime', e.target.value)}
                  className={styles.timeInput}
                />
                <input
                  type="time"
                  value={a.endTime}
                  onChange={(e) => updateAvailability(a.id, 'endTime', e.target.value)}
                  className={styles.timeInput}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeAvailability(a.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
          <Button title="Add time slot" variant="ghost" onPress={addAvailability} />
          <div className={styles.actions}>
            <Button title="Back" variant="ghost" onPress={goBack} />
            <Button
              title="Continue"
              variant="primary"
              onPress={handleSaveAvailability}
              loading={loading}
              disabled={availability.length === 0}
              fullWidth
            />
          </div>
        </div>
      )}

      {currentStep === 'credentials' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <Award size={32} />
          </div>
          <h2 className={styles.stepTitle}>Credentials</h2>
          <p className={styles.stepDesc}>Add certifications and credentials (optional).</p>
          {credentials.length === 0 ? (
            <p className={styles.hint}>Click Add to add a credential.</p>
          ) : (
            credentials.map((c) => (
              <div key={c.id} className={styles.credRow}>
                <FormField
                  label="Credential name"
                  value={c.name}
                  onChange={(e) => updateCredential(c.id, 'name', e.target.value)}
                  placeholder="e.g. NASM CPT"
                />
                <FormField
                  label="Issuer"
                  value={c.issuer}
                  onChange={(e) => updateCredential(c.id, 'issuer', e.target.value)}
                />
                <div className={styles.rowTwo}>
                  <FormField
                    label="Issue date"
                    type="date"
                    value={c.issueDate}
                    onChange={(e) => updateCredential(c.id, 'issueDate', e.target.value)}
                  />
                  <FormField
                    label="Expiry date"
                    type="date"
                    value={c.expiryDate}
                    onChange={(e) => updateCredential(c.id, 'expiryDate', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeCredential(c.id)}
                >
                  <Trash2 size={18} /> Remove
                </button>
              </div>
            ))
          )}
          <Button title="Add credential" variant="ghost" onPress={addCredential} />
          <div className={styles.actions}>
            <Button title="Back" variant="ghost" onPress={goBack} />
            <Button
              title="Continue"
              variant="primary"
              onPress={handleSaveCredentials}
              loading={loading}
              fullWidth
            />
          </div>
        </div>
      )}

      {currentStep === 'bank' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <CreditCard size={32} />
          </div>
          <h2 className={styles.stepTitle}>Payouts</h2>
          <p className={styles.stepDesc}>
            Connect your bank account to receive payments. Secured by Stripe.
          </p>
          <Button
            title="Connect bank account"
            variant="primary"
            onPress={handleConnectStripe}
            loading={loading}
            fullWidth
          />
          <Button
            title="Skip for now"
            variant="ghost"
            onPress={() => setCurrentStep('complete')}
          />
          <div className={styles.actions}>
            <Button title="Back" variant="ghost" onPress={goBack} />
          </div>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className={styles.step}>
          <div className={styles.stepIconComplete}>
            <CheckCircle size={48} />
          </div>
          <h2 className={styles.stepTitle}>You&apos;re All Set!</h2>
          <p className={styles.stepDesc}>
            Your provider profile is ready. Complete setup to start accepting bookings.
          </p>
          <Button
            title="Complete setup"
            variant="primary"
            onPress={handleComplete}
            loading={loading}
            fullWidth
          />
        </div>
      )}

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
