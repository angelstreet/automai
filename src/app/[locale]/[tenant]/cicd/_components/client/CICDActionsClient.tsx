'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useCICD } from '@/hooks/useCICD';

import { CICDFormDialogClient } from '..';

import { OPEN_CICD_DIALOG } from './CICDEventListener';

interface CICDActionsClientProps {
  providerCount: number;
}

export default function CICDActionsClient({
  providerCount: initialProviderCount = 0,
}: CICDActionsClientProps) {
  const t = useTranslations('cicd');
  const c = useTranslations('common');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Use the CICD hook
  const { refetchProviders, isLoading } = useCICD();

  // Listen for open dialog events
  useEffect(() => {
    const handleOpenDialog = () => {
      console.log('[@component:CICDActionsClient] Opening dialog via event');
      setIsAddDialogOpen(true);
    };

    window.addEventListener(OPEN_CICD_DIALOG, handleOpenDialog);
    return () => {
      window.removeEventListener(OPEN_CICD_DIALOG, handleOpenDialog);
    };
  }, []);

  const handleAddProvider = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isLoading) return;
    console.log('[@component:CICDActionsClient:handleRefresh] Refreshing providers');
    refetchProviders();
  }, [isLoading, refetchProviders]);

  const handleDialogComplete = useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {initialProviderCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {c('refresh')}
          </Button>
        )}
        <Button
          id="add-provider-button"
          size="sm"
          className="h-8 gap-1"
          onClick={handleAddProvider}
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_button')}</span>
        </Button>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('add_title')}</DialogTitle>
          </DialogHeader>
          <CICDFormDialogClient onComplete={handleDialogComplete} isInDialog={true} />
        </DialogContent>
      </Dialog>
    </>
  );
}
