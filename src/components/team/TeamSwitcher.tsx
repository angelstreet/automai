import { Building2 } from 'lucide-react';
import { Suspense } from 'react';

import type { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import TeamSwitcherClient from '@/components/team/TeamSwitcherClient';

interface TeamSwitcherProps {
  defaultCollapsed?: boolean;
  teams?: Team[];
  user?: User | null;
  activeTeam?: Team | null;
  setSelectedTeam?: (teamId: string) => Promise<void>;
}

export function TeamSwitcher({
  defaultCollapsed = false,
  user,
  teams = [],
  activeTeam = null,
  setSelectedTeam,
}: TeamSwitcherProps) {
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
        teams={teams}
        selectedTeam={activeTeam}
        onTeamSelect={setSelectedTeam}
      />
    </Suspense>
  );
}
