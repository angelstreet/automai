'use client';

import { Building2, Factory, Code2 } from 'lucide-react';
import * as React from 'react';

import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

// Define team type for visual consistency
type VisualTeam = {
  id?: string;
  name: string;
  logo: React.ElementType;
  plan: string;
};

interface ActiveTeamClientProps {
  defaultCollapsed?: boolean;
  user: User | null;
  teams?: Team[];
  selectedTeam?: Team | null;
  onTeamSelect?: (teamId: string) => Promise<void>;
}

// Icons mapping for different subscription tiers
const tierIcons = {
  trial: Building2,
  pro: Factory,
  enterprise: Code2,
};

export default function ActiveTeamClient({
  defaultCollapsed = false,
  user,
  teams = [],
  selectedTeam = null,
  onTeamSelect: _onTeamSelect, // Rename to avoid unused parameter warning
}: ActiveTeamClientProps) {
  // If no user data yet, show a minimal loading state
  if (!user) {
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

  // Generate visual teams based on available teams
  const displayTeams = React.useMemo(() => {
    let teamsList: VisualTeam[] = [];

    // Default to showing all teams regardless of tenant type
    if (teams && teams.length > 0) {
      teamsList = teams.map((team) => ({
        id: team.id,
        name: team.name,
        logo: tierIcons.enterprise,
        plan: 'team',
      }));
    } else {
      // Fallback for no teams
      teamsList = [
        {
          name: 'Default Team',
          logo: tierIcons.trial,
          plan: 'default',
        },
      ];
    }

    return teamsList;
  }, [teams]);

  // Determine active team
  const activeTeam = React.useMemo(() => {
    if (displayTeams.length === 0) return null;

    if (selectedTeam) {
      const matchingTeam = displayTeams.find((t) => t.id === selectedTeam.id);
      return matchingTeam || displayTeams[0];
    }
    return displayTeams[0];
  }, [displayTeams, selectedTeam]);

  // If no active team determined, return null
  if (!activeTeam) return null;

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

  // Always show the active team display
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
