import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/Shadcn/command';
import { useSearch } from '@/context/SearchContext';

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

const useCommandMenu = () => {
  // Move shared logic here
  return {};
};

export function CommandMenu() {
  const router = useRouter();
  const { open, setOpen } = useSearch();

  const runCommand = React.useCallback(
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
