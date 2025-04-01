import React, { useMemo } from 'react';
import { Badge } from '@/components/shadcn/badge';
import { useUser } from '@/context';
import { Avatar } from '@/components/shadcn/avatar';
import { AvatarFallback } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/shadcn/hover-card';

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
