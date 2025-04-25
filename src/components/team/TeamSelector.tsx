import { Team } from '@/types/context/teamContextType';
import { User } from '@/types/service/userServiceType';

import { TeamSelectorClient } from './TeamSelectorClient';

interface TeamSelectorProps {
  user?: User | null;
  teams?: Team[];
  activeTeam?: Team | null;
  setSelectedTeam?: (teamId: string) => Promise<void>;
}

export default function TeamSelector({
  user,
  teams = [],
  activeTeam,
  setSelectedTeam,
}: TeamSelectorProps) {
  console.log('[@component:TeamSelector] Rendering with:', {
    teamsLength: teams?.length || 0,
    activeTeam: activeTeam?.name || 'No active team',
    hasCallback: !!setSelectedTeam,
  });

  return (
    <TeamSelectorClient
      user={user || null}
      teams={teams || []}
      selectedTeam={activeTeam}
      onTeamSelect={setSelectedTeam}
    />
  );
}
