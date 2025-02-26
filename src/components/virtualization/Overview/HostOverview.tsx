import { useState } from 'react';
import { Machine } from '@/types/virtualization';
import { StatusSummary } from './StatusSummary';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Laptop, Server, Database, AlertTriangle, CheckCircle, XCircle, Clock, Grid, List, MoreHorizontal, Terminal, BarChart2, LayoutGrid, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";

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
  const router = useRouter();
  const params = useParams();
  const tenant = params.tenant;
  const locale = params.locale;
  const t = useTranslations('Virtualization');
  const commonT = useTranslations('Common');
  
  // State for view mode (grid or table)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(machines.length / itemsPerPage);
  
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
  
  // Get paginated machines
  const paginatedMachines = filteredMachines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
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
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{t('connected')}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{t('failed')}</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{t('pending')}</Badge>;
      default:
        return <Badge variant="outline">{t('unknown')}</Badge>;
    }
  };

  // Format date for last connected
  const formatDate = (date: Date | undefined) => {
    if (!date) return t('never');
    return new Date(date).toLocaleString();
  };

  // Handle machine selection
  const toggleMachineSelection = (id: string) => {
    const newSelection = new Set(selectedMachines);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMachines(newSelection);
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedMachines.size === paginatedMachines.length) {
      setSelectedMachines(new Set());
    } else {
      setSelectedMachines(new Set(paginatedMachines.map(m => m.id)));
    }
  };

  // Handle cancel selection
  const cancelSelection = () => {
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

  // Handle status filter
  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
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

  // In the grid view, add a test connection button
  const renderGridView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMachines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((machine) => (
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
                    onCheckedChange={() => toggleMachineSelection(machine.id)}
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
  };

  // In the table view, add a test connection button
  const renderTableView = () => {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedMachines.size === paginatedMachines.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Connected</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMachines.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((machine) => (
              <TableRow key={machine.id} className={cn({
                "bg-muted/50": selectedMachines.has(machine.id),
              })}>
                {selectMode && (
                  <TableCell>
                    <Checkbox
                      checked={selectedMachines.has(machine.id)}
                      onCheckedChange={() => toggleMachineSelection(machine.id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{machine.name}</TableCell>
                <TableCell>{machine.ip}{machine.port ? `:${machine.port}` : ''}</TableCell>
                <TableCell>{getStatusBadge(machine.status)}</TableCell>
                <TableCell>{machine.lastConnected ? formatDate(new Date(machine.lastConnected)) : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/terminals/${machine.name}`)}
                      disabled={machine.status !== 'connected'}
                    >
                      <Terminal className="h-4 w-4 mr-2" />
                      Terminal
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onTestConnection?.(machine)}>
                          Refresh
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/metrics/${machine.name}`)}>
                          Metrics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/logs/${machine.name}`)}>
                          Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete?.(machine.id)} className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
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
          onStatusFilter={handleStatusFilter}
          selectedFilters={statusFilter ? new Set([statusFilter]) : new Set()}
        />
        
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={cancelSelection}
              >
                Cancel
              </Button>
              {selectedMachines.size === 1 && (
                <>
                  {Array.from(selectedMachines)[0] && paginatedMachines.find(m => m.id === Array.from(selectedMachines)[0])?.type === 'ssh' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const machineId = Array.from(selectedMachines)[0];
                        const machine = paginatedMachines.find(m => m.id === machineId);
                        if (machine) {
                          // Store in session storage for persistence
                          sessionStorage.setItem('selectedMachines', JSON.stringify([machineId]));
                          router.push(`/${locale}/${tenant}/terminals/${machine.name}`);
                        }
                      }}
                    >
                      <Terminal className="h-4 w-4 mr-2" />
                      Terminal
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const machineId = Array.from(selectedMachines)[0];
                      const machine = paginatedMachines.find(m => m.id === machineId);
                      if (machine) {
                        router.push(`/${locale}/${tenant}/analytics/machines/${machine.id}`);
                      }
                    }}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </>
              )}
              {selectedMachines.size > 1 && selectedMachines.size <= 4 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const machineIds = Array.from(selectedMachines);
                    const sshMachines = machineIds
                      .map(id => paginatedMachines.find(m => m.id === id))
                      .filter(m => m?.type === 'ssh');
                    
                    if (sshMachines.length > 0) {
                      // Store in session storage for persistence
                      sessionStorage.setItem('selectedMachines', JSON.stringify(machineIds));
                      // Use the first machine name in the URL, but will load all selected machines
                      router.push(`/${locale}/${tenant}/terminals/${sshMachines[0]?.name}?count=${sshMachines.length}`);
                    }
                  }}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Multiple Terminals ({selectedMachines.size})
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                disabled={selectedMachines.size === 0}
              >
                Delete Selected ({selectedMachines.size})
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
      
      {viewMode === 'grid' ? renderGridView() : renderTableView()}
      
      {totalPages > 1 && (
        <Pagination className="py-4">
          <PaginationContent>
            <PaginationItem>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Previous page</span>
                &larr;
              </Button>
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <PaginationItem key={page}>
                <Button 
                  variant={page === currentPage ? "default" : "outline"}
                  size="icon"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next page</span>
                &rarr;
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
} 