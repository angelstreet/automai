import React, { createContext, useContext, ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

// Toast configuration with predefined colors
const TOAST_COLORS = {
  error: '#ef4444', // Red
  warning: '#f97316', // Orange
  success: '#22c55e', // Green
  info: '#3b82f6', // Blue
} as const;

// Toast context interface
interface ToastContextType {
  showError: (message: string, options?: { duration?: number }) => void;
  showWarning: (message: string, options?: { duration?: number }) => void;
  showSuccess: (message: string, options?: { duration?: number }) => void;
  showInfo: (message: string, options?: { duration?: number }) => void;
}

// Create context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast provider component
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const showError = (message: string, options?: { duration?: number }) => {
    toast.error(message, {
      duration: options?.duration || 4000,
      style: {
        background: '#fef2f2',
        color: TOAST_COLORS.error,
        border: `1px solid ${TOAST_COLORS.error}`,
      },
      iconTheme: {
        primary: TOAST_COLORS.error,
        secondary: '#fef2f2',
      },
    });
  };

  const showWarning = (message: string, options?: { duration?: number }) => {
    toast(message, {
      duration: options?.duration || 4000,
      icon: '⚠️',
      style: {
        background: '#fffbeb',
        color: TOAST_COLORS.warning,
        border: `1px solid ${TOAST_COLORS.warning}`,
      },
    });
  };

  const showSuccess = (message: string, options?: { duration?: number }) => {
    toast.success(message, {
      duration: options?.duration || 3000,
      style: {
        background: '#f0fdf4',
        color: TOAST_COLORS.success,
        border: `1px solid ${TOAST_COLORS.success}`,
      },
      iconTheme: {
        primary: TOAST_COLORS.success,
        secondary: '#f0fdf4',
      },
    });
  };

  const showInfo = (message: string, options?: { duration?: number }) => {
    toast(message, {
      duration: options?.duration || 3000,
      icon: 'ℹ️',
      style: {
        background: '#eff6ff',
        color: TOAST_COLORS.info,
        border: `1px solid ${TOAST_COLORS.info}`,
      },
    });
  };

  const contextValue: ToastContextType = {
    showError,
    showWarning,
    showSuccess,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      />
    </ToastContext.Provider>
  );
};

// Custom hook to use toast context
export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
