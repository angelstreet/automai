/**
 * Search context type definitions
 */

export interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  open: boolean;
  setOpen: (isOpen: boolean) => void;
}
