'use client';

import React, { useState } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
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
      window.dispatchEvent(
        new CustomEvent('repository-connection-error', {
          detail: { message: error instanceof Error ? error.message : 'Unknown error' },
        }),
      );
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh')}
        </Button>
        <Button onClick={() => setConnectDialogOpen(true)} id="add-repository-button" size="sm" className="h-8 gap-1">
          <PlusCircle className="h-4 w-4" />
          <span>{t('addRepository')}</span>
        </Button>
      </div>

      <EnhancedConnectRepositoryDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onSubmit={handleConnectRepository}
      />
    </>
  );
}
