'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Host } from '../types';
import { useHosts } from '../hooks';

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

  // Use the SWR-powered hook for data fetching and mutations
  const {
    hosts,
    loading,
    error,
    fetchHosts,
    addHost,
    deleteHost,
    testConnection,
    testAllConnections,
  } = useHosts();

  // Handle refresh all hosts
  const handleRefreshAll = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await testAllConnections();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle add host form submission
  const handleSaveHost = async () => {
    setIsSaving(true);
    try {
      const success = await addHost({
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

      if (success) {
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Hosts</h1>
        <div className="flex items-center space-x-2">
          <div className="border rounded-md p-1 mr-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="px-2"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="px-2"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={handleRefreshAll} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddHost(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Host
          </Button>
        </div>
      </div>

      {loading && hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <RefreshCw className="h-8 w-8 animate-spin mb-4" />
          <p className="text-muted-foreground">Loading hosts...</p>
        </div>
      ) : !loading && hosts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No hosts found</p>
          <Button onClick={() => setShowAddHost(true)} className="mt-4">
            Add your first host
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <HostGrid
          hosts={hosts}
          selectedHosts={selectedHosts}
          selectMode={selectMode}
          onSelect={handleSelectHost}
          onDelete={deleteHost}
          onTestConnection={(host: Host) => testConnection(host.id)}
        />
      ) : (
        <HostTable
          hosts={hosts}
          onDelete={deleteHost}
          onTestConnection={(host: Host) => testConnection(host.id)}
        />
      )}

      <Dialog open={showAddHost} onOpenChange={setShowAddHost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Host</DialogTitle>
          </DialogHeader>
          <ConnectionForm 
            formData={formData} 
            onChange={setFormData} 
            onSave={handleSaveHost}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
