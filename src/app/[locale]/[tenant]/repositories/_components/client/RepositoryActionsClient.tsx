'use client';

import { PlusCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';
import { useToast } from '@/components/shadcn/use-toast';
import { useRepository } from '@/hooks/useRepository';

import { RepositoryFormDialogClient } from './RepositoryFormDialogClient';

interface RepositoryActionsClientProps {
  repositoryCount?: number;
}

export function RepositoryActionsClient({ repositoryCount = 0 }: RepositoryActionsClientProps) {
  const t = useTranslations('repositories');
  const [connectDialogOpen, setConnectDialogOpen] = useState<boolean>(false);
  const [currentRepositoryCount, setCurrentRepositoryCount] = useState(repositoryCount);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Update repository count when prop changes
  useEffect(() => {
    setCurrentRepositoryCount(repositoryCount);
  }, [repositoryCount]);

  // Listen for repository count updates
  useEffect(() => {
    const handleRepositoryCountUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.count === 'number') {
        console.log('[RepositoryActionsClient] Repository count updated:', event.detail.count);
        setCurrentRepositoryCount(event.detail.count);
      }
    };

    window.addEventListener(
      'repository-count-updated',
      handleRepositoryCountUpdate as EventListener,
    );
    return () => {
      window.removeEventListener(
        'repository-count-updated',
        handleRepositoryCountUpdate as EventListener,
      );
    };
  }, []);

  // Listen for refresh complete event
  useEffect(() => {
    const handleRefreshComplete = () => {
      console.log('[RepositoryActionsClient] Refresh complete');
      setIsRefreshing(false);
    };

    window.addEventListener('refresh-repositories-complete', handleRefreshComplete);
    return () => window.removeEventListener('refresh-repositories-complete', handleRefreshComplete);
  }, []);

  // Handle refresh action
  const _handleRefresh = () => {
    // Prefix with _ to avoid unused var warning
    if (isRefreshing) return;

    console.log('[RepositoryActionsClient] Triggering refresh');
    setIsRefreshing(true);
    // Dispatch custom event for refreshing repositories
    window.dispatchEvent(new CustomEvent('refresh-repositories'));
  };

  return (
    <div className="flex items-center gap-4">
      {currentRepositoryCount > 0 && (
        <div className="relative w-[300px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search_placeholder')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                onClick={() => setConnectDialogOpen(true)}
                id="add-repository-button"
                size="sm"
                className="h-8 gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{t('add_button')}</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('connect_repo')}</TooltipContent>
        </Tooltip>
      </div>

      <RepositoryFormDialogClient open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
    </div>
  );
}
