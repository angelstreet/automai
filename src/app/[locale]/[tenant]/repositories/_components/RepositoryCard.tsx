import { useState } from 'react';
import Link from 'next/link';
import { Repository } from '@/types/repositories';
import { GitBranch, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';

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
    if (repository.syncStatus === 'ERROR') return 'destructive';
    if (repository.syncStatus === 'SYNCING') return 'default';
    if (repository.syncStatus === 'SYNCED') return 'secondary';
    return 'outline';
  };

  // Get the badge text based on the repository status
  const getBadgeText = () => {
    switch (repository.syncStatus) {
      case 'ERROR':
        return 'Error';
      case 'SYNCING':
        return 'Syncing';
      case 'SYNCED':
        return 'Synced';
      case 'IDLE':
      default:
        return 'Idle';
    }
  };

  // Get provider icon based on provider type
  const getProviderIcon = () => {
    if (!repository.provider) return null;

    const providerType =
      typeof repository.provider.name === 'string'
        ? repository.provider.name.toLowerCase()
        : repository.provider.name;

    switch (providerType) {
      case 'github':
        return <GitHubIcon className="h-4 w-4" />;
      case 'gitlab':
        return <GitLabIcon className="h-4 w-4" />;
      case 'gitea':
        return <GiteaIcon className="h-4 w-4" />;
      default:
        return null;
    }
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
            <div className="flex items-center space-x-2">
              {getProviderIcon()}
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {repository.name}
              </CardTitle>
            </div>
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
        <div className="flex gap-2">
          {repository.url && (
            <Link
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center text-xs ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}
            >
              <Button variant="ghost" size="sm" className="p-0 h-8">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`p-0 h-8 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}
            onClick={() => onSync(repository.id)}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
