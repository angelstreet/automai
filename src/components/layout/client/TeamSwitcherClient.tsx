'use client';

import { ChevronDown, Building2, Factory, Code2 } from 'lucide-react';
import * as React from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useUser } from '@/context';
import { cn } from '@/lib/utils';
import type { User } from '@/types/user';

// Define team type for visual consistency
type VisualTeam = {
  id?: string;
  name: string;
  logo: React.ElementType;
  plan: string;
};

interface TeamSwitcherClientProps {
  defaultCollapsed?: boolean;
  initialUser?: User | null;
}

// Icons mapping for different subscription tiers
const tierIcons = {
  trial: Building2,
  pro: Factory,
  enterprise: Code2,
};

export default function TeamSwitcherClient({
  defaultCollapsed = false,
  initialUser,
}: TeamSwitcherClientProps) {
  const { user, teams, selectedTeam, setSelectedTeam } = useUser();
  const currentUser = initialUser || user;
  
  // If no user data yet, show a minimal loading state
  if (!currentUser) {
    if (defaultCollapsed) {
      return (
        <div className="flex items-center justify-center p-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
      );
    }
    return null;
  }
  
  // Generate visual teams based on user's tier
  const displayTeams = React.useMemo(() => {
    let teamsList: VisualTeam[] = [];
    
    if (currentUser.tenant_name === 'trial') {
      teamsList = [
        {
          name: 'Trial',
          logo: tierIcons.trial,
          plan: 'trial',
        },
      ];
    } else if (currentUser.tenant_name === 'pro') {
      teamsList = [
        {
          id: teams.length > 0 ? teams[0].id : undefined,
          name: 'Pro',
          logo: tierIcons.pro,
          plan: 'pro',
        },
      ];
    } else if (currentUser.tenant_name === 'enterprise') {
      teamsList = teams.map((team) => ({
        id: team.id,
        name: team.name,
        logo: tierIcons.enterprise,
        plan: 'enterprise',
      }));
    }
    return teamsList;
  }, [currentUser.tenant_name, teams]);
  
  // Determine active team
  const activeTeam = React.useMemo(() => {
    if (displayTeams.length === 0) return null;
    
    if (selectedTeam && currentUser.tenant_name === 'enterprise') {
      const matchingTeam = displayTeams.find((t) => t.id === selectedTeam.id);
      return matchingTeam || displayTeams[0];
    }
    return displayTeams[0];
  }, [displayTeams, selectedTeam, currentUser.tenant_name]);
  
  // If no active team determined, return null
  if (!activeTeam) return null;
  
  // Handle team selection
  const handleTeamSelect = (team: VisualTeam) => {
    // Only select in context if team has ID and we're on enterprise tier
    if (team.id && currentUser.tenant_name === 'enterprise') {
      setSelectedTeam(team.id);
    }
  };
  
  const Icon = activeTeam.logo;
  
  // Render collapsed view for SSR and initial mount
  if (defaultCollapsed) {
    return (
      <div className="flex items-center justify-center p-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    );
  }
  
  // For trial and pro, or when there's only one team, don't show dropdown
  if (currentUser.tenant_name !== 'enterprise' || displayTeams.length <= 1) {
    return (
      <button className="flex w-full items-center justify-between rounded-lg border border-border p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium">{activeTeam.name}</span>
        </div>
      </button>
    );
  }
  
  // For enterprise with multiple teams, show dropdown
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
        {displayTeams.map((team) => (
          <DropdownMenuItem
            key={team.id || team.name}
            onClick={() => handleTeamSelect(team)}
            className={cn(
              'cursor-pointer',
              (activeTeam && team.id === activeTeam.id) ||
                (!team.id && !activeTeam.id && team.name === activeTeam.name)
                ? 'bg-accent text-accent-foreground'
                : '',
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-background mr-2">
              <team.logo className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium leading-none">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.plan}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
