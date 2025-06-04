'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const ValidationEvents = {
  OPEN_PREVIEW: 'VALIDATION_OPEN_PREVIEW',
  START_VALIDATION: 'VALIDATION_START',
  VALIDATION_COMPLETE: 'VALIDATION_COMPLETE',
  EXPORT_REPORT: 'VALIDATION_EXPORT_REPORT',
};

export default function ValidationEventListener() {
  const router = useRouter();

  useEffect(() => {
    const handleValidationComplete = () => {
      console.log('[@component:ValidationEventListener] Validation completed, refreshing route');
      router.refresh();
    };

    window.addEventListener(ValidationEvents.VALIDATION_COMPLETE, handleValidationComplete);
    
    return () => {
      window.removeEventListener(ValidationEvents.VALIDATION_COMPLETE, handleValidationComplete);
    };
  }, [router]);

  return null;
} 