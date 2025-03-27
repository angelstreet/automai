'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useToast } from '@/components/shadcn/use-toast';
import { PlusCircle, RefreshCcw } from 'lucide-react';
import CICDProviderForm from './CICDProviderForm';
import { createCICDProvider, updateCICDProvider } from '@/app/actions/cicd';
import { useTranslations } from 'next-intl';

export default function CICDActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const t = useTranslations('cicd');

  const handleOpenDialog = () => {
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      
      const isEdit = Boolean(formData.id);
      const action = isEdit ? updateCICDProvider : createCICDProvider;
      const result = await action(formData);
      
      if (result.success) {
        toast({
          title: isEdit ? 'Provider Updated' : 'Provider Added',
          description: isEdit 
            ? `The provider "${formData.name}" has been successfully updated.`
            : `The provider "${formData.name}" has been successfully added.`,
          variant: 'default',
        });
        
        // Use router.refresh() instead of dispatching custom events
        router.refresh();
        
        handleCloseDialog();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to process the provider',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    // Use router.refresh() to trigger revalidation
    router.refresh();
  };

  return (
    <div className="mb-4 flex justify-between">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={handleRefresh}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {t('refresh')}
        </Button>
      </div>
      <Button
        id="add-provider-button"
        size="sm"
        className="h-8 gap-1"
        onClick={handleOpenDialog}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        {t('add_provider')}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{t('add_provider')}</DialogTitle>
          </DialogHeader>
          <CICDProviderForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 