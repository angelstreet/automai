'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RefreshCcw, LayoutGrid, Table2, ScrollText, Terminal, BarChart2, Settings, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { HostOverview } from '@/components/virtualization/Overview/HostOverview';
import { Host } from '@/types/hosts';
import { ConnectHostDialog } from '@/components/virtualization/Overview/ConnectHostDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Server } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Fetch hosts from API
  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hosts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch hosts');
      }
      
      const data = await response.json();
      // Ensure all hosts have a status, defaulting to 'pending' if not set
      const hostsWithStatus = (data.data || []).map((host: Host) => ({
        ...machine,
        status: machine.status || 'pending'
      }));
      setHosts(machinesWithStatus);
    } catch (error) {
      console.error('Error fetching hosts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load hosts',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Test a single machine connection
  const testHostConnection = async (host: Host) => {
    try {
      // Update the specific machine to testing status
      const hostIndex = hosts.findIndex(m => m.id === host.id);
      if (machineIndex === -1) return;
      
      const updatedHosts = [...machines];
      updatedHosts[hostIndex] = { ...hosts[machineIndex], status: 'pending' };
      setHosts(updatedMachines);
      
      // Test connection
      const testResponse = await fetch('/api/hosts/test-connection', {
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

      const testData = await testResponse.json();
      
      // Check if the response was actually successful
      const isSuccess = testResponse.ok && testData.success === true;
      
      // If we get ECONNRESET or similar network errors, set status to 'pending' instead of 'failed'
      const isNetworkError = testData.message && (
        testData.message.includes('ECONNRESET') || 
        testData.message.includes('timeout') || 
        testData.message.includes('network')
      );
      
      const finalStatus = isSuccess ? 'connected' : (isNetworkError ? 'pending' : 'failed');
      
      // Update host status immediately in the UI
      const finalHosts = [...machines];
      const finalIndex = finalHosts.findIndex(m => m.id === host.id);
      if (finalIndex !== -1) {
        finalMachines[finalIndex] = { 
          ...finalMachines[finalIndex], 
          status: finalStatus,
          lastConnected: isSuccess ? new Date() : finalMachines[finalIndex].lastConnected
        };
        setHosts(finalMachines);
      }
      
      // Show toast notification
      toast({
        title: isSuccess ? 'Success' : (isNetworkError ? 'Warning' : 'Error'),
        description: isSuccess ? 'Host connected successfully' : 
                    (isNetworkError ? 'Connection unstable - host may be temporarily unavailable' : 
                    (testData.message || 'Connection failed')),
        variant: isSuccess ? 'default' : (isNetworkError ? 'default' : 'destructive'),
        duration: 5000,
      });
    } catch (error) {
      console.error(`Error testing connection for ${host.name}:`, error);
      
      // Update host status to pending in case of network exception
      const errorHosts = [...machines];
      const errorIndex = errorHosts.findIndex(m => m.id === host.id);
      if (errorIndex !== -1) {
        errorMachines[errorIndex] = { ...errorMachines[errorIndex], status: 'pending' };
        setHosts(errorMachines);
      }
      
      toast({
        variant: 'default',
        title: 'Warning',
        description: `Connection unstable - host may be temporarily unavailable`,
        duration: 5000,
      });
    }
  };

  // Fetch hosts on component mount
  useEffect(() => {
    fetchMachines();
  }, []);

  // Refresh hosts
  const refreshMachines = async () => {
    setIsRefreshing(true);
    
    if (hosts.length > 0) {
      let successCount = 0;
      let failureCount = 0;
      let pendingCount = 0;
      
      // Create a copy of hosts to update
      const updatedHosts = [...machines];
      
      for (const machine of hosts) {
        try {
          // Update status to pending in UI
          const hostIndex = updatedMachines.findIndex(m => m.id === host.id);
          if (machineIndex !== -1) {
            updatedHosts[hostIndex] = { ...updatedHosts[hostIndex], status: 'pending' };
            setHosts([...updatedMachines]);
          }
          
          // Test connection
          const testResponse = await fetch('/api/hosts/test-connection', {
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

          const testData = await testResponse.json();
          const isSuccess = testResponse.ok && testData.success === true;
          
          // Check for network errors
          const isNetworkError = testData.message && (
            testData.message.includes('ECONNRESET') || 
            testData.message.includes('timeout') || 
            testData.message.includes('network')
          );
          
          const finalStatus = isSuccess ? 'connected' : (isNetworkError ? 'pending' : 'failed');
          
          // Update host status in our local copy
          const finalIndex = updatedMachines.findIndex(m => m.id === host.id);
          if (finalIndex !== -1) {
            updatedMachines[finalIndex] = { 
              ...updatedMachines[finalIndex], 
              status: finalStatus,
              lastConnected: isSuccess ? new Date() : updatedMachines[finalIndex].lastConnected
            };
            setHosts([...updatedMachines]);
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
          const errorIndex = updatedMachines.findIndex(m => m.id === host.id);
          if (errorIndex !== -1) {
            updatedMachines[errorIndex] = { ...updatedMachines[errorIndex], status: 'pending' };
            setHosts([...updatedMachines]);
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
      await fetchMachines();
    }
    
    setIsRefreshing(false);
  };

  // Handle connection success
  const handleConnectionSuccess = (newMachine: Host) => {
    setHosts(prev => [...prev, newMachine]);
  };

  // Handle delete host
  const handleDeleteMachine = (id: string) => {
    setHostToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete host
  const confirmDeleteMachine = async () => {
    if (!hostToDelete) return;
    
    try {
      const response = await fetch(`/api/hosts/${hostToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete host');
      }
      
      setHosts(prev => prev.filter(host => host.id !== hostToDelete));
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting host:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete host',
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
          <h1 className="text-2xl font-bold">{t('virtualization')}</h1>
          <p className="text-muted-foreground">
            {t('manage_virtual_machines')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMachines}
            disabled={isRefreshing}
          >
            <RefreshCcw className={cn("h-4 w-4 mr-2", { "animate-spin": isRefreshing })} />
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
            {t('add_machine')}
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
              <h3 className="text-lg font-medium">{t('no_machines')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('add_machine_description')}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add_machine')}
              </Button>
            </div>
          ) : (
            <>
              <HostOverview
                machines={machines}
                onDelete={handleDeleteMachine}
                onRefresh={fetchMachines}
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
              Are you sure you want to delete this machine? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setHostToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMachine}>Delete</AlertDialogAction>
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