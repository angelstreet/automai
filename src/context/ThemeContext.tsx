'use client';

import { createContext } from 'react';

import { ThemeContextType } from '@/types/context/themeContextType';

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => null,
});
