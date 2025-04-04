'use client';

import { useState, useEffect } from 'react';

type ViewMode = 'grid' | 'table';

/**
 * Custom hook for managing the view mode of the hosts list
 * Persists the view mode selection in localStorage
 */
export function useHostViewMode() {
  // Get initial mode from localStorage or default to 'grid'
  // Use a function initializer to avoid localStorage access during SSR
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (localStorage.getItem('hostViewMode') as ViewMode) || 'grid';
  });

  // Update localStorage when viewMode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hostViewMode', viewMode);
    }
  }, [viewMode]);

  // Toggle view mode function
  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'table' : 'grid');
  };

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
  };
}
