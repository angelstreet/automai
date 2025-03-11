'use client';

import { ChevronDown, Code2, Building2, Factory } from 'lucide-react';
import * as React from 'react';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

// Define team type for consistency
type Team = {
  name: string;
  logo: React.ElementType;
  plan: string;
};

interface TeamSwitcherProps {
  teams?: Team[];
}

// Default teams if none provided
const defaultTeams: Team[] = [
  {
    name: 'Acme Inc',
    logo: Building2,
    plan: 'free',
  },
  {
    name: 'Monsters Inc',
    logo: Factory,
    plan: 'pro',
  },
  {
    name: 'Devs Inc',
    logo: Code2,
    plan: 'enterprise',
  },
];

// Wrap the component with React.memo to prevent unnecessary re-renders
const TeamSwitcher = React.memo(function TeamSwitcher({ teams = defaultTeams }: TeamSwitcherProps) {
  const { open } = useSidebar();
  const { role } = useUser();
  const isCollapsed = !open;

  // Simply use the teams passed as props or the default teams
  const teamsToDisplay = teams || defaultTeams;

  // Set active team
  const [activeTeam, setActiveTeam] = React.useState<Team>(teamsToDisplay[0]);
  const Icon = activeTeam.logo;

  // We don't need any auth check - just always display the component

  // Show different UI based on sidebar state
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center p-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border border-border p-2 hover:bg-accent transition-colors">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium">{activeTeam.name}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="right" forceMount>
        <DropdownMenuLabel>Switch team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teamsToDisplay.map((team: Team) => (
          <DropdownMenuItem
            key={team.name}
            onClick={() => setActiveTeam(team)}
            className={cn(
              'cursor-pointer',
              team.name === activeTeam.name ? 'bg-accent text-accent-foreground' : '',
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background mr-2">
              <team.logo className="h-4 w-4" />
            </div>
            <span>{team.name}</span>
            {team.plan && (
              <span className="ml-auto text-xs text-muted-foreground">{team.plan}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// Export the memoized component
export { TeamSwitcher };
