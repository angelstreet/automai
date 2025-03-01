'use client';

import { RefreshCcw, Plus, Server } from 'lucide-react';

import { useParams, useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';

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

import { useToast } from '@/components/shadcn/use-toast';
import { cn } from '@/lib/utils';
import { Host } from '@/types/hosts';

import { ConnectHostDialog } from './_components/ConnectHostDialog';
import { HostOverview } from './_components/HostOverview';

export default function HostsPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const router = useRouter();
  const tenant = params.tenant as string;
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hostToDelete, setHostToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [viewMode] = useState<'grid' | 'table'>('grid');
  const [error, setError] = useState<string | null>(null);

  const fetchHosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching hosts from API...');
      const response = await fetch(`/${params.locale}/api/hosts`);

      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      console.log('API response OK, parsing JSON...');
      const hosts = await response.json();
      console.log('Hosts data received:', hosts);

      setHosts(hosts);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch hosts');
      setIsLoading(false);
    }
  }, [params.locale]);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Test a single host connection
  const testHostConnection = async (host: Host) => {
    try {
      // Update the specific host to testing status
      const hostIndex = hosts.findIndex((h) => h.id === host.id);
      if (hostIndex === -1) return;

      const updatedHosts = [...hosts];
      updatedHosts[hostIndex] = { ...hosts[hostIndex], status: 'pending' };
      setHosts(updatedHosts);

      // Test connection
      const testResponse = await fetch(`/${params.locale}/api/hosts/test-connection`, {
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

      if (!testResponse.ok) {
        console.error(
          'Test connection response not OK:',
          testResponse.status,
          testResponse.statusText,
        );
        const errorText = await testResponse.text();
        console.error('Error response body:', errorText);
      }

      const testData = await testResponse.json();

      // Check if the response was actually successful
      const isSuccess = testResponse.ok && testData.success === true;

      // If we get ECONNRESET or similar network errors, set status to 'pending' instead of 'failed'
      const isNetworkError =
        testData.message &&
        (testData.message.includes('ECONNRESET') ||
          testData.message.includes('timeout') ||
          testData.message.includes('network'));

      const finalStatus = isSuccess ? 'connected' : isNetworkError ? 'pending' : 'failed';

      // Update host status immediately in the UI
      const finalHosts = [...hosts];
      const finalIndex = finalHosts.findIndex((h) => h.id === host.id);
      if (finalIndex !== -1) {
        finalHosts[finalIndex] = {
          ...finalHosts[finalIndex],
          status: finalStatus,
          lastConnected: isSuccess ? new Date() : finalHosts[finalIndex].lastConnected,
        };
        setHosts(finalHosts);
      }

      // Show toast notification
      toast({
        title: isSuccess ? 'Success' : isNetworkError ? 'Warning' : 'Error',
        description: isSuccess
          ? 'Host connected successfully'
          : isNetworkError
            ? 'Connection unstable - host may be temporarily unavailable'
            : testData.message || 'Connection failed',
        variant: isSuccess ? 'default' : isNetworkError ? 'default' : 'destructive',
        duration: 5000,
      });
    } catch (error) {
      console.error(`Error testing connection for ${host.name}:`, error);

      // Update host status to pending in case of network exception
      const errorHosts = [...hosts];
      const errorIndex = errorHosts.findIndex((h) => h.id === host.id);
      if (errorIndex !== -1) {
        errorHosts[errorIndex] = { ...errorHosts[errorIndex], status: 'pending' };
        setHosts(errorHosts);
      }

      toast({
        variant: 'default',
        title: 'Warning',
        description: `Connection unstable - host may be temporarily unavailable`,
        duration: 5000,
      });
    }
  };

  // Refresh hosts
  const refreshHosts = async () => {
    setIsRefreshing(true);

    if (hosts.length > 0) {
      let successCount = 0;
      let failureCount = 0;
      let pendingCount = 0;

      // Create a copy of hosts to update
      const updatedHosts = [...hosts];

      for (const host of hosts) {
        try {
          // Update status to pending in UI
          const hostIndex = updatedHosts.findIndex((h) => h.id === host.id);
          if (hostIndex !== -1) {
            updatedHosts[hostIndex] = { ...updatedHosts[hostIndex], status: 'pending' };
            setHosts([...updatedHosts]);
          }

          // Test connection
          const testResponse = await fetch(`/${params.locale}/api/hosts/test-connection`, {
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

          if (!testResponse.ok) {
            console.error(
              'Test connection response not OK:',
              testResponse.status,
              testResponse.statusText,
            );
            const errorText = await testResponse.text();
            console.error('Error response body:', errorText);
            throw new Error(`API error: ${testResponse.status} ${testResponse.statusText}`);
          }

          const testData = await testResponse.json();

          const isSuccess = testResponse.ok && testData.success === true;

          // Check for network errors
          const isNetworkError =
            testData.message &&
            (testData.message.includes('ECONNRESET') ||
              testData.message.includes('timeout') ||
              testData.message.includes('network'));

          const finalStatus = isSuccess ? 'connected' : isNetworkError ? 'pending' : 'failed';

          // Update host status in our local copy
          const finalIndex = updatedHosts.findIndex((h) => h.id === host.id);
          if (finalIndex !== -1) {
            updatedHosts[finalIndex] = {
              ...updatedHosts[finalIndex],
              status: finalStatus,
              lastConnected: isSuccess ? new Date() : updatedHosts[finalIndex].lastConnected,
            };
            setHosts([...updatedHosts]);
          }

          if (isSuccess) {
            successCount++;
          } else if (isNetworkError) {
            pendingCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error('Error refreshing connection:', error);

          // Update host status to pending in our local copy
          const errorIndex = updatedHosts.findIndex((h) => h.id === host.id);
          if (errorIndex !== -1) {
            updatedHosts[errorIndex] = { ...updatedHosts[errorIndex], status: 'pending' };
            setHosts([...updatedHosts]);
          }

          pendingCount++;
        }
      }

      // Show toast with results
      if (successCount > 0 || failureCount > 0 || pendingCount > 0) {
        let message = '';
        if (successCount > 0) {
          message += `${successCount} host${successCount > 1 ? 's' : ''} connected successfully. `;
        }
        if (failureCount > 0) {
          message += `${failureCount} host${failureCount > 1 ? 's' : ''} failed to connect. `;
        }
        if (pendingCount > 0) {
          message += `${pendingCount} host${pendingCount > 1 ? 's' : ''} temporarily unavailable.`;
        }

        toast({
          title: 'Connections refreshed',
          description: message.trim(),
          duration: 5000,
        });
      }
    } else {
      await fetchHosts();
    }

    setIsRefreshing(false);
  };

  // Handle connection success
  const handleConnectionSuccess = (newHost: Host) => {
    setHosts((prev) => [...prev, newHost]);
  };

  // Handle delete host
  const handleDeleteHost = (id: string) => {
    setHostToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete host
  const confirmDeleteHost = async () => {
    if (!hostToDelete) return;

    try {
      const response = await fetch(`/${params.locale}/api/hosts/${hostToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Delete host response not OK:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`Failed to delete host: ${response.status} ${response.statusText}`);
      }

      setHosts((prev) => prev.filter((host) => host.id !== hostToDelete));
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting host:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete host',
      });
    } finally {
      setHostToDelete(null);
      setIsDeleteDialogOpen(false);
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
          <Button variant="outline" size="sm" onClick={refreshHosts} disabled={isRefreshing}>
            <RefreshCcw className={cn('h-4 w-4 mr-2', { 'animate-spin': isRefreshing })} />
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
                onRefresh={fetchHosts}
                onTestConnection={testHostConnection}
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
        onSuccess={handleConnectionSuccess}
      />
    </div>
  );
}
