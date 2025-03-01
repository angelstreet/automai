'use client';

import { toast as sonnerToast } from 'sonner';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export const toast = (props: ToastProps) => {
  const { title, description, variant } = props;
  
  if (variant === 'destructive') {
    return sonnerToast.error(title, {
      description,
    });
  }
  
  return sonnerToast.success(title, {
    description,
  });
};

export const useToast = () => {
  return {
    toast,
  };
}; 