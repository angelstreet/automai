import { useToastContext } from '../contexts/ToastContext';

/**
 * Custom hook for toast notifications
 * Provides easy access to toast functions with predefined colors:
 * - Error: Red (#ef4444)
 * - Warning: Orange (#f97316)
 * - Success: Green (#22c55e)
 * - Info: Blue (#3b82f6)
 */
export const useToast = () => {
  return useToastContext();
};

export default useToast;
