import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CreditCard, Heart, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LocationInput } from '../../components/ui/LocationInput';
import { useAuth } from '../../hooks/useAuth';
import { useModal } from '../../hooks/useModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { clientService } from '../../services/client';
import { geocodeCityState } from '../../utils/geocode';
import { getUserFriendlyError, getErrorTitle } from '../../utils/errorMessages';
import styles from './Onboarding.module.css';

type Step = 'location' | 'payment' | 'preferences' | 'complete';

const WELLNESS_GOALS = [
  'Fitness & Exercise',
  'Stress Relief',
  'Weight Management',
  'Flexibility & Mobility',
  'Mental Wellness',
  'Nutrition',
  'Recovery & Rehabilitation',
];

const SERVICE_TYPES = [
  'Personal Training',
  'Yoga',
  'Massage Therapy',
  'Nutrition Coaching',
  'Meditation',
  'Physical Therapy',
  'Wellness Coaching',
];

const STEPS: Step[] = ['location', 'payment', 'preferences', 'complete'];

export function ClientOnboarding() {
  const navigate = useNavigate();
  const modal = useModal();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('location');
  const [loading, setLoading] = useState(false);

  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [wellnessGoals, setWellnessGoals] = useState<string[]>([]);
  const [preferredServiceTypes, setPreferredServiceTypes] = useState<string[]>([]);

  const currentStepIndex = STEPS.indexOf(currentStep) + 1;

  useEffect(() => {
    if (user && user.userType !== 'CLIENT') {
      navigate('/discover');
    }
  }, [user, navigate]);

  const toggleGoal = (goal: string) => {
    setWellnessGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const toggleServiceType = (type: string) => {
    setPreferredServiceTypes((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]
    );
  };

  const handleSaveLocation = async () => {
    if (!city.trim() || !state.trim()) {
      modal.showAlert({
        title: 'Location Required',
        message: 'Please enter both city and state to continue.',
        type: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const coordinates = await geocodeCityState(city.trim(), state.trim());
      await clientService.updateProfile({
        location: {
          city: city.trim(),
          state: state.trim(),
          ...(coordinates && { lat: coordinates.lat, lng: coordinates.lng }),
        },
      });
      setCurrentStep('payment');
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

  const handleSavePayment = () => {
    setCurrentStep('preferences');
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await clientService.updateProfile({
        wellnessGoals,
        preferredServiceTypes,
      });
      setCurrentStep('complete');
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

  const handleComplete = () => {
    navigate('/discover');
  };

  return (
    <div className={styles.page}>
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
          <h1 className={styles.stepTitle}>Set Your Location</h1>
          <p className={styles.stepDesc}>
            We&apos;ll use your location to find nearby wellness providers.
          </p>
          <LocationInput
            city={city}
            state={state}
            onCityChange={setCity}
            onStateChange={setState}
          />
          <Button
            title="Continue"
            variant="primary"
            onPress={handleSaveLocation}
            loading={loading}
            disabled={!city.trim() || !state.trim() || loading}
            fullWidth
            className={styles.continueBtn}
          />
        </div>
      )}

      {currentStep === 'payment' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <CreditCard size={32} />
          </div>
          <h1 className={styles.stepTitle}>Payment</h1>
          <p className={styles.stepDesc}>
            You&apos;ll add a payment method when you book your first session. Payments are
            secure and handled by Stripe.
          </p>
          <div className={styles.placeholderCard}>
            <CreditCard size={24} />
            <span>Payment method added at checkout</span>
          </div>
          <Button
            title="Continue"
            variant="primary"
            onPress={handleSavePayment}
            fullWidth
            className={styles.continueBtn}
          />
        </div>
      )}

      {currentStep === 'preferences' && (
        <div className={styles.step}>
          <div className={styles.stepIcon}>
            <Heart size={32} />
          </div>
          <h1 className={styles.stepTitle}>Wellness Preferences</h1>
          <p className={styles.stepDesc}>
            Help us personalize your experience by sharing your wellness goals and interests.
          </p>
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Wellness Goals (Optional)</label>
            <div className={styles.tagGrid}>
              {WELLNESS_GOALS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  className={`${styles.tag} ${wellnessGoals.includes(goal) ? styles.tagSelected : ''}`}
                  onClick={() => toggleGoal(goal)}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Preferred Service Types (Optional)</label>
            <div className={styles.tagGrid}>
              {SERVICE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.tag} ${preferredServiceTypes.includes(type) ? styles.tagSelected : ''}`}
                  onClick={() => toggleServiceType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <Button
            title="Continue"
            variant="primary"
            onPress={handleSavePreferences}
            loading={loading}
            fullWidth
            className={styles.continueBtn}
          />
        </div>
      )}

      {currentStep === 'complete' && (
        <div className={styles.step}>
          <div className={styles.stepIconComplete}>
            <CheckCircle size={48} />
          </div>
          <h1 className={styles.stepTitle}>You&apos;re All Set!</h1>
          <p className={styles.stepDesc}>
            Your profile is set up and ready. Start discovering wellness providers near you.
          </p>
          <Button
            title="Get Started"
            variant="primary"
            onPress={handleComplete}
            fullWidth
            className={styles.continueBtn}
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
