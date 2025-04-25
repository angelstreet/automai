'use client';

import { Handshake, Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { setUserActiveTeam } from '@/app/actions/teamAction';
import { Button } from '@/components/shadcn/button';
import { Command, CommandGroup } from '@/components/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { cn } from '@/lib/utils';
import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

interface TeamSelectorClientProps {
  user: User | null;
  teams?: Team[];
  selectedTeam?: Team | null;
  onTeamSelect?: (teamId: string) => Promise<void>; // Optional callback for after team selection
}

export function TeamSelectorClient({
  user,
  teams = [],
  selectedTeam = null,
  onTeamSelect,
}: TeamSelectorClientProps) {
  const [open, setOpen] = useState(false);

  // Only show when user exists and there are multiple teams
  if (!user || teams.length <= 1) {
    return null;
  }

  const handleTeamSelect = async (teamId: string) => {
    if (!user.id) return;

    try {
      console.log(`[@component:TeamSelectorClient] Selecting team: ${teamId}`);
      // Directly call the server action to change the active team
      await setUserActiveTeam(user.id, teamId);

      // Optionally call the provided callback
      if (onTeamSelect) {
        await onTeamSelect(teamId);
      } else {
        // If no callback is provided, refresh the page to show the new team
        window.location.reload();
      }
    } catch (error) {
      console.error('[@component:TeamSelectorClient] Failed to set active team:', error);
    } finally {
      setOpen(false);
    }
  };

  return (
    <div className="p-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between w-full"
          >
            <div className="flex items-center">
              <Handshake className="mr-2 h-4 w-4" />
              <span className="truncate">
                {selectedTeam ? selectedTeam.name : 'Select team...'}
              </span>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[240px]">
          <Command>
            <CommandGroup>
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleTeamSelect(team.id)}
                >
                  {team.name}
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4',
                      selectedTeam?.id === team.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </div>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
