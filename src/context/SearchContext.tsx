'use client';

import React, { createContext, useContext } from 'react';

/**
 * Search context type definition
 * DEPRECATED: This should be moved to hooks/search/useSearch.ts in the future
 */
export interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  open: boolean;
  setOpen: (isOpen: boolean) => void;
}

/**
 * Search context with default values
 * DEPRECATED: In the future, only the context definition will remain here
 */
export const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => null,
  isSearchOpen: false,
  setIsSearchOpen: () => null,
  open: false,
  setOpen: () => null,
});

/**
 * DEPRECATED: This provider should be moved to app/providers/SearchProvider.tsx
 * This will be kept temporarily for backward compatibility
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  return (
    <SearchContext.Provider
      value={{ searchTerm, setSearchTerm, isSearchOpen, setIsSearchOpen, open, setOpen }}
    >
      {children}
    </SearchContext.Provider>
  );
}

/**
 * DEPRECATED: This hook should be moved to hooks/search/useSearch.ts
 * Use import { useSearch } from '@/hooks' in the future
 */
export const useSearch = () => useContext(SearchContext);
