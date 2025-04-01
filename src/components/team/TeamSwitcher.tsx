import { Building2 } from 'lucide-react';
import { Suspense } from 'react';

import type { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';
import { useTeam } from '@/hooks/team/useTeam';

import TeamSwitcherClient from '@/components/team/TeamSwitcherClient';

interface TeamSwitcherProps {
  defaultCollapsed?: boolean;
  teams?: Team[];
  user?: User | null;
  activeTeam?: Team | null;
}

export function TeamSwitcher({
  defaultCollapsed = false,
  user,
  teams,
  activeTeam,
}: TeamSwitcherProps) {
  const { teams: contextTeams, activeTeam: contextActiveTeam, setSelectedTeam } = useTeam();

  // Use props if provided, otherwise use context
  const finalTeams = teams || contextTeams || [];
  const finalActiveTeam = activeTeam || contextActiveTeam;

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
      }
    >
      <TeamSwitcherClient
        defaultCollapsed={defaultCollapsed}
        user={user}
        teams={finalTeams}
        selectedTeam={finalActiveTeam}
        onTeamSelect={setSelectedTeam}
      />
    </Suspense>
  );
}
