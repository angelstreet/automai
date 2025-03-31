'use client';

import { RepositoryActions } from './client/RepositoryActions';

export function RepositoryActionsClient(props: React.ComponentProps<typeof RepositoryActions>) {
  return <RepositoryActions {...props} />;
}
