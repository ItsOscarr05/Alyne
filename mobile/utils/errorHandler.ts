/**
 * Centralized error handling utilities
 * Provides consistent error handling across the app
 */

import { isNetworkError, getUserFriendlyError, getErrorTitle } from './errorMessages';
import { logger } from './logger';

export interface ErrorHandlerOptions {
  onRetry?: () => void;
  on401?: () => void;
  showModal?: (title: string, message: string, onRetry?: () => void) => void;
  showAlert?: (title: string, message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
  logError?: boolean;
}

/**
 * Handle API errors with consistent user feedback
 * Returns true if error was handled, false otherwise
 */
export const handleApiError = (
  error: any,
  options: ErrorHandlerOptions = {}
): boolean => {
  const {
    onRetry,
    on401,
    showModal,
    showAlert,
    logError = true,
  } = options;

  if (logError) {
    logger.error('API Error', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      isNetworkError: isNetworkError(error),
    });
  }

  // Handle 401 Unauthorized - redirect to login
  if (error?.response?.status === 401) {
    logger.warn('Unauthorized access detected');
    if (on401) {
      on401();
    } else if (showAlert) {
      showAlert(
        'Session Expired',
        'Your session has expired. Please log in again.'
      );
    }
    return true;
  }

  // Handle network errors with retry option
  if (isNetworkError(error)) {
    const title = getErrorTitle(error);
    const message = getUserFriendlyError(error);
    
    if (showModal && onRetry) {
      showModal(title, message, onRetry);
    } else if (showAlert) {
      showAlert(title, message, 'error');
    }
    return true;
  }

  // Handle other API errors
  const title = getErrorTitle(error);
  const message = getUserFriendlyError(error);
  
  if (showAlert) {
    showAlert(title, message, 'error');
  }
  
  return true;
};

/**
 * Create a retry wrapper for async functions
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 401, 403, 404, or non-network errors
      if (
        error?.response?.status === 401 ||
        error?.response?.status === 403 ||
        error?.response?.status === 404 ||
        !isNetworkError(error)
      ) {
        throw error;
      }
      
      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        logger.debug(`Retry attempt ${attempt + 1} of ${maxRetries}`);
      }
    }
  }
  
  throw lastError;
};
