'use client';

import { useState } from 'react';
import { useTeam } from '@/context';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { PlusIcon, UserIcon, UsersIcon } from 'lucide-react';
import CreateTeamDialog from './CreateTeamDialog';

export default function TeamList() {
  const { teams, selectedTeam, selectTeam, loading, error } = useTeam();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (loading) {
    return <div>Loading teams...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Teams</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" /> New Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center p-8">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No teams found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a team to better organize your resources.
          </p>
          <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
            Create Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`cursor-pointer ${selectedTeam?.id === team.id ? 'border-primary' : ''}`}
              onClick={() => selectTeam(team.id)}
            >
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.is_default ? 'Default Team' : ''}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{team.description || 'No description provided'}</p>
              </CardContent>
              <CardFooter>
                <div className="flex items-center text-sm text-gray-500">
                  <UserIcon className="mr-1 h-4 w-4" />
                  <span>Members</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CreateTeamDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
