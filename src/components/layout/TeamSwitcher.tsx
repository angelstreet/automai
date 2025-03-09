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
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface TeamSwitcherProps {
  teams?: {
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
}

// Default teams if none provided
const defaultTeams = [
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

export function TeamSwitcher({ teams = defaultTeams }: TeamSwitcherProps) {
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);
  const { open } = useSidebar();
  const { user } = useAuth();
  const Icon = activeTeam.logo;
  const isCollapsed = !open;

  if (!user) return null;
  
  // Show different UI based on sidebar state
  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">{activeTeam.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="right" forceMount>
        <DropdownMenuLabel>Switch team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.name}
            onClick={() => setActiveTeam(team)}
            className={cn(
              "cursor-pointer",
              team.name === activeTeam.name ? "bg-accent text-accent-foreground" : ""
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
}
