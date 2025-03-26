import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Star, GitBranch, Clock, ExternalLink, RefreshCw, Globe, Lock, Trash2 } from 'lucide-react';
import { deleteRepository, syncRepository, starRepositoryAction, unstarRepositoryAction } from '@/app/actions/repositories';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Badge } from '@/components/shadcn/badge';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { LANGUAGE_COLORS, SYNC_STATUS_STYLES } from '../constants';
import { EnhancedRepositoryCardProps } from '../types';

export function EnhancedRepositoryCard({
  repository,
  onSync,
  onDelete,
  isSyncing,
  isDeleting,
  onToggleStarred,
  isStarred,
}: EnhancedRepositoryCardProps) {
  // Initialize isHovered to false to prevent hydration mismatch
  const [isHovered, setIsHovered] = useState(false);
  // Add isClient state to handle client-side rendering safely
  const [isClient, setIsClient] = useState(false);
  const t = useTranslations('repositories');

  // Use the router for refreshing data after actions
  const router = useRouter();

  // Log whenever the card receives new props
  useEffect(() => {
    console.log(`[EnhancedRepositoryCard] Received update for repo: ${repository?.id}`, {
      name: repository?.name,
      syncStatus: repository?.syncStatus,
      lastSyncedAt: repository?.lastSyncedAt,
    });
  }, [repository]);

  // This effect only runs on the client after hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Format the last synced date - using a more stable approach to avoid hydration issues
  const getLastSyncedText = () => {
    if (!repository?.lastSyncedAt) return t('never');

    // Use a safer method that's less likely to cause hydration errors
    try {
      return t('lastSynced', {
        date: formatDistanceToNow(new Date(repository.lastSyncedAt), { addSuffix: true }),
      });
    } catch (e) {
      // Fall back to a simple format if there's an issue
      return t('lastSynced', { date: t('recently') });
    }
  };

  // Get the text outside of render to reduce dynamic content
  const lastSyncedText = getLastSyncedText();

  // Get the provider icon based on the type
  const getProviderIcon = () => {
    switch (repository?.providerType) {
      case 'github':
        return <GitHubIcon className="h-5 w-5" />;
      case 'gitlab':
        return <GitLabIcon className="h-5 w-5" />;
      case 'gitea':
        return <GiteaIcon className="h-5 w-5" />;
      default:
        return <GitBranch className="h-5 w-5" />;
    }
  };

  // Get language color from constants
  const getLanguageColor = (language: string) => {
    const key = language?.toLowerCase() || 'default';
    return LANGUAGE_COLORS[key] || LANGUAGE_COLORS.default;
  };

  // Handle sync button click without propagation
  const handleSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!repository?.id) return;
    
    try {
      // Use server action directly
      const result = await syncRepository(repository.id);
      
      if (result.success) {
        // Refresh UI
        router.refresh();
        if (onSync) {
          onSync(repository.id);
        }
      }
    } catch (error) {
      console.error('Error syncing repository:', error);
    }
  };

  // Handle star button click without propagation
  const handleStarClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!repository?.id) return;
    
    try {
      // Use server action directly
      if (isStarred) {
        await unstarRepositoryAction(repository.id);
      } else {
        await starRepositoryAction(repository.id);
      }
      
      // Refresh UI
      router.refresh();
      if (onToggleStarred) {
        onToggleStarred(repository.id);
      }
    } catch (error) {
      console.error('Error toggling star status:', error);
    }
  };

  // Handle delete button click without propagation
  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!repository?.id) return;
    
    try {
      // Use server action directly
      const result = await deleteRepository(repository.id);
      
      if (result.success) {
        // Refresh UI
        router.refresh();
        if (onDelete) {
          onDelete(repository.id);
        }
      }
    } catch (error) {
      console.error('Error deleting repository:', error);
    }
  };

  return (
    <Card
      className="overflow-hidden transition-all duration-160 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2 pt-3 px-4 relative">
        <div className="flex items-center gap-2">
          {getProviderIcon()}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {repository?.name || 'Unnamed Repository'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 p-0 ${isStarred ? 'text-yellow-500' : ''}`}
            onClick={handleStarClick}
          >
            <Star className="h-4 w-4" />
          </Button>
          {repository?.isPrivate ? (
            <Badge variant="outline" className="flex items-center">
              <Lock className="h-3 w-3 mr-1" />
              {t('private')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              {t('public')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="py-2 px-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <GitBranch className="h-3 w-3 mr-1" />
            {repository?.defaultBranch || 'main'}
          </div>
          <Badge
            variant={repository?.syncStatus === 'SYNCED' ? 'default' : 'outline'}
            className={`text-xs py-0 text-[10px] ml-auto ${SYNC_STATUS_STYLES[repository?.syncStatus || 'IDLE']}`}
          >
            {repository?.syncStatus || 'IDLE'}
          </Badge>
        </div>
        <div className="flex items-center text-[10px] text-muted-foreground mt-1">
          <Clock className="h-3 w-3 mr-1" />
          {lastSyncedText}
        </div>
      </CardContent>

      <CardFooter
        className={`py-3 px-3 border-t flex justify-center transition-opacity duration-200 ${isClient && isHovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteClick}
            disabled={isDeleting}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {t('deleteAction')}
          </Button>
          {repository.url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={(e) => {
                e.stopPropagation();
                window.open(repository.url, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {t('open')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6"
            onClick={handleSyncClick}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('sync')}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
