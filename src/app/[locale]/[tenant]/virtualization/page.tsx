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
  const [devices] = useState(generateTestDevices(25));

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
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
          >
            {viewMode === 'grid' ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
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
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deviceIds = Array.from(selectedItems).join(',');
                      window.location.href = `/[locale]/[tenant]/virtualization/settings?devices=${deviceIds}`;
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deviceIds = Array.from(selectedItems).join(',');
                      window.location.href = `/[locale]/[tenant]/virtualization/logs?devices=${deviceIds}`;
                    }}
                  >
                    <ScrollText className="mr-2 h-4 w-4" /> Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deviceIds = Array.from(selectedItems).join(',');
                      window.location.href = `/[locale]/[tenant]/virtualization/terminals?devices=${deviceIds}`;
                    }}
                  >
                    <Terminal className="mr-2 h-4 w-4" /> Terminals
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deviceIds = Array.from(selectedItems).join(',');
                      window.location.href = `/[locale]/[tenant]/virtualization/analytics?devices=${deviceIds}`;
                    }}
                  >
                    <BarChart2 className="mr-2 h-4 w-4" /> Analytics
                  </Button>
                </>
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
      
      <div className="space-y-2 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="mr-2 h-4 w-4" /> Add Device
            </Button>
            <Button variant="outline" size="sm" className="h-7">
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="h-7">
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
            <Button variant="outline" size="sm" className="h-7">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
        
        <DeviceList
          devices={currentItems}
          selectedItems={selectedItems}
          onItemSelect={handleSelectItem}
          viewMode={viewMode}
          isSelectionMode={isSelectionMode}
          onStatusFilter={handleStatusFilter}
          selectedFilters={selectedFilters}
        />
      </div>
    </div>
  );
} 