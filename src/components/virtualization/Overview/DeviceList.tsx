import { Device } from '@/types/virtualization';
import { StatusSummary } from './StatusSummary';
import { DeviceGrid } from './DeviceGrid';
import { DeviceTable } from './DeviceTable';

interface DeviceListProps {
  devices: Device[];
  viewMode: 'grid' | 'table';
  isSelectionMode: boolean;
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
  onStatusFilter: (status: string | null) => void;
  selectedFilters: Set<string>;
}

export function DeviceList({
  devices,
  viewMode,
  isSelectionMode,
  selectedItems,
  onItemSelect,
  onStatusFilter,
  selectedFilters,
}: DeviceListProps) {
  const vmStatusSummary = {
    running: devices.filter(d => d.status === 'running').length,
    warning: devices.filter(d => d.status === 'warning').length,
    error: devices.filter(d => d.status === 'error').length,
    total: devices.length,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="p-4 border rounded-md">
        <h2 className="text-lg font-bold mb-4">DeviceList Status Summary</h2>
        <StatusSummary 
          vmStatusSummary={vmStatusSummary} 
          onStatusFilter={onStatusFilter} 
          selectedFilters={selectedFilters}
        />
      </div>
      
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
  );
} 