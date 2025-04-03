'use client';

import React, { useState, useEffect, useMemo } from 'react';

import { FontContext } from '@/context/FontContext';
import { FontSize } from '@/types/context/fontContextType';

/**
 * FontProvider component for managing font size preferences
 * Use the useFont hook from @/hooks to access this context
 */
export function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');

  useEffect(() => {
    // Apply font size to document
    const savedFontSize = localStorage.getItem('fontSize') as FontSize;
    if (savedFontSize) {
      setFontSizeState(savedFontSize);
    }

    // Apply font size class to document
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.dataset.fontSize = size;
  };

  // Create memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      fontSize,
      setFontSize,
    }),
    [fontSize],
  );

  return <FontContext.Provider value={contextValue}>{children}</FontContext.Provider>;
}
