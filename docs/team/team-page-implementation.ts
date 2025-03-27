// src/app/[locale]/[tenant]/team/page.tsx
import { Metadata } from 'next';
import TeamPageContent from './_components/TeamPageContent';

export const metadata: Metadata = {
  title: 'Team Management',
  description: 'Manage teams and team members',
};

// Server Component
export default function TeamPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage teams, members, and resource limits
        </p>
      </div>

      <TeamPageContent />
    </div>
  );
}

// src/app/[locale]/[tenant]/team/_components/TeamPageContent.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { TeamList } from './TeamList';
import { TeamMembers } from './TeamMembers'; 
import { ResourceLimits } from './ResourceLimits';

export default function TeamPageContent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <TeamList />
      </div>
      
      <div className="lg:col-span-2">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="resources">Resource Limits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="members" className="mt-6">
            <TeamMembers />
          </TabsContent>
          
          <TabsContent value="resources" className="mt-6">
            <ResourceLimits />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// src/components/layout/TeamSelector.tsx
'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Users } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/shadcn/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover';
import { cn } from '@/lib/utils';
import { useTeam } from '@/context';
import { useUser } from '@/context';

export default function TeamSelector() {
  const { user } = useUser();
  const { teams, selectedTeam, selectTeam } = useTeam();
  const [open, setOpen] = useState(false);

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
          className="justify-between min-w-[200px]"
        >
          <Users className="mr-2 h-4 w-4" />
          {selectedTeam ? selectedTeam.name : "Select team..."}
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
                  selectTeam(team.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedTeam?.id === team.id ? "opacity-100" : "opacity-0"
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