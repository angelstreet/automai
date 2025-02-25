import { Device } from '@/types/virtualization';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { STATUS_VARIANTS } from '@/constants/virtualization';
import { Box, Settings, ScrollText, Terminal, BarChart2, Cloud, Server } from 'lucide-react';
import { getConnectionTypeIcon } from '@/lib/utils';
import { useParams } from 'next/navigation';

interface DeviceTableProps {
  devices: Device[];
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
  isSelectionMode: boolean;
}

export function DeviceTable({ devices, selectedItems, onItemSelect, isSelectionMode }: DeviceTableProps) {
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
    <div className="w-full">
      <div className="flex flex-col">
        <div className="flex items-center px-2 py-0.5 bg-muted/50 text-xs font-medium text-muted-foreground">
          {isSelectionMode && <div className="w-5" />}
          <div className="flex-1">Name</div>
          <div className="w-20 text-center">Containers</div>
          <div className="w-20 text-center">Status</div>
          <div className="w-20 text-center">Actions</div>
        </div>
        
        {devices.map(device => (
          <div
            key={device.id}
            className={`
              flex items-center px-2 py-0.5 border-b last:border-b-0
              ${selectedItems.has(device.id) ? 'bg-muted/50' : ''}
            `}
          >
            {isSelectionMode && (
              <div className="w-5">
                <Checkbox
                  checked={selectedItems.has(device.id)}
                  onCheckedChange={() => onItemSelect(device.id)}
                />
              </div>
            )}
            
            <div className="flex-1 flex items-center space-x-1.5 min-w-0">
              {renderConnectionIcon(device.connectionType)}
              <span className="text-xs truncate">{device.name}</span>
              {device.alerts.length > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  {device.alerts.length}
                </Badge>
              )}
            </div>
            
            <div className="w-20 flex items-center justify-center space-x-1 text-[10px] text-muted-foreground">
              <Box className="h-3 w-3" />
              <span>{device.containers.running}/{device.containers.total}</span>
            </div>
            
            <div className="w-20 flex items-center justify-center">
              <Badge 
                variant="outline"
                className={`${STATUS_VARIANTS[device.status]} flex items-center h-4 px-1 text-[10px]`}
              >
                {device.statusLabel}
              </Badge>
            </div>
            
            <div className="w-20 flex gap-0.5 justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/settings?devices=${device.id}`;
                }}
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/logs?devices=${device.id}`;
                }}
              >
                <ScrollText className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/terminals?devices=${device.name}`;
                }}
              >
                <Terminal className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  window.location.href = `/${params.locale}/${params.tenant}/virtualization/analytics?devices=${device.id}`;
                }}
              >
                <BarChart2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 