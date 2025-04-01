import { TeamSelectorClient } from './TeamSelectorClient';

interface TeamSelectorProps {
  user?: any;
  teams?: any[];
  activeTeam?: any;
  setSelectedTeam?: (teamId: string) => Promise<void>;
}

export default function TeamSelector({
  user,
  teams,
  activeTeam,
  setSelectedTeam,
}: TeamSelectorProps) {
  return (
    <TeamSelectorClient
      user={user}
      teams={teams}
      selectedTeam={activeTeam}
      onTeamSelect={setSelectedTeam}
    />
  );
}
