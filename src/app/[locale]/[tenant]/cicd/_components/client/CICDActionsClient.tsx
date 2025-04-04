'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';

import {
  REFRESH_CICD_PROVIDERS,
  REFRESH_CICD_COMPLETE,
  CICD_TESTING_CONNECTION,
  CICD_TESTING_CONNECTION_COMPLETE,
} from '@/app/providers/CICDProvider';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

import { CICDProviderFormClient } from '..';

interface CICDActionsClientProps {
  providerCount: number;
}

export default function CICDActionsClient({
  providerCount: initialProviderCount = 0,
}: CICDActionsClientProps) {
  const t = useTranslations('cicd');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentProviderCount, setCurrentProviderCount] = useState(initialProviderCount);

  // Update provider count when prop changes
  useEffect(() => {
    setCurrentProviderCount(initialProviderCount);
  }, [initialProviderCount]);

  // Listen for provider count updates
  useEffect(() => {
    const handleProviderCountUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.count === 'number') {
        console.log('[cicdActionsClient] Provider count updated:', event.detail.count);
        setCurrentProviderCount(event.detail.count);
      }
    };

    window.addEventListener('provider-count-updated', handleProviderCountUpdate as EventListener);
    return () => {
      window.removeEventListener(
        'provider-count-updated',
        handleProviderCountUpdate as EventListener,
      );
    };
  }, []);

  const handleAddProvider = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;

    console.log('[cicdActionsClient] Triggering refresh');
    setIsRefreshing(true);
    // Dispatch custom event, similar to Hosts implementation
    window.dispatchEvent(new CustomEvent(REFRESH_CICD_PROVIDERS));
  }, [isRefreshing]);

  // Listen for refresh complete events
  useEffect(() => {
    const handleRefreshComplete = () => {
      console.log('[cicdActionsClient] Refresh complete');
      setIsRefreshing(false);
    };

    window.addEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
    return () => window.removeEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
  }, []);

  // Listen for connection testing events
  useEffect(() => {
    const handleTestingStart = () => {
      console.log('[cicdActionsClient] Connection testing started');
      setIsRefreshing(true);
    };

    const handleTestingComplete = () => {
      console.log('[cicdActionsClient] Connection testing complete');
      setIsRefreshing(false);
    };

    window.addEventListener(CICD_TESTING_CONNECTION, handleTestingStart);
    window.addEventListener(CICD_TESTING_CONNECTION_COMPLETE, handleTestingComplete);

    return () => {
      window.removeEventListener(CICD_TESTING_CONNECTION, handleTestingStart);
      window.removeEventListener(CICD_TESTING_CONNECTION_COMPLETE, handleTestingComplete);
    };
  }, []);

  const handleDialogComplete = useCallback(() => {
    setIsAddDialogOpen(false);
    // Trigger refresh after adding provider
    window.dispatchEvent(new CustomEvent(REFRESH_CICD_PROVIDERS));
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {currentProviderCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        )}
        <Button
          id="add-provider-button"
          size="sm"
          className="h-8 gap-1"
          onClick={handleAddProvider}
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_provider')}</span>
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('add_provider_dialog_title')}</DialogTitle>
          </DialogHeader>
          <CICDProviderFormClient onComplete={handleDialogComplete} isInDialog={true} />
        </DialogContent>
      </Dialog>
    </>
  );
}
