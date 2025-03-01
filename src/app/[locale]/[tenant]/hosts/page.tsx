'use client';

import { RefreshCcw, Plus, Server } from 'lucide-react';

import { useParams, useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

import { Skeleton } from '@/components/shadcn/skeleton';

import { Tooltip, TooltipContent, TooltipProvider } from '@/components/shadcn/tooltip';

import { cn } from '@/lib/utils';
import { Host } from '@/types/hosts';

import { ConnectHostDialog } from './_components/ConnectHostDialog';
import { HostOverview } from './_components/HostOverview';
import { toast } from 'sonner';

// Create a client
const queryClient = new QueryClient();

// API functions
const fetchHosts = async (locale: string) => {
  const response = await fetch(`/${locale}/api/hosts`);
  if (!response.ok) {
    throw new Error('Failed to fetch hosts');
  }
  return response.json();
};

const testConnection = async (locale: string, host: Host) => {
  const response = await fetch(`/${locale}/api/hosts/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: host.type,
      ip: host.ip,
      port: host.port,
      username: host.user,
      hostId: host.id,
    }),
  });
  return response.json();
};

export default function HostsPage() {
  return (
    <QueryClientProvider client={queryClient}>
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] w-full" />
            ))}
          </div>
        ) : (
          <>
            {hosts.length === 0 ? (
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
              <>
                <HostOverview
                  hosts={hosts}
                  onDelete={handleDeleteHost}
                  onRefresh={() => {}}
                  onTestConnection={handleTestConnection}
                  className="mt-4"
                />
              </>
            )}
          </>
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
          onSuccess={(newHost) => {}}
        />
      </div>
    </QueryClientProvider>
  );
}

function HostsPageContent() {
  const t = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = params.locale as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hostToDelete, setHostToDelete] = useState<string | null>(null);
  const [viewMode] = useState<'grid' | 'table'>('grid');

  // Queries
  const { data: hosts = [], isLoading } = useQuery({
    queryKey: ['hosts', locale],
    queryFn: () => fetchHosts(locale),
  });

  // Mutations
  const testConnectionMutation = useMutation({
    mutationFn: (host: Host) => testConnection(locale, host),
    onSuccess: (data, host) => {
      queryClient.invalidateQueries({ queryKey: ['hosts', locale] });
      toast({
        title: data.success ? 'Success' : 'Warning',
        description: data.success ? 'Host connected successfully' : data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
  });

  const deleteHostMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/${locale}/api/hosts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete host');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts', locale] });
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

  // Handlers
  const handleTestConnection = (host: Host) => {
    testConnectionMutation.mutate(host);
  };

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
          ))}
        </div>
      ) : (
        <>
          {hosts.length === 0 ? (
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
            <>
              <HostOverview
                hosts={hosts}
                onDelete={handleDeleteHost}
                onRefresh={() => {}}
                onTestConnection={handleTestConnection}
                className="mt-4"
              />
            </>
          )}
        </>
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
        onSuccess={(newHost) => {}}
      />
    </div>
  );
}
