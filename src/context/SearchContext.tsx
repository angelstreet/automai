'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => null,
  isSearchOpen: false,
  setIsSearchOpen: () => null,
});

interface SearchProviderProps {
  children: ReactNode;
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <SearchContext.Provider value={{ searchTerm, setSearchTerm, isSearchOpen, setIsSearchOpen }}>
      {children}
    </SearchContext.Provider>
  );
}

export const useSearch = () => useContext(SearchContext); 