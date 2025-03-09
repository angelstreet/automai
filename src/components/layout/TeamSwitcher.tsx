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
  const { isOpen } = useSidebar();
  const { user } = useAuth();
  const Icon = activeTeam.logo;
  const isCollapsed = !isOpen;

  if (!user) return null;

  return isCollapsed ? (
    <SidebarMenu>
      <SidebarMenuButton>
        <Icon className="h-4 w-4" />
      </SidebarMenuButton>
      {teams.map((team) => (
        <SidebarMenuItem
          key={team.name}
          onClick={() => setActiveTeam(team)}
          className={team.name === activeTeam.name ? "bg-accent" : ""}
        >
          {team.logo && <team.logo className="h-4 w-4" />}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
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
          >
            <team.logo className="mr-2 h-4 w-4" />
            <span>{team.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
