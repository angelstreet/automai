'use client';

import { useContext } from 'react';

import { FontContext } from '@/context/FontContext';
import { FontSize } from '@/types/context/fontContextType';

/**
 * Hook for accessing and using font size functionality
 * @returns Font context with fontSize state and setter
 */
export function useFont() {
  const context = useContext(FontContext);

  if (!context) {
    throw new Error('useFont must be used within a FontProvider');
  }

  const { fontSize, setFontSize } = context;

  return {
    fontSize,
    setFontSize,
    // Helper method to cycle through font sizes
    cycleFontSize: () => {
      const sizes: FontSize[] = ['small', 'medium', 'large'];
      const currentIndex = sizes.indexOf(fontSize);
      const nextIndex = (currentIndex + 1) % sizes.length;
      setFontSize(sizes[nextIndex]);
    },
    // Convenience methods
    isSmall: fontSize === 'small',
    isMedium: fontSize === 'medium',
    isLarge: fontSize === 'large',
  };
}
