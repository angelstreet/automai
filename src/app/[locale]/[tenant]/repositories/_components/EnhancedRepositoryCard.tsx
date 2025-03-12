import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Star, GitBranch, Clock, ExternalLink, RefreshCw, Globe, Lock } from 'lucide-react';

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

interface EnhancedRepositoryCardProps {
  repository: any; // We'll replace this with proper types later
  onSync: (id: string) => Promise<void>;
  isSyncing: boolean;
  onTogglePinned: (id: string) => void;
  isPinned: boolean;
}

export function EnhancedRepositoryCard({
  repository,
  onSync,
  isSyncing,
  onTogglePinned,
  isPinned,
}: EnhancedRepositoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const t = useTranslations('repositories');

  // Format the last synced date
  const lastSyncedText = repository.lastSyncedAt
    ? `${t('lastSynced', { date: formatDistanceToNow(new Date(repository.lastSyncedAt), { addSuffix: true }) })}`
    : t('never');

  // Get the provider icon based on the type
  const getProviderIcon = () => {
    switch(repository.provider) {
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

  // Determine badge color based on language
  const getLanguageColor = (language: string) => {
    switch(language.toLowerCase()) {
      case 'python':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'javascript':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'typescript':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bash':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Handle sync button click without propagation
  const handleSyncClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSync(repository.id);
  };

  // Handle pin button click without propagation
  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePinned(repository.id);
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-2 relative">
        <div className="absolute top-2 right-2 flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ${isPinned ? 'text-yellow-500' : ''}`}
            onClick={handlePinClick}
          >
            <Star className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          {getProviderIcon()}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">
              {repository.name}
            </CardTitle>
            <CardDescription className="truncate text-xs">
              {repository.owner}/{repository.name}
            </CardDescription>
          </div>
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
        
        <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
          {repository.description}
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
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
      
      <CardFooter className={`pt-2 border-t flex justify-between transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <Badge variant={repository.syncStatus === 'SYNCED' ? 'default' : 'outline'}>
            {repository.syncStatus}
          </Badge>
        </div>
        <div className="flex gap-1">
          {repository.url && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8"
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
            className="h-8"
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