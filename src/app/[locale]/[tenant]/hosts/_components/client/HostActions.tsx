'use client';

import { Plus, RefreshCw, Grid, List } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/shadcn/button';

// Create a custom event for view mode changes
export const VIEW_MODE_CHANGE = 'host-view-mode-change';

export function HostActions() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleViewModeChange = () => {
    const newMode = viewMode === 'grid' ? 'table' : 'grid';
    setViewMode(newMode);
    // Dispatch event for other components to react to view mode change
    window.dispatchEvent(new CustomEvent(VIEW_MODE_CHANGE, { detail: { mode: newMode } }));
  };

  const handleRefresh = () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    // Dispatch event for refresh action
    window.dispatchEvent(new CustomEvent('refresh-hosts'));
  };

  const handleAddHost = () => {
    // Dispatch event to show add host dialog
    window.dispatchEvent(new CustomEvent('open-host-dialog'));
  };

  // Listen for refresh complete event
  useEffect(() => {
    const handleRefreshComplete = () => {
      setIsRefreshing(false);
    };

    window.addEventListener('refresh-hosts-complete', handleRefreshComplete);
    return () => window.removeEventListener('refresh-hosts-complete', handleRefreshComplete);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button variant="outline" size="sm" className="h-8" onClick={handleViewModeChange}>
        {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
      </Button>
      <Button size="sm" className="h-8" onClick={handleAddHost}>
        <Plus className="h-4 w-4 mr-2" />
        Add Host
      </Button>
    </div>
  );
}
