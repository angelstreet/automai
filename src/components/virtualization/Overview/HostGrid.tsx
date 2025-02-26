import { Machine } from '@/types/virtualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Terminal, BarChart2, RefreshCw, XCircle, MoreHorizontal, AlertTriangle, Server, Laptop, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface HostGridProps {
  machines: Machine[];
  selectedMachines: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (machine: Machine) => void;
}

export function HostGrid({
  machines,
  selectedMachines,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
}: HostGridProps) {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('Virtualization');

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

  // Format date for last connected
  const formatDate = (date: Date | undefined) => {
    if (!date) return t('never');
    return new Date(date).toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {machines.map((machine) => (
        <Card key={machine.id} className={cn("overflow-hidden", {
          "border-primary": selectedMachines.has(machine.id),
          "opacity-70": selectMode && !selectedMachines.has(machine.id)
        })}>
          <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col space-y-1.5">
              <CardTitle className="text-base font-semibold truncate max-w-[200px]">
                {machine.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {machine.ip}{machine.port ? `:${machine.port}` : ''}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {selectMode && (
                <Checkbox
                  checked={selectedMachines.has(machine.id)}
                  onCheckedChange={() => onSelect(machine.id)}
                  aria-label="Select machine"
                />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/${params.locale}/${params.tenant}/virtualization/terminal/${machine.id}`)}>
                    <Terminal className="mr-2 h-4 w-4" />
                    <span>Terminal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/${params.locale}/${params.tenant}/virtualization/metrics/${machine.id}`)}>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    <span>Metrics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTestConnection?.(machine)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    <span>{t('testConnection')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete?.(machine.id)} className="text-destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center text-xs text-muted-foreground">
                <div className="mr-2">{getMachineTypeIcon(machine.type)}</div>
                <span className="capitalize">{machine.type}</span>
              </div>
              {machine.user && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>User: {machine.user}</span>
                </div>
              )}
              {machine.lastConnected && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>Last connected: {formatDate(new Date(machine.lastConnected))}</span>
                </div>
              )}
              {machine.status === 'failed' && machine.errorMessage && (
                <div className="flex items-center text-xs text-destructive mt-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  <span className="truncate">{machine.errorMessage}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 