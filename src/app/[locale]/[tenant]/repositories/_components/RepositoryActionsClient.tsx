'use client';

import { RepositoryHeader } from './RepositoryHeader';
import { RepositoryActions } from './client/RepositoryActions';

interface RepositoryActionsClientProps extends React.ComponentProps<typeof RepositoryActions> {
  repositoryCount?: number;
}

export function RepositoryActionsClient({
  repositoryCount = 0,
  ...props
}: RepositoryActionsClientProps) {
  return (
    <div className="flex items-center gap-4">
      <RepositoryHeader repositoryCount={repositoryCount} />
      <RepositoryActions {...props} />
    </div>
  );
}
