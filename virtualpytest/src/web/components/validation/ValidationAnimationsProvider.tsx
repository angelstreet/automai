import React, { useEffect } from 'react';

import { getAnimationCSS } from '../config/validationColors';

export const ValidationAnimationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

    return () => {
      // Clean up on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  return <>{children}</>;
};
