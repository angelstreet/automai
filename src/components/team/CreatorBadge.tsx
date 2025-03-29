import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/context/UserContext';

interface CreatorBadgeProps {
  creatorId: string | null | undefined;
  variant?: 'default' | 'outline' | 'secondary';
}

export function CreatorBadge({ creatorId, variant = 'outline' }: CreatorBadgeProps) {
  const { user } = useUser();

  if (!creatorId || !user || creatorId !== user.id) {
    return null;
  }

  return (
    <Badge variant={variant} className="ml-2">
      Created by you
    </Badge>
  );
}
