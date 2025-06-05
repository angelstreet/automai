import React, { useEffect } from 'react';
import { getAnimationCSS } from '../../../config/validationColors';
import { useValidationColors } from '../../hooks/useValidationColors';

export const ValidationAnimationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initializeFromLastResults } = useValidationColors('default');

  useEffect(() => {
    // Inject CSS animations
    const styleId = 'validation-animations';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = getAnimationCSS();
    
    // Initialize validation colors from last results
    initializeFromLastResults();
    
    return () => {
      // Clean up on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [initializeFromLastResults]);

  return <>{children}</>;
}; 