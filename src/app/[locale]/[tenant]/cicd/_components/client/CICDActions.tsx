'use client';

import { Button } from '@/components/shadcn/button';
import { PlusCircle } from 'lucide-react';
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
      <Button id="add-provider-button" size="sm" className="h-8 gap-1" onClick={handleAddProvider}>
        <PlusCircle className="h-4 w-4" />
        <span>{t('add_provider', { fallback: 'Add Provider' })}</span>
      </Button>
      
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('add_provider_dialog_title', { fallback: 'Add CI/CD Provider' })}</DialogTitle>
          </DialogHeader>
          <CICDProviderForm
            onComplete={handleDialogComplete}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
