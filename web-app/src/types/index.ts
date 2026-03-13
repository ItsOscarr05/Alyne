export type UserType = 'PROVIDER' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  userType: UserType;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  isVerified: boolean;
  providerOnboardingComplete?: boolean;
}
