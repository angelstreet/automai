'use client';

import { toast } from 'sonner';

export { toast };
export const useToast = () => {
  return {
    toast,
  };
}; 