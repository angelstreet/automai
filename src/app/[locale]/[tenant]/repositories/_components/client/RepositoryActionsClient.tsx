'use client';

import { RepositoryActions } from './RepositoryActions';
import { RepositoryHeaderClient } from './RepositoryHeaderClient';

interface RepositoryActionsClientProps {
  repositoryCount?: number;
}

export function RepositoryActionsClient({ repositoryCount = 0 }: RepositoryActionsClientProps) {
  return (
    <div className="flex items-center gap-4">
      <RepositoryHeaderClient repositoryCount={repositoryCount} />
      <RepositoryActions repositoryCount={repositoryCount} />
    </div>
  );
}
