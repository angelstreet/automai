import { Repository } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { GitBranch, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

interface RepositoryCardProps {
  repository: Repository;
  onSync: (id: string) => Promise<void>;
  isSyncing: boolean;
}

export function RepositoryCard({ repository, onSync, isSyncing }: RepositoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Format the last synced date
  const lastSyncedText = repository.lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(repository.lastSyncedAt), { addSuffix: true })}`
    : 'Never synced';

  // Determine the badge color based on the repository status
  const getBadgeVariant = () => {
    if (!repository.isActive) return 'destructive';
    if (repository.isPrivate) return 'outline';
    return 'secondary';
  };

  // Get the badge text based on the repository status
  const getBadgeText = () => {
    if (!repository.isActive) return 'Inactive';
    if (repository.isPrivate) return 'Private';
    return 'Public';
  };

  return (
    <Card
      className="overflow-hidden transition-all duration-200 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold line-clamp-1">{repository.name}</CardTitle>
            <CardDescription className="line-clamp-1">
              {repository.description || 'No description'}
            </CardDescription>
          </div>
          <Badge variant={getBadgeVariant()}>{getBadgeText()}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <GitBranch className="mr-1 h-4 w-4" />
          <span>{repository.defaultBranch || 'main'}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 text-xs text-muted-foreground">
        <span>{lastSyncedText}</span>
        <Button
          variant="ghost"
          size="sm"
          className={`p-0 h-8 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => onSync(repository.id)}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </CardFooter>
    </Card>
  );
}
