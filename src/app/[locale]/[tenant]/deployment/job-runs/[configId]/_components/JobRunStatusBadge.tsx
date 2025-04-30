import React from 'react';

import { Badge } from '@/components/shadcn/badge';

interface JobRunStatusBadgeProps {
  status: string;
}

export function JobRunStatusBadge({ status }: JobRunStatusBadgeProps) {
  let variant:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'pending'
    | 'running' = 'default';

  switch (status) {
    case 'running':
    case 'in_progress':
      variant = 'running';
      break;
    case 'pending':
    case 'queued':
      variant = 'pending';
      break;
    case 'completed':
    case 'success':
      variant = 'success';
      break;
    case 'failed':
      variant = 'destructive';
      break;
    case 'cancelled':
      variant = 'warning';
      break;
    default:
      variant = 'secondary';
  }

  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');

  return (
    <Badge variant={variant} className="capitalize">
      {displayStatus}
    </Badge>
  );
}
