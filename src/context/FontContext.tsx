'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface FontContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontContext = createContext<FontContextType>({
  fontSize: 'medium',
  setFontSize: () => null,
});

interface FontProviderProps {
  children: ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  useEffect(() => {
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

export const useFont = () => useContext(FontContext);
