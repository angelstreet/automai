'use client';

import { IconArrowRightDashed, IconDeviceLaptop, IconMoon, IconSun } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import React from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/shadcn/command';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { sidebarData } from '@/components/layout/data/sidebarData';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  roles?: string[];
  items?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function CommandMenu() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
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
        <ScrollArea type="hover" className="h-72 pr-1">
          <CommandEmpty>No results found.</CommandEmpty>
          {sidebarData.navGroups
            .flatMap((group) => group.items)
            .map((navItem: NavItem, i: number) => {
              if (navItem.href)
                return (
                  <CommandItem
                    key={`${navItem.href}-${i}`}
                    value={navItem.title}
                    onSelect={() => {
                      runCommand(() => navigate({ to: navItem.href }));
                    }}
                  >
                    <div className="mr-2 flex h-4 w-4 items-center justify-center">
                      <IconArrowRightDashed className="size-2 text-muted-foreground/80" />
                    </div>
                    {navItem.title}
                  </CommandItem>
                );

              return navItem.items?.map((subItem: NavItem, i: number) => (
                <CommandItem
                  key={`${subItem.href}-${i}`}
                  value={subItem.title}
                  onSelect={() => {
                    runCommand(() => navigate({ to: subItem.href }));
                  }}
                >
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <IconArrowRightDashed className="size-2 text-muted-foreground/80" />
                  </div>
                  {subItem.title}
                </CommandItem>
              ));
            })}
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
              <IconSun /> <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
              <IconMoon className="scale-90" />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
              <IconDeviceLaptop />
              <span>System</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  );
}
