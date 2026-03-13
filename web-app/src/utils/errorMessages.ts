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

export function getUserFriendlyError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection.';
  }
  const e = error as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } }; message?: string };
  const apiMessage = e?.response?.data?.error?.message ?? e?.response?.data?.message;
  if (e?.response?.status === 401) {
    if (typeof apiMessage === 'string' && apiMessage.toLowerCase().includes('invalid')) {
      return 'Incorrect email or password. Please try again.';
    }
    return 'Your session has expired. Please log in again.';
  }
  if (apiMessage && typeof apiMessage === 'string') return apiMessage;
  if (e?.message) return e.message;
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
