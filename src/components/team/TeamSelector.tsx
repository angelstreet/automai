import { TeamSelectorClient } from './TeamSelectorClient';
import { useTeam } from '@/hooks/team/useTeam';

interface TeamSelectorProps {
  user?: any;
  teams?: any[];
  activeTeam?: any;
}

export default function TeamSelector({ user, teams, activeTeam }: TeamSelectorProps) {
  const { setSelectedTeam } = useTeam();

  return (
    <TeamSelectorClient
      user={user}
      teams={teams}
      selectedTeam={activeTeam}
      onTeamSelect={setSelectedTeam}
    />
  );
}
