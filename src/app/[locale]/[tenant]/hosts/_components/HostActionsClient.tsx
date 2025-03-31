'use client';

import { HostActions } from './client/HostActions';

export function HostActionsClient(props: React.ComponentProps<typeof HostActions>) {
  return <HostActions {...props} />;
}
