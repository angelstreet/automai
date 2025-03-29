'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';

import CICDProviderForm from '../CICDProviderForm';

export function CICDActions() {
  const t = useTranslations('cicd');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const router = useRouter();

  const handleAddProvider = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleDialogComplete = useCallback(() => {
    setIsAddDialogOpen(false);
    router.refresh(); // Use Next.js router refresh instead of custom events
  }, [router]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
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
          <CICDProviderForm onComplete={handleDialogComplete} />
        </DialogContent>
      </Dialog>
    </>
  );
}
