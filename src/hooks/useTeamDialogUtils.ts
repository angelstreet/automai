'use client';

import { useState } from 'react';
import { useToast } from '@/components/shadcn/use-toast';

/**
 * Common hook for dialog loading and error handling
 * Provides standardized methods for dialog operations
 */
export function useDialogState() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Execute an async operation with loading state and error handling
   * @param operation The async function to execute
   * @param successMessage Message to show on success
   * @param onSuccess Optional callback to run on success
   */
  const executeOperation = async <T>(
    operation: () => Promise<T>,
    successMessage?: string,
    onSuccess?: (result: T) => void
  ) => {
    setIsLoading(true);
    
    try {
      const result = await operation();
      
      if (successMessage) {
        toast({
          title: 'Success',
          description: successMessage,
        });
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Show an error toast with validation message
   * @param message Error message to display
   */
  const showValidationError = (message: string) => {
    toast({
      title: 'Validation Error',
      description: message,
      variant: 'destructive',
    });
  };

  return {
    isLoading,
    setIsLoading,
    executeOperation,
    showValidationError,
  };
}