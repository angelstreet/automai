'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/shadcn/button';
import { EnhancedConnectRepositoryDialog } from '../EnhancedConnectRepositoryDialog';
import { ConnectRepositoryValues } from '../../types';

export function RepositoryActions() {
  const t = useTranslations('repositories');
  const [connectDialogOpen, setConnectDialogOpen] = useState<boolean>(false);

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
        const errorData = await connectResponse.json();
        throw new Error(errorData.error || 'Failed to connect repository');
      }

      // Close dialog
      setConnectDialogOpen(false);
      
      // Show success message - using global toast system or event dispatch
      window.dispatchEvent(new CustomEvent('repository-connected'));
    } catch (error: unknown) {
      console.error('Error connecting repository:', error);
      // Show error message
      window.dispatchEvent(new CustomEvent('repository-connection-error', { 
        detail: { message: error instanceof Error ? error.message : 'Unknown error' } 
      }));
    }
  };

  return (
    <>
      <Button onClick={() => setConnectDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {t('add_provider')}
      </Button>

      <EnhancedConnectRepositoryDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSubmit={handleConnectRepository}
      />
    </>
  );
}