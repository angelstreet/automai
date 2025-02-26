import { useState } from 'react';
import { Machine } from '@/types/virtualization';
import { StatusSummary } from './StatusSummary';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Grid, List } from 'lucide-react';

interface HostOverviewProps {
  machines: Machine[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (machine: Machine) => void;
  className?: string;
}

export function HostOverview({
  machines,
  isLoading = false,
  onRefresh,
  onDelete,
  onTestConnection,
  className,
}: HostOverviewProps) {
  // State for view mode (grid or table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // State for selection
  const [selectedMachines, setSelectedMachines] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  
  // State for status filtering
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Filter machines by status if filter is active
  const filteredMachines = statusFilter 
    ? machines.filter(m => {
        if (statusFilter === 'running') return m.status === 'connected';
        if (statusFilter === 'warning') return m.status === 'pending';
        if (statusFilter === 'error') return m.status === 'failed';
        return true;
      })
    : machines;

  const statusSummary = {
    connected: machines.filter(m => m.status === 'connected').length,
    failed: machines.filter(m => m.status === 'failed').length,
    pending: machines.filter(m => m.status === 'pending').length,
    total: machines.length,
  };

  // Handle machine selection
  const handleSelect = (id: string) => {
    const newSelection = new Set(selectedMachines);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMachines(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedMachines.size === filteredMachines.length) {
      setSelectedMachines(new Set());
    } else {
      setSelectedMachines(new Set(filteredMachines.map(m => m.id)));
    }
  };

  // Handle cancel selection
  const handleCancelSelection = () => {
    setSelectedMachines(new Set());
    setSelectMode(false);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (onDelete && selectedMachines.size > 0) {
      selectedMachines.forEach(id => onDelete(id));
      setSelectedMachines(new Set());
      setSelectMode(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelSelection}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                disabled={selectedMachines.size === 0}
              >
                Delete ({selectedMachines.size})
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectMode(true)}
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
          {filteredMachines.length > 0 ? (
            <HostGrid
              machines={filteredMachines}
              selectedMachines={selectedMachines}
              selectMode={selectMode}
              onSelect={handleSelect}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No machines match the current filter</p>
              <Button variant="outline" onClick={() => setStatusFilter(null)}>
                Clear Filter
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          {filteredMachines.length > 0 ? (
            <HostTable
              machines={filteredMachines}
              selectedMachines={selectedMachines}
              selectMode={selectMode}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No machines match the current filter</p>
              <Button variant="outline" onClick={() => setStatusFilter(null)}>
                Clear Filter
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 