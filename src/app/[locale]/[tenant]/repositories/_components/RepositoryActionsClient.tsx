'use client';

import { RepositoryHeader } from './RepositoryHeader';
import { RepositoryActions } from './client/RepositoryActions';

interface RepositoryActionsClientProps {
  repositoryCount?: number;
}

export function RepositoryActionsClient({ repositoryCount = 0 }: RepositoryActionsClientProps) {
  return (
    <div className="flex items-center gap-4">
      <RepositoryHeader repositoryCount={repositoryCount} />
      <RepositoryActions repositoryCount={repositoryCount} />
    </div>
  );
}
