import { Machine } from '@/types/virtualization';
import { StatusSummary } from './StatusSummary';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Laptop, Server, Database, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface MachineListProps {
  machines: Machine[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function MachineList({
  machines,
  isLoading = false,
  onRefresh,
  onDelete,
  className,
}: MachineListProps) {
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant;
  
  const statusSummary = {
    connected: machines.filter(m => m.status === 'connected').length,
    failed: machines.filter(m => m.status === 'failed').length,
    pending: machines.filter(m => m.status === 'pending').length,
    total: machines.length,
  };

  // Get the icon based on the machine type
  const getMachineTypeIcon = (type: string) => {
    switch (type) {
      case 'ssh':
        return <Server className="h-5 w-5" />;
      case 'docker':
        return <Laptop className="h-5 w-5" />;
      case 'portainer':
        return <Database className="h-5 w-5" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  };

  // Get status icon based on machine status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Get status badge based on machine status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Format date for last connected
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  // Render empty state when no machines
  if (!isLoading && machines.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
        <Server className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Machines Connected</h3>
        <p className="text-gray-500 text-center mb-6">
          Click the "Connect" button to add your first remote machine or container host.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="p-2">
        <StatusSummary 
          vmStatusSummary={{
            running: statusSummary.connected,
            warning: statusSummary.pending,
            error: statusSummary.failed,
            total: statusSummary.total,
          }}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
        {machines.map((machine) => (
          <Card key={machine.id} className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getMachineTypeIcon(machine.type)}
                  <CardTitle className="text-lg">{machine.name}</CardTitle>
                </div>
                {getStatusBadge(machine.status)}
              </div>
              <CardDescription className="flex items-center gap-1">
                {machine.ip}{machine.port ? `:${machine.port}` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {machine.description && (
                  <p className="text-sm text-gray-500">{machine.description}</p>
                )}
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(machine.status)}
                    <span>{machine.status === 'connected' ? 'Connected' : 
                           machine.status === 'failed' ? 'Connection failed' : 'Connecting...'}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {machine.status === 'connected' && `Last connected: ${formatDate(machine.lastConnected)}`}
                    {machine.status === 'failed' && machine.errorMessage && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline">Error details</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{machine.errorMessage}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  {machine.type === 'ssh' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/${tenant}/terminals/${machine.name}`)}
                    >
                      Open Terminal
                    </Button>
                  )}
                  
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => onDelete(machine.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 