'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Terminal,
  BarChart3,
  Search,
  FilterX,
  RefreshCcw,
  ChevronDown,
  Settings,
  Server
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock data for demonstration
const MOCK_DEVICES = [
  {
    id: '1',
    name: 'vm-tenant1-prod',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'portainer',
    alerts: [],
    containers: { total: 8, running: 8 }
  },
  {
    id: '2',
    name: 'vm-tenant2-dev',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 6, running: 6 }
  },
  {
    id: '3',
    name: 'vm-tenant3-staging',
    status: 'error',
    statusLabel: 'Error',
    connectionType: 'ssh',
    alerts: ['memory', 'cpu'],
    containers: { total: 8, running: 4 }
  },
  {
    id: '4',
    name: 'vm-tenant4-test',
    status: 'warning',
    statusLabel: 'Warning',
    connectionType: 'portainer',
    alerts: ['cpu'],
    containers: { total: 10, running: 6 }
  },
  {
    id: '5',
    name: 'vm-tenant5-dev',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 4, running: 4 }
  },
  {
    id: '6',
    name: 'vm-tenant6-prod',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'portainer',
    alerts: [],
    containers: { total: 12, running: 12 }
  },
  {
    id: '7',
    name: 'vm-tenant7-staging',
    status: 'warning',
    statusLabel: 'Warning',
    connectionType: 'ssh',
    alerts: ['cpu'],
    containers: { total: 6, running: 5 }
  },
  {
    id: '8',
    name: 'vm-tenant8-test',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 3, running: 3 }
  },
  {
    id: '9',
    name: 'vm-tenant9-dev',
    status: 'error',
    statusLabel: 'Error',
    connectionType: 'portainer',
    alerts: ['memory'],
    containers: { total: 8, running: 2 }
  },
  {
    id: '10',
    name: 'vm-tenant10-prod',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 5, running: 5 }
  },
  {
    id: '11',
    name: 'vm-tenant11-staging',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'ssh',
    alerts: [],
    containers: { total: 7, running: 7 }
  },
  {
    id: '12',
    name: 'vm-tenant12-dev',
    status: 'warning',
    statusLabel: 'Warning',
    connectionType: 'docker',
    alerts: ['cpu'],
    containers: { total: 9, running: 7 }
  },
  {
    id: '13',
    name: 'vm-tenant13-prod',
    status: 'error',
    statusLabel: 'Error',
    connectionType: 'portainer',
    alerts: ['memory', 'cpu'],
    containers: { total: 10, running: 3 }
  },
  {
    id: '14',
    name: 'vm-tenant14-test',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 4, running: 4 }
  },
  {
    id: '15',
    name: 'vm-tenant15-dev',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'ssh',
    alerts: [],
    containers: { total: 6, running: 6 }
  },
  {
    id: '16',
    name: 'vm-tenant16-prod',
    status: 'warning',
    statusLabel: 'Warning',
    connectionType: 'portainer',
    alerts: ['cpu'],
    containers: { total: 8, running: 6 }
  },
  {
    id: '17',
    name: 'vm-tenant17-staging',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 5, running: 5 }
  },
  {
    id: '18',
    name: 'vm-tenant18-test',
    status: 'error',
    statusLabel: 'Error',
    connectionType: 'ssh',
    alerts: ['memory'],
    containers: { total: 7, running: 2 }
  },
  {
    id: '19',
    name: 'vm-tenant19-dev',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'portainer',
    alerts: [],
    containers: { total: 9, running: 9 }
  },
  {
    id: '20',
    name: 'vm-tenant20-prod',
    status: 'running',
    statusLabel: 'Running',
    connectionType: 'docker',
    alerts: [],
    containers: { total: 11, running: 11 }
  }
];

export default function VirtualizationPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const tenant = params.tenant as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [devices, setDevices] = useState(MOCK_DEVICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [newVMConfig, setNewVMConfig] = useState({
    name: '',
    description: '',
    type: 'vm', // vm, docker, or portainer
    image: '',
    cpu: '1',
    memory: '1024',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Calculate VM status summary
  const vmStatusSummary = {
    running: devices.filter(d => d.status === 'running').length,
    warning: devices.filter(d => d.status === 'warning').length,
    error: devices.filter(d => d.status === 'error').length,
    total: devices.length
  };

  // Calculate alert summary
  const alertSummary = {
    memory: devices.filter(d => d.alerts.includes('memory')).length,
    cpu: devices.filter(d => d.alerts.includes('cpu')).length,
    error: devices.filter(d => d.status === 'error').length,
    total: devices.filter(d => d.alerts.length > 0).length
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'portainer':
        return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600 h-5 w-5 flex items-center justify-center p-0">P</Badge>;
      case 'docker':
        return <Badge variant="secondary" className="bg-green-500 hover:bg-green-600 h-5 w-5 flex items-center justify-center p-0">D</Badge>;
      case 'ssh':
        return <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 h-5 w-5 flex items-center justify-center p-0">S</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs py-0 h-5">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Running
        </Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs py-0 h-5">
          <AlertCircle className="mr-1 h-3 w-3" /> Warning
        </Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs py-0 h-5">
          <AlertCircle className="mr-1 h-3 w-3" /> Error
        </Badge>;
      default:
        return null;
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // This would be replaced with actual API call
      console.log('Creating new VM configuration:', newVMConfig);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close dialog
      setNewVMConfig({
        name: '',
        description: '',
        type: 'vm',
        image: '',
        cpu: '1',
        memory: '1024',
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error creating VM configuration:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectItem = (id: string) => {
    if (isSelectionMode) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === currentItems.length) {
      // If all are selected, deselect all
      setSelectedItems(new Set());
    } else {
      // Otherwise, select all current items
      setSelectedItems(new Set(currentItems.map(item => item.id)));
    }
  };

  // Filter devices by search term and status
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.alerts.some(alert => alert.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter ? device.status === statusFilter : true;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate total pages
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  
  // Calculate current page items
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredDevices.slice(startIndex, endIndex);

  // Force pagination to show for testing
  const shouldShowPagination = true;

  const handleActionClick = (deviceId: string, tab: string) => {
    setSelectedDeviceId(deviceId);
    setActiveTab(tab);
  };

  // Get selected devices data
  const selectedDevicesData = Array.from(selectedItems)
    .map(id => devices.find(device => device.id === id))
    .filter((device): device is typeof MOCK_DEVICES[0] => device !== undefined);

  return (
    <div className="flex-1 space-y-3 pt-3 h-[calc(100vh-80px)] flex flex-col">
      {/* Title section with buttons */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Virtualization</h1>
        <div className="flex gap-2">
          {isSelectionMode ? (
            <>
              {selectedItems.size > 0 && (
                <Button variant="destructive" size="sm">
                  Delete ({selectedItems.size})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedItems(new Set());
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
                Select
              </Button>
            </>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>New</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create VM Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Configuration name"
                    value={newVMConfig.name}
                    onChange={(e) => setNewVMConfig({ ...newVMConfig, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={newVMConfig.type} 
                    onValueChange={(value) => setNewVMConfig({ ...newVMConfig, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vm">Virtual Machine</SelectItem>
                      <SelectItem value="docker">Docker Container</SelectItem>
                      <SelectItem value="portainer">Portainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image">Image/OS</Label>
                  <Input
                    id="image"
                    placeholder="Image or OS name"
                    value={newVMConfig.image}
                    onChange={(e) => setNewVMConfig({ ...newVMConfig, image: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpu">CPU Cores</Label>
                    <Input
                      id="cpu"
                      type="number"
                      min="1"
                      value={newVMConfig.cpu}
                      onChange={(e) => setNewVMConfig({ ...newVMConfig, cpu: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memory">Memory (MB)</Label>
                    <Input
                      id="memory"
                      type="number"
                      min="512"
                      step="512"
                      value={newVMConfig.memory}
                      onChange={(e) => setNewVMConfig({ ...newVMConfig, memory: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Description (optional)"
                    value={newVMConfig.description}
                    onChange={(e) => setNewVMConfig({ ...newVMConfig, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  type="button"
                  disabled={!newVMConfig.name.trim() || !newVMConfig.image.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs 
        defaultValue="overview" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="terminals" className="flex items-center gap-1">
            <Terminal className="h-4 w-4" />
            <span>Terminal</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>Logs</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 flex-1 flex flex-col">
          {/* Status Cards */}
          <Card>
            <CardContent className="p-1">
              <div className="flex justify-between gap-4">
                {/* VM Status Section */}
                <div className="w-auto">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs py-0 h-5 mb-1">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Running
                      </Badge>
                      <span className="text-green-500 text-base font-semibold text-center">{vmStatusSummary.running}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs py-0 h-5 mb-1">
                        <AlertCircle className="mr-1 h-3 w-3" /> Warning
                      </Badge>
                      <span className="text-yellow-500 text-base font-semibold text-center">{vmStatusSummary.warning}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs py-0 h-5 mb-1">
                        <AlertCircle className="mr-1 h-3 w-3" /> Error
                      </Badge>
                      <span className="text-red-500 text-base font-semibold text-center">{vmStatusSummary.error}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs py-0 h-5 mb-1">
                        <Server className="mr-1 h-3 w-3" /> Total
                      </Badge>
                      <span className="text-blue-500 text-base font-semibold text-center">{vmStatusSummary.total}</span>
                    </div>
                  </div>
                </div>

                {/* Alert Summary Section */}
                <div className="w-auto">
                  <div className="flex items-start gap-4">
                    <div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs py-0 h-5 mb-1">
                            Memory
                          </Badge>
                          <span className="text-red-500 text-base font-semibold text-center">{alertSummary.memory}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs py-0 h-5 mb-1">
                            CPU
                          </Badge>
                          <span className="text-yellow-500 text-base font-semibold text-center">{alertSummary.cpu}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs py-0 h-5 mb-1">
                            Total
                          </Badge>
                          <span className="text-blue-500 text-base font-semibold text-center">{alertSummary.total}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center ml-2">
                      <div className="relative">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {alertSummary.total > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                            {alertSummary.total}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">Notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VM/Container Table */}
          <Card className="flex-1 flex flex-col max-h-[calc(100vh-280px)]">
            <CardHeader className="pb-1 pt-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base"></CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="Search in results..."
                      className="pl-7 h-8 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        <FilterX className="mr-1 h-3 w-3" />
                        {statusFilter ? `Status: ${statusFilter}` : 'Filter'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                        All Statuses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('running')}>
                        Running
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('warning')}>
                        Warning
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('error')}>
                        Error
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <RefreshCcw className="mr-1 h-3 w-3" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto min-h-0">
                <Table className="border-collapse">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="hover:bg-transparent">
                      {isSelectionMode && (
                        <TableHead className="h-8 w-[40px] text-xs">
                          <Checkbox 
                            checked={currentItems.length > 0 && selectedItems.size === currentItems.length}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                      )}
                      <TableHead className="h-8 text-xs">Name</TableHead>
                      <TableHead className="h-8 text-xs">Status</TableHead>
                      <TableHead className="h-8 text-xs">Alerts</TableHead>
                      <TableHead className="h-8 text-xs">Containers</TableHead>
                      <TableHead className="h-8 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((device) => (
                      <TableRow 
                        key={device.id}
                        className={`h-8 ${isSelectionMode && selectedItems.has(device.id) ? 'bg-muted/50' : ''}`}
                      >
                        {isSelectionMode && (
                          <TableCell className="py-1 text-xs w-[40px]">
                            <Checkbox 
                              checked={selectedItems.has(device.id)}
                              onCheckedChange={() => handleSelectItem(device.id)}
                              aria-label={`Select ${device.name}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                        )}
                        <TableCell className="py-1 text-xs" onClick={() => isSelectionMode && handleSelectItem(device.id)}>
                          <div className="flex items-center gap-1">
                            {getConnectionTypeIcon(device.connectionType)}
                            <span>{device.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 text-xs" onClick={() => isSelectionMode && handleSelectItem(device.id)}>
                          {getStatusBadge(device.status)}
                        </TableCell>
                        <TableCell className="py-1 text-xs" onClick={() => isSelectionMode && handleSelectItem(device.id)}>
                          {device.alerts.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {device.alerts.includes('memory') && (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs py-0 h-5">Memory</Badge>
                              )}
                              {device.alerts.includes('cpu') && (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs py-0 h-5">CPU</Badge>
                              )}
                            </div>
                          ) : 'None'}
                        </TableCell>
                        <TableCell className="py-1 text-xs" onClick={() => isSelectionMode && handleSelectItem(device.id)}>
                          <span>
                            {device.containers.running}/{device.containers.total} running
                          </span>
                        </TableCell>
                        <TableCell className="py-1 text-xs text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActionClick(device.id, 'settings');
                                    }}
                                  >
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Settings</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActionClick(device.id, 'terminals');
                                    }}
                                  >
                                    <Terminal className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Terminal</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActionClick(device.id, 'logs');
                                    }}
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Logs</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleActionClick(device.id, 'analytics');
                                    }}
                                  >
                                    <BarChart3 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Analytics</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - only show if more than one page */}
              <div className={`flex items-center p-2 border-t ${!shouldShowPagination ? 'hidden' : ''}`}>
                <div className="w-[70px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-6 text-xs">
                        <span className="text-xs">{itemsPerPage}</span> <ChevronDown className="ml-1 h-2 w-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setItemsPerPage(5)} className="text-xs py-1">
                        5 per page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemsPerPage(10)} className="text-xs py-1">
                        10 per page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemsPerPage(20)} className="text-xs py-1">
                        20 per page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemsPerPage(50)} className="text-xs py-1">
                        50 per page
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="mx-auto">
                    <Pagination className="scale-75">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(totalPages, 3) }).map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <PaginationItem key={i}>
                              <PaginationLink 
                                href="#" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum);
                                }}
                                isActive={currentPage === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        {totalPages > 3 && (
                          <PaginationItem>
                            <PaginationLink href="#" onClick={(e) => e.preventDefault()}>
                              ...
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        {totalPages > 3 && (
                          <PaginationItem>
                            <PaginationLink 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(totalPages);
                              }}
                              isActive={currentPage === totalPages}
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
                <div className="w-[70px]"></div> {/* Empty div with same width as dropdown for balance */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          {selectedItems.size > 0 && selectedItems.size <= 4 ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedDevicesData.map(device => (
                <Card key={device.id} className="overflow-hidden">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getConnectionTypeIcon(device.connectionType || 'unknown')}
                        {device.name}
                      </CardTitle>
                      {getStatusBadge(device.status || 'unknown')}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Configuration</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Type:</span>
                              <span>{device.connectionType || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Containers:</span>
                              <span>{device.containers.total}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Status</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Running:</span>
                              <span>{device.containers.running}/{device.containers.total}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Alerts:</span>
                              <span>{device.alerts.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <Settings className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          <RefreshCcw className="mr-1 h-3 w-3" /> Restart
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : selectedDeviceId ? (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">VM Settings</CardTitle>
                <CardDescription className="text-xs">Configure your virtual machine settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {devices.find(d => d.id === selectedDeviceId) && (
                    <div className="flex items-center gap-2 mb-4">
                      {getConnectionTypeIcon(devices.find(d => d.id === selectedDeviceId)?.connectionType || 'unknown')}
                      <span className="font-medium">{devices.find(d => d.id === selectedDeviceId)?.name}</span>
                      {getStatusBadge(devices.find(d => d.id === selectedDeviceId)?.status || 'unknown')}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vm-name">Name</Label>
                      <Input id="vm-name" defaultValue={devices.find(d => d.id === selectedDeviceId)?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vm-type">Type</Label>
                      <Select defaultValue={devices.find(d => d.id === selectedDeviceId)?.connectionType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="portainer">Portainer</SelectItem>
                          <SelectItem value="docker">Docker</SelectItem>
                          <SelectItem value="ssh">SSH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vm-cpu">CPU Cores</Label>
                      <Input id="vm-cpu" type="number" defaultValue="2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vm-memory">Memory (MB)</Label>
                      <Input id="vm-memory" type="number" defaultValue="2048" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">VM Settings</CardTitle>
                <CardDescription className="text-xs">Select a VM to configure its settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-60">
                  <div className="text-center">
                    <Settings className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">Select a device from the Overview tab to access its settings</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('overview')}>
                      Go to Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="terminals">
          {selectedItems.size > 0 && selectedItems.size <= 4 ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedDevicesData.map(device => (
                <Card key={device.id} className="overflow-hidden">
                  <CardHeader className="py-2 px-3 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getConnectionTypeIcon(device.connectionType || 'unknown')}
                        <span className="text-sm font-medium">{device.name}</span>
                      </div>
                      {getStatusBadge(device.status || 'unknown')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-60 bg-black text-green-500 font-mono text-xs">
                    <div className="p-3 h-full overflow-auto">
                      <div>$ ssh user@{device.name}</div>
                      <div>Connected to {device.name}</div>
                      <div>Last login: {new Date().toLocaleString()}</div>
                      <div className="mt-2">user@{device.name}:~$ _</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : selectedDeviceId ? (
            <Card>
              <CardHeader className="py-2 px-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {devices.find(d => d.id === selectedDeviceId) && getConnectionTypeIcon(devices.find(d => d.id === selectedDeviceId)?.connectionType || 'unknown')}
                    <span className="text-sm font-medium">{devices.find(d => d.id === selectedDeviceId)?.name}</span>
                  </div>
                  {devices.find(d => d.id === selectedDeviceId) && getStatusBadge(devices.find(d => d.id === selectedDeviceId)?.status || 'unknown')}
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[400px] bg-black text-green-500 font-mono text-xs">
                <div className="p-3 h-full overflow-auto">
                  <div>$ ssh user@{devices.find(d => d.id === selectedDeviceId)?.name}</div>
                  <div>Connected to {devices.find(d => d.id === selectedDeviceId)?.name}</div>
                  <div>Last login: {new Date().toLocaleString()}</div>
                  <div className="mt-2">user@{devices.find(d => d.id === selectedDeviceId)?.name}:~$ _</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Terminal Access</CardTitle>
                <CardDescription className="text-xs">Connect to your devices via secure terminal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-60">
                  <div className="text-center">
                    <Terminal className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">Select a device from the Overview tab to access its terminal</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('overview')}>
                      Go to Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs">
          {selectedItems.size > 0 && selectedItems.size <= 4 ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedDevicesData.map(device => (
                <Card key={device.id} className="overflow-hidden">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getConnectionTypeIcon(device.connectionType || 'unknown')}
                        <span className="text-sm font-medium">{device.name}</span>
                      </div>
                      {getStatusBadge(device.status || 'unknown')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-60 bg-muted/20 font-mono text-xs">
                    <div className="p-3 h-full overflow-auto">
                      <div className="text-gray-500">[{new Date().toISOString()}] System started</div>
                      <div className="text-gray-500">[{new Date().toISOString()}] Container service initialized</div>
                      {device.alerts.includes('memory') && (
                        <div className="text-red-500">[{new Date().toISOString()}] WARNING: Memory usage above threshold (85%)</div>
                      )}
                      {device.alerts.includes('cpu') && (
                        <div className="text-yellow-500">[{new Date().toISOString()}] WARNING: CPU usage above threshold (90%)</div>
                      )}
                      <div className="text-gray-500">[{new Date().toISOString()}] Running containers: {device.containers.running}/{device.containers.total}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : selectedDeviceId ? (
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">System Logs</CardTitle>
                    <CardDescription className="text-xs">
                      {devices.find(d => d.id === selectedDeviceId)?.name} - View and analyze system logs
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue placeholder="Log type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All logs</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="container">Container</SelectItem>
                        <SelectItem value="error">Errors</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <RefreshCcw className="mr-1 h-3 w-3" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[400px] bg-muted/20 font-mono text-xs">
                <div className="p-3 h-full overflow-auto">
                  <div className="text-gray-500">[{new Date().toISOString()}] System started</div>
                  <div className="text-gray-500">[{new Date().toISOString()}] Container service initialized</div>
                  {devices.find(d => d.id === selectedDeviceId)?.alerts.includes('memory') && (
                    <div className="text-red-500">[{new Date().toISOString()}] WARNING: Memory usage above threshold (85%)</div>
                  )}
                  {devices.find(d => d.id === selectedDeviceId)?.alerts.includes('cpu') && (
                    <div className="text-yellow-500">[{new Date().toISOString()}] WARNING: CPU usage above threshold (90%)</div>
                  )}
                  <div className="text-gray-500">[{new Date().toISOString()}] Running containers: {devices.find(d => d.id === selectedDeviceId)?.containers.running}/{devices.find(d => d.id === selectedDeviceId)?.containers.total}</div>
                  <div className="text-gray-500">[{new Date().toISOString()}] Network check completed</div>
                  <div className="text-gray-500">[{new Date().toISOString()}] Storage check completed</div>
                  <div className="text-gray-500">[{new Date().toISOString()}] Scheduled backup started</div>
                  <div className="text-gray-500">[{new Date().toISOString()}] Scheduled backup completed</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">System Logs</CardTitle>
                <CardDescription className="text-xs">View and analyze system and container logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-60">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">Select a device from the Overview tab to view its logs</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('overview')}>
                      Go to Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          {selectedItems.size > 0 && selectedItems.size <= 4 ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedDevicesData.map(device => (
                <Card key={device.id} className="overflow-hidden">
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getConnectionTypeIcon(device.connectionType || 'unknown')}
                        <span className="text-sm font-medium">{device.name}</span>
                      </div>
                      {getStatusBadge(device.status || 'unknown')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-60">
                    <div className="p-3 h-full">
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Resource Usage</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>CPU Usage</span>
                              <span className={device.alerts.includes('cpu') ? "text-yellow-500" : "text-green-500"}>
                                {device.alerts.includes('cpu') ? "90%" : "45%"}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${device.alerts.includes('cpu') ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: device.alerts.includes('cpu') ? '90%' : '45%' }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Memory Usage</span>
                              <span className={device.alerts.includes('memory') ? "text-red-500" : "text-green-500"}>
                                {device.alerts.includes('memory') ? "85%" : "60%"}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${device.alerts.includes('memory') ? "bg-red-500" : "bg-green-500"}`}
                                style={{ width: device.alerts.includes('memory') ? '85%' : '60%' }}
                              ></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Disk Usage</span>
                              <span className="text-green-500">55%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-green-500" style={{ width: '55%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Container Status</h4>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Running: {device.containers.running}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>Stopped: {device.containers.total - device.containers.running}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span>Total: {device.containers.total}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : selectedDeviceId ? (
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Performance Analytics</CardTitle>
                    <CardDescription className="text-xs">
                      {devices.find(d => d.id === selectedDeviceId)?.name} - Resource usage and performance metrics
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="24h">
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue placeholder="Time range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">Last hour</SelectItem>
                        <SelectItem value="24h">Last 24 hours</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <RefreshCcw className="mr-1 h-3 w-3" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Resource Usage</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>CPU Usage</span>
                          <span className={devices.find(d => d.id === selectedDeviceId)?.alerts.includes('cpu') ? "text-yellow-500" : "text-green-500"}>
                            {devices.find(d => d.id === selectedDeviceId)?.alerts.includes('cpu') ? "90%" : "45%"}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${devices.find(d => d.id === selectedDeviceId)?.alerts.includes('cpu') ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: devices.find(d => d.id === selectedDeviceId)?.alerts.includes('cpu') ? '90%' : '45%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Memory Usage</span>
                          <span className={devices.find(d => d.id === selectedDeviceId)?.alerts.includes('memory') ? "text-red-500" : "text-green-500"}>
                            {devices.find(d => d.id === selectedDeviceId)?.alerts.includes('memory') ? "85%" : "60%"}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${devices.find(d => d.id === selectedDeviceId)?.alerts.includes('memory') ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: devices.find(d => d.id === selectedDeviceId)?.alerts.includes('memory') ? '85%' : '60%' }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Disk Usage</span>
                          <span className="text-green-500">55%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: '55%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Network I/O</span>
                          <span className="text-green-500">2.5 MB/s</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: '35%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Container Status</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-500">
                            {devices.find(d => d.id === selectedDeviceId)?.containers.running}
                          </div>
                          <div className="text-xs text-muted-foreground">Running</div>
                        </div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-500">
                            {(devices.find(d => d.id === selectedDeviceId)?.containers.total || 0) - 
                             (devices.find(d => d.id === selectedDeviceId)?.containers.running || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">Stopped</div>
                        </div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">
                            {devices.find(d => d.id === selectedDeviceId)?.containers.total}
                          </div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Performance Analytics</CardTitle>
                <CardDescription className="text-xs">View resource usage and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-60">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">Select a device from the Overview tab to view analytics</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('overview')}>
                      Go to Overview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 