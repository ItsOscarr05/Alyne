import { useState, useCallback } from 'react';
import { isNetworkError, getUserFriendlyError, getErrorTitle } from '../utils/errorMessages';

/**
 * Hook for handling network errors with a modal
 * Returns functions to show network error modals and check for network errors
 */
export const useNetworkError = () => {
  const [networkErrorModal, setNetworkErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onRetry?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showNetworkError = useCallback((error: any, onRetry?: () => void) => {
    if (isNetworkError(error)) {
      setNetworkErrorModal({
        visible: true,
        title: getErrorTitle(error),
        message: getUserFriendlyError(error),
        onRetry,
      });
      return true;
    }
    return false;
  }, []);

  const hideNetworkError = useCallback(() => {
    setNetworkErrorModal({
      visible: false,
      title: '',
      message: '',
    });
  }, []);

  return {
    networkErrorModal,
    showNetworkError,
    hideNetworkError,
    isNetworkError,
  };
};

