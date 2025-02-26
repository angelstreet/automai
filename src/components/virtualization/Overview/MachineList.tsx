import { useState } from 'react';
import { Machine } from '@/types/virtualization';
import { StatusSummary } from './StatusSummary';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Laptop, Server, Database, AlertTriangle, CheckCircle, XCircle, Clock, Grid, List, MoreHorizontal, Terminal, BarChart2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
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
                          router.push(`/${tenant}/terminals/${machine.name}`);
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
                        router.push(`/${tenant}/analytics/machines/${machine.id}`);
                      }
                    }}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </>
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
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
          {paginatedMachines.map((machine) => (
            <Card key={machine.id} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  {selectMode && (
                    <Checkbox 
                      checked={selectedMachines.has(machine.id)} 
                      onCheckedChange={() => toggleMachineSelection(machine.id)}
                      className="mr-2"
                    />
                  )}
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
                        disabled={machine.status !== 'connected'}
                      >
                        Open Terminal
                      </Button>
                    )}
                    
                    {onDelete && !selectMode && (
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
      ) : (
        <div className="p-2">
          <Table>
            <TableHeader>
              <TableRow>
                {selectMode && (
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedMachines.size === paginatedMachines.length && paginatedMachines.length > 0} 
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Connected</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMachines.map((machine) => (
                <TableRow key={machine.id}>
                  {selectMode && (
                    <TableCell>
                      <Checkbox 
                        checked={selectedMachines.has(machine.id)} 
                        onCheckedChange={() => toggleMachineSelection(machine.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getMachineTypeIcon(machine.type)}
                      {machine.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {machine.type.charAt(0).toUpperCase() + machine.type.slice(1)}
                  </TableCell>
                  <TableCell>
                    {machine.ip}{machine.port ? `:${machine.port}` : ''}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(machine.status)}
                      <span>{machine.status === 'connected' ? 'Connected' : 
                             machine.status === 'failed' ? 'Failed' : 'Pending'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(machine.lastConnected)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {machine.type === 'ssh' && (
                          <DropdownMenuItem 
                            onClick={() => router.push(`/${tenant}/terminals/${machine.name}`)}
                            disabled={machine.status !== 'connected'}
                          >
                            Open Terminal
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            className="text-red-500"
                            onClick={() => onDelete(machine.id)}
                          >
                            Remove
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
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