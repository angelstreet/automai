'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Users } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { cn } from '@/lib/utils';
import { useUser } from '@/context';

export default function TeamSelector() {
  const { user, teams, selectedTeam, setSelectedTeam, refreshUser } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && user.tenant_name === 'enterprise') {
      refreshUser();
    }
  }, [user, refreshUser]);

  // Only show for enterprise users with multiple teams
  if (!user || user.tenant_name !== 'enterprise' || teams.length <= 1) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full"
        >
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span className="truncate">{selectedTeam ? selectedTeam.name : 'Select team...'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[200px]">
        <Command>
          <CommandInput placeholder="Search team..." />
          <CommandEmpty>No team found.</CommandEmpty>
          <CommandGroup>
            {teams.map((team) => (
              <CommandItem
                key={team.id}
                value={team.name}
                onSelect={() => {
                  setSelectedTeam(team.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedTeam?.id === team.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {team.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
