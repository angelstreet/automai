import { GitBranch, GitFork, Star, RefreshCw, ExternalLink } from 'lucide-react';
import { Repository } from '@prisma/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/shadcn/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface RepositoryCardProps {
  repository: Repository;
  onSync: (id: string) => void;
  isSyncing?: boolean;
}

export function RepositoryCard({ repository, onSync, isSyncing = false }: RepositoryCardProps) {
  const lastSyncedText = repository.lastSyncedAt 
    ? `Last synced ${formatDistanceToNow(new Date(repository.lastSyncedAt), { addSuffix: true })}`
    : 'Never synced';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold truncate">
            {repository.name}
          </CardTitle>
          <Badge variant={repository.isPrivate ? "secondary" : "outline"}>
            {repository.isPrivate ? 'Private' : 'Public'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{repository.fullName}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {repository.description || 'No description provided'}
        </p>
        <div className="flex items-center gap-4 mt-4">
          {repository.stars !== null && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4" />
              <span>{repository.stars}</span>
            </div>
          )}
          {repository.forks !== null && (
            <div className="flex items-center gap-1 text-sm">
              <GitFork className="h-4 w-4" />
              <span>{repository.forks}</span>
            </div>
          )}
          {repository.defaultBranch && (
            <div className="flex items-center gap-1 text-sm">
              <GitBranch className="h-4 w-4" />
              <span>{repository.defaultBranch}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 border-t">
        <p className="text-xs text-muted-foreground">{lastSyncedText}</p>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSync(repository.id)}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sync repository</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {repository.url && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(repository.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open repository</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardFooter>
    </Card>
  );
} 