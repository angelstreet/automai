'use client';

import { Button } from '@/components/shadcn/button';
import { CommandSeparator } from '@/components/shadcn/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useSidebar } from '@/components/sidebar';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  PlusCircle,
  Settings,
  User as UserIcon,
  Building2,
  Factory,
  Code2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUser, useTeam } from '@/context';
import type { Team as TeamInterface } from '@/types/context/team';

// Define team type for visual consistency
type VisualTeam = {
  id?: string;
  name: string;
  logo: React.ElementType;
  plan: string;
};

interface TeamSwitcherClientProps {
  defaultCollapsed?: boolean;
  initialTeams?: TeamInterface[];
}

// Icons mapping for different subscription tiers
const tierIcons = {
  trial: Building2,
  pro: Factory,
  enterprise: Code2,
};

export default function TeamSwitcherClient({
  defaultCollapsed = false,
  initialTeams = [],
}: TeamSwitcherClientProps) {
  const { user } = useUser();
  const { teams, selectedTeam, selectTeam, fetchTeams } = useTeam();
  const [displayTeams, setDisplayTeams] = React.useState<VisualTeam[]>([]);
  const [activeTeam, setActiveTeam] = React.useState<VisualTeam | null>(null);
  
  // Fetch teams on mount
  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user, fetchTeams]);

  // Transform teams data for display
  useEffect(() => {
    if (!user) return;

    // Generate teams based on user's tier
    let teamsList: VisualTeam[] = [];
    
    if (user.tenant_name === 'trial') {
      // Trial: Always display "Trial" (hardcoded)
      teamsList = [{
        name: 'Trial',
        logo: tierIcons.trial,
        plan: 'trial',
      }];
    } else if (user.tenant_name === 'pro') {
      // Pro: Always display "Pro" (hardcoded)
      teamsList = [{
        id: teams.length > 0 ? teams[0].id : undefined,
        name: 'Pro',
        logo: tierIcons.pro,
        plan: 'pro',
      }];
    } else if (user.tenant_name === 'enterprise') {
      // Enterprise: Multiple selectable teams
      teamsList = teams.map(team => ({
        id: team.id,
        name: team.name,
        logo: tierIcons.enterprise,
        plan: 'enterprise',
      }));
    }
    
    // Set teams for display
    setDisplayTeams(teamsList);
    
    // Set active team
    if (teamsList.length > 0) {
      // If we have a selected team from context, use it
      if (selectedTeam) {
        const matchingTeam = teamsList.find(t => t.id === selectedTeam.id);
        if (matchingTeam) {
          setActiveTeam(matchingTeam);
        } else {
          setActiveTeam(teamsList[0]);
        }
      } else {
        setActiveTeam(teamsList[0]);
      }
    }
  }, [user, teams, selectedTeam]);

  // Handle team selection
  const handleTeamSelect = (team: VisualTeam) => {
    setActiveTeam(team);
    // Only select in context if team has ID and we're on enterprise tier
    if (team.id && user?.tenant_name === 'enterprise') {
      selectTeam(team.id);
    }
  };

  // If no active team yet, show loading state
  if (!activeTeam) {
    // Render collapsed view for SSR and initial mount
    if (defaultCollapsed) {
      return (
        <div className="flex items-center justify-center p-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
      );
    }
    
    // Default loading state
    return (
      <button className="flex w-full items-center justify-between rounded-lg border border-border p-2">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-medium">Loading...</span>
        </div>
      </button>
    );
  }

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
  if (user?.tenant_name !== 'enterprise' || displayTeams.length <= 1) {
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
                ? 'bg-accent text-accent-foreground' : '',
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