import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { PaymentCheckoutModal } from '../../components/PaymentCheckoutModal';

export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { user } = useAuth();

  // Providers should never see a checkout screen
  if (user?.userType === 'PROVIDER') {
    if (Platform.OS === 'web') {
      router.replace('/(tabs)/dashboard');
    } else {
      router.replace('/(tabs)/dashboard');
    }
    return null;
  }

  return (
    <PaymentCheckoutModal
      visible={true}
      bookingId={bookingId ?? null}
      onClose={() => router.back()}
    />
  );
}

