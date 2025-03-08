'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import { Search } from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/shadcn/command';

// Navigation data for the command menu
const navigation = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', url: '/dashboard' },
      { title: 'Projects', url: '/projects' },
      { title: 'Test Cases', url: '/test-cases' },
      { title: 'Reports', url: '/reports' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { title: 'Profile', url: '/profile' },
      { title: 'Settings', url: '/settings' },
    ],
  },
];

interface SearchContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

/**
 * Internal CommandMenu component used exclusively by the SearchProvider
 */
function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter();

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navigation.map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {group.items.map((item) => (
              <CommandItem
                key={item.url}
                value={item.title}
                onSelect={() => {
                  runCommand(() => router.push(item.url));
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function SearchProvider({ children }: Props) {
  const [open, setOpen] = useState(false);

  useHotkeys('ctrl+k, cmd+k', (e: KeyboardEvent) => {
    e.preventDefault();
    setOpen((open) => !open);
  });

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandMenu open={open} setOpen={setOpen} />
    </SearchContext.Provider>
  );
}
