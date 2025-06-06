'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const ValidationEvents = {
  OPEN_PREVIEW: 'VALIDATION_OPEN_PREVIEW',
  START_VALIDATION: 'VALIDATION_START',
  VALIDATION_COMPLETE: 'VALIDATION_COMPLETE',
  EXPORT_REPORT: 'VALIDATION_EXPORT_REPORT',
};

export default function ValidationEventListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleValidationComplete = () => {
      console.log('[@component:ValidationEventListener] Validation completed, refreshing route');
      // In React Router, we can navigate to current location to refresh
      window.location.reload();
    };

    window.addEventListener(ValidationEvents.VALIDATION_COMPLETE, handleValidationComplete);
    
    return () => {
      window.removeEventListener(ValidationEvents.VALIDATION_COMPLETE, handleValidationComplete);
    };
  }, [navigate]);

  return null;
} 