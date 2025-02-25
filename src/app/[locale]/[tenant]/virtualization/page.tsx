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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [newVMConfig, setNewVMConfig] = useState({
    name: '',
    description: '',
    type: 'vm', // vm, docker, or portainer
    image: '',
    cpu: '1',
    memory: '1024',
  });
  const [isCreating, setIsCreating] = useState(false);

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
    error: devices.filter(d => d.status === 'error').length
  };

  const getConnectionTypeIcon = (type) => {
    switch (type) {
      case 'portainer':
        return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600">P</Badge>;
      case 'docker':
        return <Badge variant="secondary" className="bg-green-500 hover:bg-green-600">D</Badge>;
      case 'ssh':
        return <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600">S</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Running
        </Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <AlertCircle className="mr-1 h-3 w-3" /> Warning
        </Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
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

  const handleSelectItem = (id) => {
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

  const filteredDevices = devices.filter(device => 
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.alerts.some(alert => alert.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 space-y-4 pt-5">
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
            <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
              Select
            </Button>
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
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="terminals">Terminals</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Status Cards */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* VM Status Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">VM Status</h3>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-green-500 text-2xl font-semibold">{vmStatusSummary.running}/{vmStatusSummary.total}</span>
                      <p className="text-muted-foreground text-sm">Running</p>
                    </div>
                    <div>
                      <span className="text-yellow-500 text-2xl font-semibold">{vmStatusSummary.warning}/{vmStatusSummary.total}</span>
                      <p className="text-muted-foreground text-sm">Warning</p>
                    </div>
                    <div>
                      <span className="text-red-500 text-2xl font-semibold">{vmStatusSummary.error}/{vmStatusSummary.total}</span>
                      <p className="text-muted-foreground text-sm">Error</p>
                    </div>
                  </div>
                </div>

                {/* Alert Summary Section */}
                <div className="border-t md:border-t-0 md:border-l border-gray-800 md:pl-4 pt-4 md:pt-0">
                  <h3 className="text-lg font-medium mb-4">Alert Summary</h3>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-red-500 text-2xl font-semibold">{alertSummary.memory}</span>
                      <p className="text-muted-foreground text-sm">Memory</p>
                    </div>
                    <div>
                      <span className="text-yellow-500 text-2xl font-semibold">{alertSummary.cpu}</span>
                      <p className="text-muted-foreground text-sm">CPU</p>
                    </div>
                    <div>
                      <span className="text-red-500 text-2xl font-semibold">{alertSummary.error}</span>
                      <p className="text-muted-foreground text-sm">Error</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Devices Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle>Devices</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search in results..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <FilterX className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Containers</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow 
                      key={device.id}
                      className={isSelectionMode && selectedItems.has(device.id) ? 'bg-muted/50' : ''}
                      onClick={() => handleSelectItem(device.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getConnectionTypeIcon(device.connectionType)}
                          <span>{device.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(device.status)}
                      </TableCell>
                      <TableCell>
                        {device.alerts.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {device.alerts.includes('memory') && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Memory</Badge>
                            )}
                            {device.alerts.includes('cpu') && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">CPU</Badge>
                            )}
                          </div>
                        ) : 'None'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {device.containers.running}/{device.containers.total} running
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <Terminal className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {itemsPerPage} per page <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setItemsPerPage(10)}>
                        10 per page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemsPerPage(25)}>
                        25 per page
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setItemsPerPage(50)}>
                        50 per page
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious href="#" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terminals">
          <Card>
            <CardHeader>
              <CardTitle>Terminal Access</CardTitle>
              <CardDescription>Connect to your devices via secure terminal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-60">
                <div className="text-center">
                  <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Select a device from the Overview tab to access its terminal</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('overview')}>
                    Go to Overview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>View and analyze system and container logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-60">
                <div className="text-center">
                  <HardDrive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Log monitoring interface will be available soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 