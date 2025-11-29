import apiClient from './api';

export interface PlaidLinkToken {
  linkToken: string;
}

export interface PlaidExchangeResult {
  processorToken: string;
  itemId: string;
  accountName: string;
  accountType: string;
  accountMask: string;
  accountId: string;
  verified: boolean;
}

export const plaidService = {
  /**
   * Get Plaid link token for provider bank account setup
   */
  async getProviderLinkToken() {
    const response = await apiClient.get<{ success: boolean; data: PlaidLinkToken }>('/plaid/link-token');
    return response.data.data.linkToken;
  },

  /**
   * Get Plaid link token for client payment initiation
   */
  async getPaymentLinkToken(bookingId: string) {
    const response = await apiClient.get<{ success: boolean; data: PlaidLinkToken }>(
      `/plaid/payment-link-token?bookingId=${bookingId}`
    );
    return response.data.data.linkToken;
  },

  /**
   * Exchange Plaid public token (for provider bank account setup)
   */
  async exchangePublicToken(publicToken: string) {
    const response = await apiClient.post<{ success: boolean; data: PlaidExchangeResult }>('/plaid/exchange-token', {
      publicToken,
    });
    return response.data.data;
  },

  /**
   * Get bank account info for provider
   */
  async getBankAccountInfo() {
    const response = await apiClient.get<{ success: boolean; data: any }>('/plaid/bank-account');
    return response.data.data;
  },
};

