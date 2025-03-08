'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RefreshCcw, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog';
import { Button } from '@/components/shadcn/button';
import { Tooltip, TooltipContent, TooltipProvider } from '@/components/shadcn/tooltip';
import { cn } from '@/lib/utils';
import { Host } from '@/types/hosts';

import { ConnectHostDialog } from './ConnectHostDialog';
import { HostOverview } from './HostOverview';
import { useHosts } from '@/hooks/useHosts';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

interface HostsPageClientProps {
  initialHosts: Host[];
}

function HostsPageContent({ initialHosts }: HostsPageClientProps) {
  const t = useTranslations('Common');
  const params = useParams();
  const locale = params.locale as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hostToDelete, setHostToDelete] = useState<string | null>(null);
  const [viewMode] = useState<'grid' | 'table'>('grid');

  const {
    hosts,
    isLoading,
    isRefreshing,
    isDeleting,
    isTesting,
    addHost,
    deleteHost,
    refreshConnections,
    testConnection
  } = useHosts(initialHosts);

  const handleDeleteHost = async () => {
    if (!hostToDelete) return;
    
    try {
      await deleteHost(hostToDelete);
      setIsDeleteDialogOpen(false);
      setHostToDelete(null);
    } catch (error) {
      console.error('Error deleting host:', error);
      toast.error('Failed to delete host');
    }
  };

  const handleTestConnection = async (host: Host) => {
    await testConnection(host.id);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('hosts')}</h1>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <Button
                variant="outline"
                size="icon"
                onClick={refreshConnections}
                disabled={isRefreshing}
              >
                <RefreshCcw
                  className={cn('h-4 w-4', {
                    'animate-spin': isRefreshing,
                  })}
                />
              </Button>
              <TooltipContent>
                <p>{t('refreshConnections')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addHost')}
          </Button>
        </div>
      </div>

        <HostOverview
          hosts={hosts}
        onDelete={(id) => {
          setHostToDelete(id);
          setIsDeleteDialogOpen(true);
        }}
          onRefresh={refreshConnections}
        onTestConnection={handleTestConnection}
        className="mt-6"
      />

      <ConnectHostDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={addHost}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteHost')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteHostConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteHost}
              disabled={isDeleting}
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function HostsPageClient(props: HostsPageClientProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <HostsPageContent {...props} />
    </QueryClientProvider>
  );
}
