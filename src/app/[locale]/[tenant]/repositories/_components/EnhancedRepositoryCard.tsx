import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Star, GitBranch, Clock, ExternalLink, RefreshCw, Globe, Lock, Trash2 } from 'lucide-react';

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
import { LANGUAGE_COLORS } from './constants';

interface EnhancedRepositoryCardProps {
  repository: any; // We'll replace this with proper types later
  onSync: (id: string) => Promise<void>;
  onDelete?: (id: string) => void;
  isSyncing: boolean;
  isDeleting?: boolean;
  onToggleStarred: (id: string) => void;
  isStarred: boolean;
}

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
  
  // This effect only runs on the client after hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Format the last synced date - using a more stable approach to avoid hydration issues
  const getLastSyncedText = () => {
    if (!repository.lastSyncedAt) return t('never');
    
    // Use a safer method that's less likely to cause hydration errors
    try {
      return t('lastSynced', { 
        date: formatDistanceToNow(new Date(repository.lastSyncedAt), { addSuffix: true }) 
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
    switch(repository.providerType) {
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
  const handleSyncClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSync(repository.id);
  };

  // Handle star button click without propagation
  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStarred(repository.id);
  };

  // Handle delete button click without propagation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(repository.id);
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
              {repository.name}
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
          {repository.isPrivate ? (
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
        <div className="flex items-center text-xs text-muted-foreground">
          <GitBranch className="h-3 w-3 mr-1" />
          {repository.defaultBranch || 'main'}
          <Badge 
            variant="outline" 
            className={`ml-2 text-xs ${getLanguageColor(repository.language)}`}
          >
            {repository.language}
          </Badge>
          <div className="ml-auto flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {lastSyncedText}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className={`py-3 px-3 border-t flex justify-between transition-opacity duration-200 ${isClient && isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-1">
          <Badge variant={repository.syncStatus === 'SYNCED' ? 'default' : 'outline'} className="text-xs py-0">
            {repository.syncStatus}
          </Badge>
        </div>
        <div className="flex gap-1">
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