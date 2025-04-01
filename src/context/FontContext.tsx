'use client';

import React, { createContext, useContext } from 'react';

/**
 * Font size options
 */
export type FontSize = 'small' | 'medium' | 'large';

/**
 * Font context type definition
 * DEPRECATED: This will be moved to hooks/font/useFont.ts in the future
 */
export interface FontContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

/**
 * Font context with default values
 * DEPRECATED: In the future, only the context definition will remain here
 */
export const FontContext = createContext<FontContextType>({
  fontSize: 'medium',
  setFontSize: () => null,
});

/**
 * DEPRECATED: This provider should be moved to app/providers/FontProvider.tsx
 * This will be kept temporarily for backward compatibility
 */
export function FontProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = React.useState<FontSize>('medium');

  React.useEffect(() => {
    // Apply font size to document
    const savedFontSize = localStorage.getItem('fontSize') as FontSize;
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }

    // Apply font size class to document
    document.documentElement.dataset.fontSize = fontSize;
  }, [fontSize]);

  const handleSetFontSize = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('fontSize', size);
    document.documentElement.dataset.fontSize = size;
  };

  return (
    <FontContext.Provider value={{ fontSize, setFontSize: handleSetFontSize }}>
      {children}
    </FontContext.Provider>
  );
}

/**
 * DEPRECATED: This hook should be moved to hooks/font/useFont.ts
 * Use import { useFont } from '@/hooks' in the future
 */
export const useFont = () => useContext(FontContext);
