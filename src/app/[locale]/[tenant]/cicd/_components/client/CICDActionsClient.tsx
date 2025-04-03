'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

import { CICDProviderForm } from '../';
import { REFRESH_CICD_PROVIDERS, REFRESH_CICD_COMPLETE } from './CICDProvider';

export function CICDActionsClient() {
  const t = useTranslations('cicd');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleAddProvider = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;

    console.log('[CICDActionsClient] Triggering refresh');
    setIsRefreshing(true);
    // Dispatch custom event, similar to Hosts implementation
    window.dispatchEvent(new CustomEvent(REFRESH_CICD_PROVIDERS));
  }, [isRefreshing]);

  // Listen for refresh complete events
  useEffect(() => {
    const handleRefreshComplete = () => {
      console.log('[CICDActionsClient] Refresh complete');
      setIsRefreshing(false);
    };

    window.addEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
    return () => window.removeEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
  }, []);

  const handleDialogComplete = useCallback(() => {
    setIsAddDialogOpen(false);
    // Trigger refresh after adding provider
    window.dispatchEvent(new CustomEvent(REFRESH_CICD_PROVIDERS));
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
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
          <CICDProviderForm onComplete={handleDialogComplete} isInDialog={true} />
        </DialogContent>
      </Dialog>
    </>
  );
}
