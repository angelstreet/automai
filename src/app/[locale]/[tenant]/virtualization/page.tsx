'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { RefreshCcw, LayoutGrid, Table2, ScrollText, Terminal, BarChart2, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MachineList } from '@/components/virtualization/Overview/MachineList';
import { Machine } from '@/types/virtualization';
import { ConnectMachineDialog } from '@/components/virtualization/Overview/ConnectMachineDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function VirtualizationPage() {
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
      const response = await fetch('/api/virtualization/machines');
      
      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load machines',
        });
        return;
      }
      
      const data = await response.json();
      setMachines(data.data || []);
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

  // Initial fetch
  useEffect(() => {
    fetchMachines();
  }, []);

  // Handle refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMachines();
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
      const response = await fetch(`/api/virtualization/machines/${machineToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete machine');
      }
      
      setMachines(prev => prev.filter(machine => machine.id !== machineToDelete));
      toast({
        title: 'Success',
        description: 'Machine deleted successfully',
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
    <div className="flex-1 space-y-2 pt-2 h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] flex flex-col overflow-hidden">
      {/* Title section with buttons */}
      <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Remote Machines</h1>
          <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                    size="sm" 
                    className="h-7"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                  <p>Refresh</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
        </div>
        <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
            size="sm" 
            onClick={() => setIsDialogOpen(true)}
          >
            Connect
                                  </Button>
          
          <ConnectMachineDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
            onSuccess={handleConnectionSuccess}
          />
        </div>
      </div>
      
      <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-12 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
                    </div>
          ) : (
            <MachineList
              machines={machines}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onDelete={handleDeleteMachine}
              className="h-full"
            />
          )}
          </div>
                      </div>

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
    </div>
  );
} 