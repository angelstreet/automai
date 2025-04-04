'use client';

import { PlusCircle, RefreshCw, Grid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useHost } from '@/hooks/useHost';
import { useHostViewMode } from '@/hooks/useHostViewMode';

import { HostFormDialogClient, FormData as ConnectionFormData } from './HostFormDialogClient';

interface HostActionsClientProps {
  hostCount?: number;
}

export function HostActionsClient({ hostCount: initialHostCount = 0 }: HostActionsClientProps) {
  const t = useTranslations('hosts');
  const { hosts, isLoading: isRefetching, refetchHosts } = useHost();
  const { viewMode, toggleViewMode } = useHostViewMode();

  const [showAddHost, setShowAddHost] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    password: '',
  });

  // Derive host count from React Query's hosts data, falling back to the prop
  const currentHostCount = hosts?.length ?? initialHostCount;

  const handleRefresh = async () => {
    if (isRefetching) return;
    await refetchHosts();
  };

  const handleAddHost = () => {
    setShowAddHost(true);
  };

  const handleFormChange = (newFormData: ConnectionFormData) => {
    setFormData(newFormData);
  };

  const handleDialogClose = () => {
    setShowAddHost(false);
    // Reset form data when dialog is closed
    setFormData({
      name: '',
      description: '',
      type: 'ssh',
      ip: '',
      port: '22',
      username: '',
      password: '',
    });
    // Refresh hosts list after dialog closes (in case a host was created)
    refetchHosts();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {currentHostCount > 0 && (
          <>
            <Button variant="outline" size="sm" className="h-8" onClick={toggleViewMode}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              {t('refresh', { fallback: 'Refresh' })}
            </Button>
          </>
        )}

        <Button size="sm" className="h-8 gap-1" onClick={handleAddHost} id="add-host-button">
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_button', { fallback: 'Add Host' })}</span>
        </Button>
      </div>

      <Dialog open={showAddHost} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_title', { fallback: 'Add New Host' })}</DialogTitle>
          </DialogHeader>
          <HostFormDialogClient
            formData={formData}
            onChange={handleFormChange}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
