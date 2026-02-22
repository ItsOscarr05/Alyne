import apiClient from './api';

export interface StripeOnboardingLink {
  stripeAccountId: string;
  url: string;
  expiresAt?: number;
  linkType?: 'account_onboarding' | 'account_update';
}

export interface StripeBankAccountSummary {
  bankName?: string;
  last4?: string;
  currency?: string;
}

export interface StripeConnectStatus {
  hasAccount: boolean;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bankAccount?: StripeBankAccountSummary | null;
}

export const stripeConnectService = {
  async createOnboardingLink(options?: { returnPath?: string; type?: 'onboarding' | 'update' }) {
    const body: { returnPath?: string; type?: 'onboarding' | 'update' } = {};
    if (options?.returnPath) body.returnPath = options.returnPath;
    if (options?.type) body.type = options.type;
    
    const response = await apiClient.post<{ success: boolean; data: StripeOnboardingLink }>(
      '/stripe/connect/onboarding-link',
      Object.keys(body).length > 0 ? body : undefined
    );
    return response.data.data;
  },

  async getStatus() {
    const response = await apiClient.get<{ success: boolean; data: StripeConnectStatus }>(
      '/stripe/connect/status'
    );
    return response.data.data;
  },
};

