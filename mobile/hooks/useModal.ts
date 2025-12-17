import { useState, useCallback } from 'react';

interface AlertOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  buttonText?: string;
  onButtonPress?: () => void;
}

interface ConfirmOptions {
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function useModal() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertOptions(options);
    setAlertVisible(true);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmOptions(options);
    setConfirmVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertVisible(false);
    setAlertOptions(null);
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmVisible(false);
    setConfirmOptions(null);
  }, []);

  return {
    alertVisible,
    confirmVisible,
    alertOptions,
    confirmOptions,
    showAlert,
    showConfirm,
    hideAlert,
    hideConfirm,
  };
}

