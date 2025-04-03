'use client';

import { useContext } from 'react';

import { SearchContext } from '@/context/SearchContext';

/**
 * Hook for accessing and using search functionality
 * @returns Search context with searchTerm, isSearchOpen, and open states and setters
 */
export function useSearch() {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }

  return {
    ...context,
    // Helper method to toggle search visibility
    toggleSearch: () => context.setIsSearchOpen(!context.isSearchOpen),
    // Helper method to clear search
    clearSearch: () => context.setSearchTerm(''),
  };
}
