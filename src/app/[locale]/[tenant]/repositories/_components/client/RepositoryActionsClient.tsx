'use client';

import { PlusCircle, RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { useToast } from '@/components/shadcn/use-toast';
import { ConnectRepositoryValues } from '@/types/context/repositoryContextType';

import { RepositoryDialogClient } from './RepositoryDialogClient';

interface RepositoryActionsClientProps {
  repositoryCount?: number;
}

export function RepositoryActionsClient({ repositoryCount = 0 }: RepositoryActionsClientProps) {
  const t = useTranslations('repositories');
  const c = useTranslations('common');
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
  const handleRefresh = () => {
    if (isRefreshing) return;

    console.log('[RepositoryActionsClient] Triggering refresh');
    setIsRefreshing(true);
    // Dispatch custom event for refreshing repositories
    window.dispatchEvent(new CustomEvent('refresh-repositories'));
  };

  // Handle repository connection
  const handleConnectRepository = async (values: ConnectRepositoryValues): Promise<void> => {
    try {
      // Connect repository via API
      const connectResponse = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!connectResponse.ok) {
        let errorMessage = 'Failed to connect repository';
        try {
          const errorData = await connectResponse.json();
          if (errorData && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Close dialog
      setConnectDialogOpen(false);

      // Show success message - using global toast system or event dispatch
      window.dispatchEvent(new CustomEvent('repository-connected'));
    } catch (error: unknown) {
      console.error('Error connecting repository:', error);
      // Show error message
      toast({
        title: 'Repository Connection Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });

      window.dispatchEvent(
        new CustomEvent('repository-connection-error', {
          detail: { message: error instanceof Error ? error.message : 'Unknown error' },
        }),
      );
    }
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
        <Button
          onClick={() => setConnectDialogOpen(true)}
          id="add-repository-button"
          size="sm"
          className="h-8 gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_button')}</span>
        </Button>
      </div>

      <RepositoryDialogClient
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSubmit={handleConnectRepository}
      />
    </div>
  );
}
