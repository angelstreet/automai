import React, { useEffect } from 'react';
import { getAnimationCSS } from '../../../config/validationColors';

interface ValidationAnimationsProviderProps {
  children: React.ReactNode;
}

export const ValidationAnimationsProvider: React.FC<ValidationAnimationsProviderProps> = ({ children }) => {
  useEffect(() => {
    console.log('[@component:ValidationAnimationsProvider] Injecting validation animation styles');
    
    // Create or update the style element for validation animations
    let styleElement = document.getElementById('validation-animations-styles');
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'validation-animations-styles';
      document.head.appendChild(styleElement);
    }
    
    // Inject the CSS
    styleElement.textContent = getAnimationCSS();
    
    // Cleanup function
    return () => {
      console.log('[@component:ValidationAnimationsProvider] Cleaning up validation animation styles');
      const element = document.getElementById('validation-animations-styles');
      if (element) {
        element.remove();
      }
    };
  }, []);

  return <>{children}</>;
}; 