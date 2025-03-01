import { GitProvider } from '@prisma/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, RefreshCw } from 'lucide-react';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/Icons';

interface GitProviderCardProps {
  provider: GitProvider;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  isRefreshing?: boolean;
}

export function GitProviderCard({ 
  provider, 
  onDelete, 
  onRefresh, 
  isRefreshing = false 
}: GitProviderCardProps) {
  const lastSyncedText = provider.lastSyncedAt 
    ? `Last synced ${formatDistanceToNow(new Date(provider.lastSyncedAt), { addSuffix: true })}`
    : 'Never synced';

  const getProviderIcon = () => {
    switch (provider.type) {
      case 'GITHUB':
        return <GitHubIcon className="h-5 w-5" />;
      case 'GITLAB':
        return <GitLabIcon className="h-5 w-5" />;
      case 'GITEA':
        return <GiteaIcon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getProviderName = () => {
    switch (provider.type) {
      case 'GITHUB':
        return 'GitHub';
      case 'GITLAB':
        return 'GitLab';
      case 'GITEA':
        return 'Gitea';
      default:
        return provider.type;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getProviderIcon()}
            <CardTitle className="text-lg font-semibold">
              {provider.displayName || getProviderName()}
            </CardTitle>
          </div>
          <Badge variant="outline">{getProviderName()}</Badge>
        </div>
        {provider.username && (
          <p className="text-sm text-muted-foreground">{provider.username}</p>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        {provider.url && (
          <p className="text-sm text-muted-foreground truncate">
            {provider.url}
          </p>
        )}
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
                  onClick={() => onRefresh(provider.id)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh provider</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDelete(provider.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete provider</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
} 