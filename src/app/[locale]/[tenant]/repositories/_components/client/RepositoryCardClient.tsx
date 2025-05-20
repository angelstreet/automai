'use client';

import { GitBranch, ExternalLink, Globe, Lock, Trash2, FolderPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import AddToWorkspace from '@/components/workspace/AddToWorkspace';
import { EnhancedRepositoryCardProps } from '@/types/context/repositoryContextType';

import { LANGUAGE_COLORS } from '../../constants';

export function RepositoryCardClient({
  repository,
  onDelete,
  isDeleting,
  onClick,
}: EnhancedRepositoryCardProps) {
  const [_isHovered, setIsHovered] = useState(false);
  const [_isClient, setIsClient] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const t = useTranslations('repositories');
  const c = useTranslations('common');

  // Debug log
  useEffect(() => {
    console.log(
      `[@component:RepositoryCard] Repository provider type:`,
      repository?.provider_type,
      `ID: ${repository?.id}`,
    );
  }, [repository]);

  // This effect only runs on the client after hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get the provider icon based on the type
  const getProviderIcon = () => {
    switch (repository?.provider_type) {
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

  // Open delete confirmation dialog without propagation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  // Handle actual deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!repository?.id || !onDelete) return;
    onDelete(repository.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card
        className="overflow-hidden transition-all duration-160 hover:shadow-md cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        <CardHeader className="pb-2 pt-3 px-4 relative">
          <div className="flex items-center gap-2">
            {getProviderIcon()}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {repository?.name || 'Unnamed Repository'}
              </CardTitle>
            </div>
            {repository?.is_private ? (
              <Badge variant="outline" className="flex items-center">
                <Lock className="h-3 w-3 mr-1" />
                {t('sort_private')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center">
                <Globe className="h-3 w-3 mr-1" />
                {t('sort_public')}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="px-4 py-2">
          {repository?.description && (
            <CardDescription className="line-clamp-2 text-xs mb-2">
              {repository.description}
            </CardDescription>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {repository?.owner && <div>{repository.owner}</div>}

            {repository?.language && (
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getLanguageColor(repository.language) }}
                />
                <span>{repository.language}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              <span>{repository?.default_branch || 'main'}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="px-4 py-2 flex justify-between items-center text-xs border-t">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              <a
                href={repository?.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {c('view')}
              </a>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <AddToWorkspace
                  itemType="repository"
                  itemId={repository?.id || ''}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                      disabled={isDeleting}
                    >
                      <FolderPlus className="mr-2 h-3.5 w-3.5" />
                      <span>Workspaces</span>
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete_repository')}</DialogTitle>
            <DialogDescription>
              {t('delete_repository_confirmation', { name: repository?.name || 'this repository' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {c('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? c('deleting') : c('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
