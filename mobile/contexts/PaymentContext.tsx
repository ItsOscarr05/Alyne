import React, { createContext, useContext, useState, useCallback } from 'react';

interface PaymentContextType {
  isProcessing: boolean;
  currentBookingId: string | null;
  startPayment: (bookingId: string) => boolean;
  endPayment: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState<string | null>(null);

  const startPayment = useCallback((bookingId: string): boolean => {
    if (isProcessing) {
      return false; // Payment already in progress
    }
    setIsProcessing(true);
    setCurrentBookingId(bookingId);
    return true;
  }, [isProcessing]);

  const endPayment = useCallback(() => {
    setIsProcessing(false);
    setCurrentBookingId(null);
  }, []);

  return (
    <PaymentContext.Provider
      value={{
        isProcessing,
        currentBookingId,
        startPayment,
        endPayment,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePaymentContext() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePaymentContext must be used within a PaymentProvider');
  }
  return context;
}

