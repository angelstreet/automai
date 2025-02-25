import { Device } from '@/types/virtualization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { STATUS_VARIANTS } from '@/constants/virtualization';
import { Box, Settings, ScrollText, Terminal, BarChart2, Cloud, Server } from 'lucide-react';
import { getConnectionTypeIcon } from '@/lib/utils';

interface DeviceGridProps {
  devices: Device[];
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
  isSelectionMode: boolean;
}

export function DeviceGrid({ devices, selectedItems, onItemSelect, isSelectionMode }: DeviceGridProps) {
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
    <div className="grid grid-cols-2 gap-2 p-2">
      {devices.map(device => (
        <div
          key={device.id}
          className={`
            flex items-center rounded-lg border p-2
            ${selectedItems.has(device.id) ? 'bg-muted/50 border-primary/50' : ''}
            hover:bg-muted/50 cursor-pointer transition-colors
          `}
          onClick={() => onItemSelect(device.id)}
        >
          {isSelectionMode && (
            <Checkbox
              checked={selectedItems.has(device.id)}
              onCheckedChange={() => onItemSelect(device.id)}
              onClick={(e) => e.stopPropagation()}
              className="mr-2"
            />
          )}
          
          <div className="flex flex-1 items-center min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              {renderConnectionIcon(device.connectionType)}
              <span className="text-sm truncate">{device.name}</span>
            </div>
            
            <div className="flex items-center space-x-2 ml-auto">
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Box className="h-3.5 w-3.5" />
                <span>{device.containers.running}/{device.containers.total}</span>
              </div>
              {device.alerts.length > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {device.alerts.length}
                </Badge>
              )}
              <Badge 
                variant="outline"
                className={`${STATUS_VARIANTS[device.status]} flex items-center h-5 px-1.5 text-xs`}
              >
                {device.statusLabel}
              </Badge>
            </div>
            
            <div className="flex gap-0.5 ml-2">
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
        </div>
      ))}
    </div>
  );
} 