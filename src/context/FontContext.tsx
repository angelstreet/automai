'use client';

import { createContext } from 'react';
import { FontContextType } from '@/types/context/fontContextType';

export const FontContext = createContext<FontContextType>({
  fontSize: 'medium',
  setFontSize: () => null,
});
