'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RefreshCcw, LayoutGrid, Table2, ScrollText, Terminal, BarChart2, Settings, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { HostOverview } from '@/components/virtualization/Overview/HostOverview';
import { Machine } from '@/types/virtualization';
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
  const [machineToDelete, setMachineToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Fetch machines from API
  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hosts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }
      
      const data = await response.json();
      // Ensure all machines have a status, defaulting to 'pending' if not set
      const machinesWithStatus = (data.data || []).map((machine: Machine) => ({
        ...machine,
        status: machine.status || 'pending'
      }));
      setMachines(machinesWithStatus);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load machines',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Test a single machine connection
  const testMachineConnection = async (machine: Machine) => {
    try {
      // Update the specific machine to testing status
      const machineIndex = machines.findIndex(m => m.id === machine.id);
      if (machineIndex === -1) return;
      
      const updatedMachines = [...machines];
      updatedMachines[machineIndex] = { ...machines[machineIndex], status: 'pending' };
      setMachines(updatedMachines);
      
      // Test connection
      const testResponse = await fetch('/api/hosts/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: machine.type,
          ip: machine.ip,
          port: machine.port,
          username: machine.user,
          machineId: machine.id,
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
      
      // Update machine status immediately in the UI
      const finalMachines = [...machines];
      const finalIndex = finalMachines.findIndex(m => m.id === machine.id);
      if (finalIndex !== -1) {
        finalMachines[finalIndex] = { 
          ...finalMachines[finalIndex], 
          status: finalStatus,
          lastConnected: isSuccess ? new Date() : finalMachines[finalIndex].lastConnected
        };
        setMachines(finalMachines);
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
      console.error(`Error testing connection for ${machine.name}:`, error);
      
      // Update machine status to pending in case of network exception
      const errorMachines = [...machines];
      const errorIndex = errorMachines.findIndex(m => m.id === machine.id);
      if (errorIndex !== -1) {
        errorMachines[errorIndex] = { ...errorMachines[errorIndex], status: 'pending' };
        setMachines(errorMachines);
      }
      
      toast({
        variant: 'default',
        title: 'Warning',
        description: `Connection unstable - host may be temporarily unavailable`,
        duration: 5000,
      });
    }
  };

  // Fetch machines on component mount
  useEffect(() => {
    fetchMachines();
  }, []);

  // Refresh machines
  const refreshMachines = async () => {
    setIsRefreshing(true);
    
    if (machines.length > 0) {
      let successCount = 0;
      let failureCount = 0;
      let pendingCount = 0;
      
      // Create a copy of machines to update
      const updatedMachines = [...machines];
      
      for (const machine of machines) {
        try {
          // Update status to pending in UI
          const machineIndex = updatedMachines.findIndex(m => m.id === machine.id);
          if (machineIndex !== -1) {
            updatedMachines[machineIndex] = { ...updatedMachines[machineIndex], status: 'pending' };
            setMachines([...updatedMachines]);
          }
          
          // Test connection
          const testResponse = await fetch('/api/hosts/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: machine.type,
              ip: machine.ip,
              port: machine.port,
              username: machine.user,
              machineId: machine.id,
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
          
          // Update machine status in our local copy
          const finalIndex = updatedMachines.findIndex(m => m.id === machine.id);
          if (finalIndex !== -1) {
            updatedMachines[finalIndex] = { 
              ...updatedMachines[finalIndex], 
              status: finalStatus,
              lastConnected: isSuccess ? new Date() : updatedMachines[finalIndex].lastConnected
            };
            setMachines([...updatedMachines]);
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
          
          // Update machine status to pending in our local copy
          const errorIndex = updatedMachines.findIndex(m => m.id === machine.id);
          if (errorIndex !== -1) {
            updatedMachines[errorIndex] = { ...updatedMachines[errorIndex], status: 'pending' };
            setMachines([...updatedMachines]);
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
  const handleConnectionSuccess = (newMachine: Machine) => {
    setMachines(prev => [...prev, newMachine]);
  };

  // Handle delete machine
  const handleDeleteMachine = (id: string) => {
    setMachineToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete machine
  const confirmDeleteMachine = async () => {
    if (!machineToDelete) return;
    
    try {
      const response = await fetch(`/api/hosts/${machineToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete machine');
      }
      
      setMachines(prev => prev.filter(machine => machine.id !== machineToDelete));
      toast({
        title: 'Success',
        description: 'Host deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete machine',
      });
    } finally {
      setMachineToDelete(null);
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
          {machines.length === 0 ? (
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
                onTestConnection={testMachineConnection}
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
            <AlertDialogCancel onClick={() => setMachineToDelete(null)}>Cancel</AlertDialogCancel>
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