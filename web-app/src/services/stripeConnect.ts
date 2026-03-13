import apiClient from './api';

export interface StripeOnboardingLink {
  stripeAccountId: string;
  url: string;
  expiresAt?: number;
  linkType?: 'account_onboarding' | 'account_update';
}

export interface StripeConnectStatus {
  hasAccount: boolean;
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  bankAccount?: { bankName?: string; last4?: string; currency?: string } | null;
}

export const stripeConnectService = {
  async createOnboardingLink(options?: {
    returnPath?: string;
    type?: 'onboarding' | 'update';
  }): Promise<StripeOnboardingLink> {
    const { data } = await apiClient.post<{
      success: boolean;
      data: StripeOnboardingLink;
    }>('/stripe/connect/onboarding-link', options ?? {});
    const body = data as { success?: boolean; data?: StripeOnboardingLink };
    if (!body.data) throw new Error('Failed to create onboarding link');
    return body.data;
  },

  async getStatus(): Promise<StripeConnectStatus> {
    const { data } = await apiClient.get<{
      success: boolean;
      data: StripeConnectStatus;
    }>('/stripe/connect/status');
    const body = data as { success?: boolean; data?: StripeConnectStatus };
    return body.data ?? { hasAccount: false, stripeAccountId: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false };
  },
};
