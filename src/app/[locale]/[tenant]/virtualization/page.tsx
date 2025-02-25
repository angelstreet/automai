'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCcw, Settings, Download, LayoutGrid, Table2, ScrollText, Terminal, BarChart2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { DeviceList } from '@/components/virtualization/Overview/DeviceList';
import { generateTestDevices } from '@/constants/virtualization';
import { Device } from '@/types/virtualization';
import { CreateVMDialog } from '@/components/virtualization/Overview/CreateVMDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function VirtualizationPage() {
  const t = useTranslations('Common');
  const params = useParams();
  const tenant = params.tenant as string;
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [devices] = useState(generateTestDevices(50));

  // Calculate VM status summary
  const vmStatusSummary = {
    running: devices.filter(d => d.status === 'running').length,
    warning: devices.filter(d => d.status === 'warning').length,
    error: devices.filter(d => d.status === 'error').length,
    total: devices.length
  };

  // Calculate alert summary
  const alertSummary = {
    memory: devices.filter(d => d.alerts.some(alert => alert.type === 'memory')).length,
    cpu: devices.filter(d => d.alerts.some(alert => alert.type === 'cpu')).length,
    error: devices.filter(d => d.alerts.some(alert => alert.type === 'error')).length,
    total: devices.filter(d => d.alerts.length > 0).length
  };

  const handleSelectItem = (id: string) => {
    if (isSelectionMode) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          if (newSet.size < 4) {
            newSet.add(id);
          } else {
            toast({
              title: "Selection limit reached",
              description: "You can select a maximum of 4 items",
              variant: "destructive",
            });
          }
        }
        return newSet;
      });
    }
  };

  const handleStatusFilter = (status: string | null) => {
    if (status === null) {
      setSelectedFilters(new Set());
    } else {
      setSelectedFilters(prev => {
        const newFilters = new Set(prev);
        if (newFilters.has(status)) {
          newFilters.delete(status);
        } else {
          newFilters.add(status);
        }
        return newFilters;
      });
    }
  };

  // Filter devices by search term and status
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.alerts.some(alert => alert.message.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedFilters.size === 0 || selectedFilters.has(device.status);
    
    return matchesSearch && matchesStatus;
  });

  // Calculate total pages
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  
  // Calculate current page items
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredDevices.slice(startIndex, endIndex);

  return (
    <div className="flex-1 space-y-2 pt-2 h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] flex flex-col overflow-hidden">
      {/* Title section with buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                >
                  {viewMode === 'grid' ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle view mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex gap-2">
          {isSelectionMode ? (
            <>
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
              {selectedItems.size > 0 && (
                <TooltipProvider>
                  <div className="flex gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                          onClick={() => {
                            const deviceIds = Array.from(selectedItems).join(',');
                            window.location.href = `/${params.locale}/${params.tenant}/virtualization/settings?devices=${deviceIds}`;
                          }}
                        >
                          <Settings className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Settings</p>
                                </TooltipContent>
                              </Tooltip>
                            
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                          onClick={() => {
                            const deviceIds = Array.from(selectedItems).join(',');
                            window.location.href = `/${params.locale}/${params.tenant}/virtualization/logs?devices=${deviceIds}`;
                          }}
                        >
                          <ScrollText className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                        <p>Logs</p>
                                </TooltipContent>
                              </Tooltip>
                            
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                          onClick={() => {
                            const deviceIds = Array.from(selectedItems).join(',');
                            const selectedDeviceNames = Array.from(selectedItems)
                              .map(id => devices.find(d => d.id === id)?.name || id)
                              .join(',');
                            window.location.href = `/${params.locale}/${params.tenant}/virtualization/terminals?devices=${selectedDeviceNames}`;
                          }}
                        >
                          <Terminal className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                        <p>Terminals</p>
                                </TooltipContent>
                              </Tooltip>
                            
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                          onClick={() => {
                            const deviceIds = Array.from(selectedItems).join(',');
                            window.location.href = `/${params.locale}/${params.tenant}/virtualization/analytics?devices=${deviceIds}`;
                          }}
                        >
                          <BarChart2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Analytics</p>
                                </TooltipContent>
                              </Tooltip>
                          </div>
                </TooltipProvider>
              )}
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)}>
              Select
                        </Button>
          )}
          <CreateVMDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
                    </div>
                    </div>
      
      <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between py-1">
              <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    <RefreshCcw className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
              </div>
            </div>
            
        <div className="flex-1 overflow-hidden">
          <DeviceList
            devices={currentItems}
            selectedItems={selectedItems}
            onItemSelect={handleSelectItem}
            viewMode={viewMode}
            isSelectionMode={isSelectionMode}
            onStatusFilter={handleStatusFilter}
            selectedFilters={selectedFilters}
            className="h-full overflow-auto"
                    />
                  </div>
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2">
              <div className="text-sm whitespace-nowrap">
                <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredDevices.length)}</span>
                <span className="text-muted-foreground"> of {filteredDevices.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <select 
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing items per page
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-xs text-muted-foreground">per page</span>
                      </div>
                  </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-2"
              >
                Previous
                      </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-7 w-7 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && <span className="px-1">...</span>}
                {totalPages > 5 && (
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-7 w-7 p-0"
                  >
                    {totalPages}
                    </Button>
                )}
                      </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2"
              >
                Next
                    </Button>
                  </div>
                </div>
        )}
      </div>
    </div>
  );
} 