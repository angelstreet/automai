'use client';

import { RefreshCcw, Plus, Server } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { hostsApi } from '@/lib/api/hosts';

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      cacheTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
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
  const queryClient = useQueryClient();
  const locale = params.locale as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hostToDelete, setHostToDelete] = useState<string | null>(null);
  const [viewMode] = useState<'grid' | 'table'>('grid');

  // Mutations
  const deleteHostMutation = useMutation({
    mutationFn: (id: string) => hostsApi.deleteHost(locale, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
      setHostToDelete(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete host',
      });
    },
  });

  const handleDeleteHost = (id: string) => {
    setHostToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteHost = () => {
    if (hostToDelete) {
      deleteHostMutation.mutate(hostToDelete);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('hosts')}</h1>
          <p className="text-muted-foreground">{t('manage_hosts')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {}} disabled={true}>
            <RefreshCcw className={cn('h-4 w-4 mr-2', { 'animate-spin': true })} />
            {t('refresh')}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipContent>
                <p>{viewMode === 'grid' ? t('table_view') : t('grid_view')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('add_host')}
          </Button>
        </div>
      </div>

      {initialHosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Server className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t('no_hosts')}</h3>
          <p className="text-muted-foreground mb-4">{t('add_host_description')}</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('add_host')}
          </Button>
        </div>
      ) : (
        <HostOverview
          hosts={initialHosts}
          onDelete={handleDeleteHost}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['hosts'] })}
          onTestConnection={async (host) => {
            const data = await hostsApi.testConnection(locale, host);
            if (data.success) {
              toast.success('Connection successful');
            } else {
              toast.error(data.message || 'Connection failed');
            }
          }}
          className="mt-4"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Machine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this host? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHostToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHost}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connect Host Dialog */}
      <ConnectHostDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['hosts'] })}
      />
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