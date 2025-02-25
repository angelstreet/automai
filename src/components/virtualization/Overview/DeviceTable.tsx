import { Device } from '@/types/virtualization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { STATUS_VARIANTS } from '@/constants/virtualization';
import { Box, Settings, ScrollText, Terminal, BarChart2, Cloud, Server } from 'lucide-react';
import { getConnectionTypeIcon } from '@/lib/utils';

interface DeviceTableProps {
  devices: Device[];
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
  isSelectionMode: boolean;
}

export function DeviceTable({ devices, selectedItems, onItemSelect, isSelectionMode }: DeviceTableProps) {
  const renderConnectionIcon = (type: string) => {
    switch (type) {
      case 'portainer':
        return <Cloud className="h-4 w-4 text-blue-500" />;
      case 'docker':
        return <Box className="h-4 w-4 text-green-500" />;
      case 'ssh':
        return <Server className="h-4 w-4 text-gray-500" />;
      default:
        return <Server className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col">
        <div className="flex items-center px-2 py-1 bg-muted/50 text-xs font-medium text-muted-foreground">
          {isSelectionMode && <div className="w-6" />}
          <div className="flex-1">Name</div>
          <div className="w-24 text-center">Containers</div>
          <div className="w-24 text-center">Status</div>
          <div className="w-24" />
        </div>
        
        {devices.map(device => (
          <div
            key={device.id}
            className={`
              flex items-center px-2 py-1 border-b last:border-b-0
              ${selectedItems.has(device.id) ? 'bg-muted/50' : ''}
              hover:bg-muted/50 cursor-pointer transition-colors
            `}
            onClick={() => onItemSelect(device.id)}
          >
            {isSelectionMode && (
              <div className="w-6">
                <Checkbox
                  checked={selectedItems.has(device.id)}
                  onCheckedChange={() => onItemSelect(device.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            <div className="flex-1 flex items-center space-x-2 min-w-0">
              {renderConnectionIcon(device.connectionType)}
              <span className="text-sm truncate">{device.name}</span>
              {device.alerts.length > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {device.alerts.length}
                </Badge>
              )}
            </div>
            
            <div className="w-24 flex items-center justify-center space-x-1 text-xs text-muted-foreground">
              <Box className="h-3.5 w-3.5" />
              <span>{device.containers.running}/{device.containers.total}</span>
            </div>
            
            <div className="w-24 flex items-center justify-center">
              <Badge 
                variant="outline"
                className={`${STATUS_VARIANTS[device.status]} flex items-center h-5 px-1.5 text-xs`}
              >
                {device.statusLabel}
              </Badge>
            </div>
            
            <div className="w-24 flex gap-0.5 justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/[locale]/[tenant]/virtualization/settings?devices=${device.id}`;
                }}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/[locale]/[tenant]/virtualization/logs?devices=${device.id}`;
                }}
              >
                <ScrollText className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/[locale]/[tenant]/virtualization/terminals?devices=${device.id}`;
                }}
              >
                <Terminal className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/[locale]/[tenant]/virtualization/analytics?devices=${device.id}`;
                }}
              >
                <BarChart2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 