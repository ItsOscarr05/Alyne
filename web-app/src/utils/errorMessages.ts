export function isNetworkError(error: unknown): boolean {
  const e = error as { code?: string; message?: string; request?: unknown; response?: unknown };
  if (
    e?.code === 'ERR_NETWORK' ||
    e?.code === 'ECONNABORTED' ||
    e?.code === 'ETIMEDOUT' ||
    e?.message?.includes('fetch') ||
    e?.message?.includes('network')
  ) {
    return true;
  }
  if (e?.request && !e?.response) return true;
  return false;
}

const SERVER_ERROR_PHRASES = [
  'internal server error',
  'server error',
  '500',
  '502',
  '503',
];

function isServerError(message: string): boolean {
  const lower = message.toLowerCase();
  return SERVER_ERROR_PHRASES.some((phrase) => lower.includes(phrase));
}

export function getUserFriendlyError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection.';
  }
  const e = error as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } }; message?: string };
  const status = e?.response?.status;
  const rawMessage = (e?.response?.data?.error?.message ?? e?.response?.data?.message ?? e?.message ?? '') as string;

  if (status === 401) {
    if (typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('invalid')) {
      return 'Incorrect email or password. Please try again.';
    }
    return 'Your session has expired. Please log in again.';
  }

  if ((status && status >= 500) || (rawMessage && isServerError(rawMessage))) {
    return 'We\'re having trouble connecting right now. Please try again in a moment.';
  }

  if (rawMessage && typeof rawMessage === 'string') return rawMessage;
  return 'Something went wrong. Please try again.';
}

export function getErrorTitle(error: unknown): string {
  if (isNetworkError(error)) return 'No Connection';
  const e = error as { response?: { status?: number } };
  if (e?.response?.status === 401) return 'Invalid Credentials';
  if (e?.response?.status === 403) return 'Access Denied';
  if (e?.response?.status === 404) return 'Not Found';
  if ((e?.response?.status ?? 0) >= 500) return 'Server Error';
  return 'Error';
}
