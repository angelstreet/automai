'use client';

import { PlusCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useToast } from '@/components/shadcn/use-toast';
import { useCICD } from '@/hooks/useCICD';
import { CICDProvider } from '@/types/component/cicdComponentType';

import { CICDFormDialogClient } from '..';

import { OPEN_CICD_DIALOG, REFRESH_CICD_COMPLETE } from './CICDEventListener';

// Define connection testing event constants
const CICD_TESTING_CONNECTION = 'cicd-testing-connection';
const CICD_TESTING_CONNECTION_COMPLETE = 'cicd-testing-connection-complete';

interface CICDActionsClientProps {
  providerCount: number;
}

export default function CICDActionsClient({
  providerCount: initialProviderCount = 0,
}: CICDActionsClientProps) {
  const t = useTranslations('cicd');
  const c = useTranslations('common');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  // Use the CICD hook
  const { refetchProviders, isLoading, providers } = useCICD();

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

  // Function to test a single provider connection
  const testProviderConnection = useCallback(async (provider: CICDProvider) => {
    try {
      // Dispatch event to notify other components that a test is starting
      window.dispatchEvent(
        new CustomEvent(CICD_TESTING_CONNECTION, {
          detail: { providerId: provider.id },
        }),
      );

      // Call the API endpoint to test the connection
      const response = await fetch('/api/cicd/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      const result = await response.json();

      if (!result.success) {
        console.warn(
          `[@component:CICDActionsClient:testProviderConnection] Failed to test connection for provider ${provider.name}: ${result.error}`,
        );
      } else {
        console.log(
          `[@component:CICDActionsClient:testProviderConnection] Successfully tested connection for provider ${provider.name}`,
        );
      }

      // Dispatch completion event regardless of result
      window.dispatchEvent(
        new CustomEvent(CICD_TESTING_CONNECTION_COMPLETE, {
          detail: { providerId: provider.id, success: result.success },
        }),
      );

      return result.success;
    } catch (error: any) {
      console.error(
        `[@component:CICDActionsClient:testProviderConnection] Error testing provider ${provider.name}:`,
        error,
      );

      // Dispatch completion event on error
      window.dispatchEvent(
        new CustomEvent(CICD_TESTING_CONNECTION_COMPLETE, {
          detail: { providerId: provider.id, success: false },
        }),
      );

      return false;
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isLoading) return;

    console.log('[@component:CICDActionsClient:handleRefresh] Refreshing providers');

    // First refresh the list of providers
    await refetchProviders();

    // Then test connections for all providers
    if (providers && providers.length > 0) {
      console.log(
        `[@component:CICDActionsClient:handleRefresh] Testing connections for ${providers.length} providers`,
      );

      let successCount = 0;
      let failCount = 0;

      // Test each provider in sequence
      for (const provider of providers) {
        const success = await testProviderConnection(provider);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // Show a summary toast
      if (successCount > 0 || failCount > 0) {
        toast({
          title: c('connection_success'),
          description: `${successCount} ${c('success')}, ${failCount} ${c('failed')}`,
          variant: failCount > 0 ? 'destructive' : 'default',
        });
      }

      // Dispatch event to refresh the UI
      window.dispatchEvent(new Event(REFRESH_CICD_COMPLETE));
    }
  }, [isLoading, refetchProviders, providers, testProviderConnection, toast, c]);

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
