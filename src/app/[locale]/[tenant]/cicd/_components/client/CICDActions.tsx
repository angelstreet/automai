'use client';

import { Button } from '@/components/shadcn/button';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import CICDProviderForm from '../CICDProviderForm';

export function CICDActions() {
  const t = useTranslations('cicd');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddProvider = () => {
    setIsAddDialogOpen(true);
  };

  const handleDialogComplete = () => {
    setIsAddDialogOpen(false);
    // Dispatch a refresh event so the provider list is updated
    window.dispatchEvent(new CustomEvent('refresh-providers'));
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
        <Button id="add-provider-button" size="sm" className="h-8 gap-1" onClick={handleAddProvider}>
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_provider')}</span>
        </Button>
      </div>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('add_provider_dialog_title')}</DialogTitle>
          </DialogHeader>
          <CICDProviderForm
            onComplete={handleDialogComplete}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
