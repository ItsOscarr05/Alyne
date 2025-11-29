/**
 * User-friendly error message utility
 * Converts technical errors into messages users can understand
 */

export const getUserFriendlyError = (error: any): string => {
  // Network errors
  if (
    error?.message?.includes('Network') ||
    error?.message?.includes('network') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('Failed to fetch') ||
    error?.code === 'NETWORK_ERROR' ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Authentication errors
  if (error?.response?.status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (error?.response?.status === 403) {
    return "You don't have permission to perform this action.";
  }

  // Not found errors
  if (error?.response?.status === 404) {
    return 'The requested item could not be found.';
  }

  // Server errors
  if (error?.response?.status >= 500) {
    return 'Our servers are experiencing issues. Please try again in a few moments.';
  }

  // Rate limiting
  if (error?.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Try to extract user-friendly message from API response
  const apiMessage = 
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.response?.data?.error;

  if (apiMessage) {
    // Clean up technical error messages
    return cleanErrorMessage(apiMessage);
  }

  // Fallback to error message if available
  if (error?.message) {
    return cleanErrorMessage(error.message);
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
};

/**
 * Clean up technical error messages to be more user-friendly
 */
const cleanErrorMessage = (message: string): string => {
  // Remove technical prefixes
  let cleaned = message
    .replace(/^Error: /i, '')
    .replace(/^\[.*?\] /, '')
    .replace(/Validation error:/i, '')
    .replace(/Prisma error:/i, '');

  // Convert common technical messages to user-friendly ones
  const replacements: Record<string, string> = {
    'not found': 'could not be found',
    'already exists': 'already exists. Please try a different option.',
    'unauthorized': 'You need to log in to perform this action.',
    'forbidden': "You don't have permission to do this.",
    'invalid': 'The information provided is invalid.',
    'required': 'Please fill in all required fields.',
    'must be': 'Please check your input and try again.',
  };

  for (const [key, replacement] of Object.entries(replacements)) {
    if (cleaned.toLowerCase().includes(key)) {
      cleaned = replacement;
      break;
    }
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || 'Something went wrong. Please try again.';
};

/**
 * Get error title based on error type
 */
export const getErrorTitle = (error: any): string => {
  if (error?.response?.status === 401) {
    return 'Session Expired';
  }
  if (error?.response?.status === 403) {
    return 'Access Denied';
  }
  if (error?.response?.status === 404) {
    return 'Not Found';
  }
  if (error?.response?.status >= 500) {
    return 'Server Error';
  }
  if (error?.response?.status === 429) {
    return 'Too Many Requests';
  }
  return 'Error';
};

