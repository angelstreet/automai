import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeam } from '@/context/TeamContext';
import { Loader2 } from 'lucide-react';

export function TeamSelector() {
  const { teams, activeTeam, switchTeam, loading } = useTeam();

  const handleTeamChange = async (teamId: string) => {
    await switchTeam(teamId);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading teams...</span>
      </div>
    );
  }

  if (!teams.length) {
    return <div className="p-2 text-sm text-muted-foreground">No teams available</div>;
  }

  return (
    <Select value={activeTeam?.id} onValueChange={handleTeamChange} disabled={loading}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select team" />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
