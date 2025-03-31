'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';

import { assignResourceToTeam } from '../../actions';

interface Repository {
  id: string;
  name: string;
  provider_type: string;
  owner: string;
  url: string;
}

export function UnassignedResourcesList({
  repositories,
  teamId,
  teamName,
}: {
  repositories: Repository[];
  teamId: string | null;
  teamName?: string;
}) {
  const router = useRouter();
  const [isAssigning, setIsAssigning] = useState<Record<string, boolean>>({});
  const [assignedRepos, setAssignedRepos] = useState<Record<string, boolean>>({});

  const displayTeamName = teamName || 'Your Team';

  if (!teamId) {
    return (
      <div className="p-4 bg-muted rounded-md">
        <p>You need to be part of a team before you can assign repositories.</p>
      </div>
    );
  }

  const handleAssign = async (repo: Repository) => {
    if (assignedRepos[repo.id] || !teamId) return;

    try {
      setIsAssigning((prev) => ({ ...prev, [repo.id]: true }));

      await assignResourceToTeam(repo.id, 'repository', teamId);

      setAssignedRepos((prev) => ({ ...prev, [repo.id]: true }));
      setIsAssigning((prev) => ({ ...prev, [repo.id]: false }));

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error assigning repository:', error);
      setIsAssigning((prev) => ({ ...prev, [repo.id]: false }));
    }
  };

  // Filter out already assigned repositories
  const unassignedRepos = repositories.filter((repo) => !assignedRepos[repo.id]);

  if (unassignedRepos.length === 0) {
    return (
      <div className="p-4 bg-muted rounded-md">
        <p>All repositories have been assigned to teams.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {unassignedRepos.map((repo) => (
        <div
          key={repo.id}
          className="flex justify-between items-center p-4 bg-card border rounded-md"
        >
          <div className="overflow-hidden">
            <p className="font-medium truncate">{repo.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {repo.provider_type} - {repo.owner}
            </p>
            <p className="text-xs text-muted-foreground truncate">{repo.url}</p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAssign(repo)}
            disabled={isAssigning[repo.id] || assignedRepos[repo.id]}
            className="ml-4 whitespace-nowrap"
          >
            {isAssigning[repo.id] ? 'Assigning...' : `Assign to ${displayTeamName}`}
          </Button>
        </div>
      ))}
    </div>
  );
}
