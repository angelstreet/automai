'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '../types';
// Import the new context hook
import { useHost } from '@/context';

import { ConnectionForm, FormData } from './ConnectionForm';
import { HostGrid } from './HostGrid';
import { HostTable } from './HostTable';

export default function HostContainer() {
  const [showAddHost, setShowAddHost] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [selectMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Use the new context hook instead of the SWR hook
  const {
    hosts,
    loading,
    error,
    fetchHosts,
    addHost,
    removeHost: deleteHost,
    testConnection,
  } = useHost();

  // Handle refresh all hosts
  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Simplified to just refresh all hosts for now
      await fetchHosts();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle add host form submission
  const handleSaveHost = async () => {
    setIsSaving(true);
    try {
      const result = await addHost({
        name: formData.name,
        description: formData.description,
        type: formData.type as 'ssh' | 'docker' | 'portainer',
        ip: formData.ip,
        port: parseInt(formData.port),
        user: formData.username,
        password: formData.password,
        status: 'connected',
        created_at: new Date(),
        updated_at: new Date(),
        is_windows: false,
      });

      if (result.success) {
        setShowAddHost(false);
        setFormData({
          name: '',
          description: '',
          type: 'ssh',
          ip: '',
          port: '22',
          username: '',
          password: '',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle host selection
  const handleSelectHost = (id: string) => {
    setSelectedHosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle delete hosts
  const handleDeleteHosts = async () => {
    for (const id of selectedHosts) {
      await deleteHost(id);
    }
    setSelectedHosts(new Set());
  };

  // Handle test connection
  const handleTestConnection = async (id: string) => {
    await testConnection(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            className={viewMode === 'grid' ? 'bg-gray-100' : ''}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={viewMode === 'table' ? 'bg-gray-100' : ''}
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh All'}
          </Button>
          <Button size="sm" onClick={() => setShowAddHost(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Host
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading hosts...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : hosts?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
          <p className="text-gray-500 mb-4">No hosts found</p>
          <Button size="sm" onClick={() => setShowAddHost(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Host
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <HostGrid 
          hosts={hosts}
          onSelect={handleSelectHost}
          selectedHosts={selectedHosts}
          selectMode={selectMode}
          onTestConnection={handleTestConnection}
          onRefresh={fetchHosts}
          onDelete={deleteHost}
        />
      ) : (
        <HostTable 
          hosts={hosts}
          onSelect={handleSelectHost}
          selectedHosts={selectedHosts}
          selectMode={selectMode}
          onTestConnection={handleTestConnection}
          onRefresh={fetchHosts}
          onDelete={deleteHost}
        />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ConnectionForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 