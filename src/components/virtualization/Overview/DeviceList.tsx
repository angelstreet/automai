import { Device } from '@/types/virtualization';
import { StatusSummary } from './StatusSummary';
import { DeviceGrid } from './DeviceGrid';
import { DeviceTable } from './DeviceTable';
import { cn } from '@/lib/utils';

interface DeviceListProps {
  devices: Device[];
  viewMode: 'grid' | 'table';
  isSelectionMode: boolean;
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
  onStatusFilter: (status: string | null) => void;
  selectedFilters: Set<string>;
  className?: string;
}

export function DeviceList({
  devices,
  viewMode,
  isSelectionMode,
  selectedItems,
  onItemSelect,
  onStatusFilter,
  selectedFilters,
  className,
}: DeviceListProps) {
  const vmStatusSummary = {
    running: devices.filter(d => d.status === 'running').length,
    warning: devices.filter(d => d.status === 'warning').length,
    error: devices.filter(d => d.status === 'error').length,
    total: devices.length,
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="p-2">
        <StatusSummary 
          vmStatusSummary={vmStatusSummary} 
          onStatusFilter={onStatusFilter} 
          selectedFilters={selectedFilters}
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        {viewMode === 'grid' ? (
          <DeviceGrid
            devices={devices}
            selectedItems={selectedItems}
            onItemSelect={onItemSelect}
            isSelectionMode={isSelectionMode}
          />
        ) : (
          <DeviceTable
            devices={devices}
            selectedItems={selectedItems}
            onItemSelect={onItemSelect}
            isSelectionMode={isSelectionMode}
          />
        )}
      </div>
    </div>
  );
} 