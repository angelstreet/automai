import { Device } from '@/types/virtualization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { STATUS_VARIANTS } from '@/constants/virtualization';
import { Box, Settings, ScrollText, Terminal, BarChart2, Cloud, Server } from 'lucide-react';
import { getConnectionTypeIcon } from '@/lib/utils';
import { useParams } from 'next/navigation';

interface DeviceGridProps {
  devices: Device[];
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
  isSelectionMode: boolean;
}

export function DeviceGrid({ devices, selectedItems, onItemSelect, isSelectionMode }: DeviceGridProps) {
  const params = useParams();
  
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
          `}
        >
          {isSelectionMode && (
            <Checkbox
              checked={selectedItems.has(device.id)}
              onCheckedChange={() => onItemSelect(device.id)}
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
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/settings?devices=${device.id}`;
                }}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/logs?devices=${device.id}`;
                }}
              >
                <ScrollText className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/terminals?devices=${device.name}`;
                }}
              >
                <Terminal className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/analytics?devices=${device.id}`;
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