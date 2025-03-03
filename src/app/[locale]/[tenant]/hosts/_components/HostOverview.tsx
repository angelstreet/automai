import { Grid, List } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { useToast } from '@/components/shadcn/use-toast';
import { cn } from '@/lib/utils';
import { Host } from '@/types/hosts';

import { ConnectHostDialog } from './ConnectHostDialog';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';
import { StatusSummary } from './StatusSummary';

interface HostOverviewProps {
  hosts: Host[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
  onTestConnection: (host: Host) => void;
  className?: string;
}

export function HostOverview({
  hosts,
  onDelete,
  onRefresh,
  onTestConnection,
  className,
}: HostOverviewProps) {
  const { toast } = useToast();
  // State for view mode (grid or table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // State for selection
  const [selectedHosts, setSelectedMachines] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // State for status filtering
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // State for connecting host dialog
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Filter hosts by status if filter is active
  const filteredHosts = statusFilter
    ? hosts.filter((m) => {
        if (statusFilter === 'running') return m.status === 'connected';
        if (statusFilter === 'warning') return m.status === 'pending';
        if (statusFilter === 'error') return m.status === 'failed';
        return true;
      })
    : hosts;

  const statusSummary = {
    connected: hosts.filter((m) => m.status === 'connected').length,
    failed: hosts.filter((m) => m.status === 'failed').length,
    pending: hosts.filter((m) => m.status === 'pending').length,
    total: hosts.length,
  };

  // Handle host selection
  const handleSelect = (id: string) => {
    const newSelection = new Set(selectedHosts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMachines(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedHosts.size === filteredHosts.length) {
      setSelectedMachines(new Set());
    } else {
      setSelectedMachines(new Set(filteredHosts.map((m) => m.id)));
    }
  };

  // Handle cancel selection
  const handleCancelSelection = () => {
    setSelectedMachines(new Set());
    setSelectMode(false);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (onDelete && selectedHosts.size > 0) {
      selectedHosts.forEach((id) => onDelete(id));
      setSelectedMachines(new Set());
      setSelectMode(false);
    }
  };

  // Handle bulk refresh
  const _handleBulkRefresh = async () => {
    if (onTestConnection) {
      let successCount = 0;
      for (const host of filteredHosts) {
        try {
          await onTestConnection(host);
          successCount++;
        } catch (error) {
          console.error('Error refreshing connection:', error);
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Connections refreshed',
          description: `Successfully refreshed ${successCount} host${successCount > 1 ? 's' : ''}`,
          duration: 5000,
        });
      }
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex justify-between items-center p-2">
        <StatusSummary
          vmStatusSummary={{
            running: statusSummary.connected,
            warning: statusSummary.pending,
            error: statusSummary.failed,
            total: statusSummary.total,
          }}
          onStatusFilter={(status) => setStatusFilter(status)}
          selectedFilters={statusFilter ? new Set([statusFilter]) : new Set()}
        />

        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelSelection}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedHosts.size === 0}
              >
                Delete ({selectedHosts.size})
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectMode(true)}
                disabled={filteredHosts.length < 2}
              >
                Select
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <>
          {filteredHosts.length > 0 ? (
            <HostGrid
              hosts={filteredHosts}
              selectedHosts={selectedHosts}
              selectMode={selectMode}
              onSelect={handleSelect}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No hosts match the current filter</p>
              <Button variant="outline" onClick={() => setStatusFilter(null)}>
                Clear Filter
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {filteredHosts.length > 0 ? (
            <HostTable
              hosts={filteredHosts}
              selectedHosts={selectedHosts}
              selectMode={selectMode}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No hosts match the current filter</p>
              <Button variant="outline" onClick={() => setStatusFilter(null)}>
                Clear Filter
              </Button>
            </div>
          )}
        </>
      )}

      <ConnectHostDialog
        open={showConnectDialog}
        onOpenChange={setShowConnectDialog}
        onSuccess={onRefresh}
      />
    </div>
  );
}
