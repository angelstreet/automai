'use client';

import React, { useState } from 'react';

import { SearchContext } from '@/context/SearchContext';
import { SearchContextType } from '@/types/context/searchContextType';

/**
 * SearchProvider component for managing search state
 * Use the useSearch hook from @/hooks to access this context
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [open, setOpen] = useState(false);

  // Create context value with proper memoization to prevent unnecessary re-renders
  const contextValue = React.useMemo<SearchContextType>(
    () => ({
      searchTerm,
      setSearchTerm,
      isSearchOpen,
      setIsSearchOpen,
      open,
      setOpen,
    }),
    [searchTerm, isSearchOpen, open],
  );

  return <SearchContext.Provider value={contextValue}>{children}</SearchContext.Provider>;
}
