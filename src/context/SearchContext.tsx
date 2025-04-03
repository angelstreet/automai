'use client';

import { createContext } from 'react';

import { SearchContextType } from '@/types/context/searchContextType';

export const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  setSearchTerm: () => null,
  isSearchOpen: false,
  setIsSearchOpen: () => null,
  open: false,
  setOpen: () => null,
});
