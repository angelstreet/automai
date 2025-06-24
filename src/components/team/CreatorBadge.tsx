import React from 'react';

import { Badge } from '@/components/shadcn/badge';
import { useUser } from '@/hooks';

interface CreatorBadgeProps {
  creatorId: string | null | undefined;
  variant?: 'default' | 'outline' | 'secondary';
}

export function CreatorBadge({ creatorId, variant = 'outline' }: CreatorBadgeProps) {
  const { user } = useUser(null, 'CreatorBadge');

  if (!creatorId || !user || creatorId !== user.id) {
    return null;
  }

  return (
    <Badge variant={variant} className="ml-2">
      Created by you
    </Badge>
  );
}
