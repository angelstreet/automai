'use client';

import { PlusCircle, RefreshCw, Grid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { useHost } from '@/hooks/useHost';
import { useHostViewStore } from '@/store/hostViewStore';

import { HostFormDialogClient, FormData as ConnectionFormData } from './HostFormDialogClient';
import { HostsEvents } from './HostsEventListener';

interface HostActionsClientProps {
  hostCount?: number;
}

export function HostActionsClient({ hostCount: initialHostCount = 0 }: HostActionsClientProps) {
  const t = useTranslations('hosts');
  const c = useTranslations('common');
  const {
    hosts,
    isLoading: isRefetching,
    refetchHosts,
    testConnection: _testConnection,
  } = useHost();

  // Get view mode state from Zustand store
  const { viewMode, toggleViewMode } = useHostViewStore();

  const [showAddHost, setShowAddHost] = useState(false);
  const [isTestingHosts, setIsTestingHosts] = useState(false);
  const activeTestingHosts = useRef<Set<string>>(new Set());

  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    description: '',
    type: 'ssh',
    ip: '',
    port: '22',
    username: '',
    authType: 'password',
    password: '',
    privateKey: '',
  });

  // Derive host count from React Query's hosts data, falling back to the prop
  const currentHostCount = hosts?.length ?? initialHostCount;

  // Listen for host-specific testing events
  useEffect(() => {
    console.log('[@component:HostActionsClient] Setting up event listeners');

    const handleOpenDialog = () => {
      console.log('[@component:HostActionsClient] OPEN_HOST_DIALOG event received');
      setShowAddHost(true);
    };

    // Track individual host testing
    const handleHostTestingStart = (event: CustomEvent) => {
      console.log('[@component:HostActionsClient] HOST_TESTING_START event received', event);
      if (event.detail && event.detail.hostId) {
        console.log(`[@component:HostActionsClient] Host testing started: ${event.detail.hostId}`);
        activeTestingHosts.current.add(event.detail.hostId);
        console.log(
          `[@component:HostActionsClient] Active testing hosts: ${Array.from(activeTestingHosts.current).join(', ')}`,
        );
        setIsTestingHosts(true);
      } else {
        console.warn(
          '[@component:HostActionsClient] HOST_TESTING_START event received without hostId in detail',
        );
      }
    };

    const handleHostTestingComplete = (event: CustomEvent) => {
      console.log('[@component:HostActionsClient] HOST_TESTING_COMPLETE event received', event);
      if (event.detail && event.detail.hostId) {
        console.log(
          `[@component:HostActionsClient] Host testing completed: ${event.detail.hostId}`,
        );
        activeTestingHosts.current.delete(event.detail.hostId);
        console.log(
          `[@component:HostActionsClient] Remaining testing hosts: ${Array.from(activeTestingHosts.current).join(', ') || 'none'}`,
        );

        // Only stop animation if no hosts are being tested
        if (activeTestingHosts.current.size === 0) {
          console.log(
            '[@component:HostActionsClient] No more hosts being tested, stopping animation',
          );
          setIsTestingHosts(false);
        } else {
          console.log(
            `[@component:HostActionsClient] ${activeTestingHosts.current.size} hosts still being tested, continuing animation`,
          );
        }
      } else {
        console.warn(
          '[@component:HostActionsClient] HOST_TESTING_COMPLETE event received without hostId in detail',
        );
      }
    };

    // Add all event listeners
    console.log(`[@component:HostActionsClient] Adding event listeners for events:
      - ${HostsEvents.OPEN_HOST_DIALOG}
      - ${HostsEvents.HOST_TESTING_START}
      - ${HostsEvents.HOST_TESTING_COMPLETE}`);

    window.addEventListener(HostsEvents.OPEN_HOST_DIALOG, handleOpenDialog);
    window.addEventListener(
      HostsEvents.HOST_TESTING_START,
      handleHostTestingStart as EventListener,
    );
    window.addEventListener(
      HostsEvents.HOST_TESTING_COMPLETE,
      handleHostTestingComplete as EventListener,
    );

    return () => {
      console.log('[@component:HostActionsClient] Removing event listeners');
      window.removeEventListener(HostsEvents.OPEN_HOST_DIALOG, handleOpenDialog);
      window.removeEventListener(
        HostsEvents.HOST_TESTING_START,
        handleHostTestingStart as EventListener,
      );
      window.removeEventListener(
        HostsEvents.HOST_TESTING_COMPLETE,
        handleHostTestingComplete as EventListener,
      );
    };
  }, []);

  const handleRefresh = async () => {
    if (isRefetching || isTestingHosts) {
      console.log('[@component:HostActionsClient] Refresh already in progress, skipping');
      return;
    }

    console.log('[@component:HostActionsClient] Starting hosts refresh process');

    // Set testing state immediately for instant visual feedback
    setIsTestingHosts(true);

    try {
      // First refresh hosts data
      console.log('[@component:HostActionsClient] Dispatching REFRESH_HOSTS event');
      window.dispatchEvent(new Event(HostsEvents.REFRESH_HOSTS));

      // Wait for refetch to complete
      console.log('[@component:HostActionsClient] Calling refetchHosts()');
      await refetchHosts();

      // Skip if there are no hosts
      if (hosts.length === 0) {
        console.log('[@component:HostActionsClient] No hosts to test');
        setIsTestingHosts(false);
        return;
      }

      // Dispatch a custom event to tell HostListClient to test all hosts
      console.log('[@component:HostActionsClient] Dispatching event to test all hosts');
      window.dispatchEvent(
        new CustomEvent(HostsEvents.TEST_ALL_HOSTS, {
          detail: { hostIds: hosts.map((h) => h.id) },
        }),
      );
    } catch (error) {
      console.error('[@component:HostActionsClient] Error during refresh process:', error);
      // Ensure animation stops on error
      setIsTestingHosts(false);
      activeTestingHosts.current.clear();
    }
  };

  const handleAddHost = () => {
    setShowAddHost(true);
  };

  const handleViewModeToggle = () => {
    console.log(
      `[@component:HostActionsClient] Toggling view mode from ${viewMode} to ${viewMode === 'grid' ? 'table' : 'grid'}`,
    );
    // Toggle view mode using Zustand store
    toggleViewMode();
    // Still dispatch the event for any listeners that might be interested
    window.dispatchEvent(new Event(HostsEvents.TOGGLE_HOST_VIEW_MODE));
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
      authType: 'password',
      password: '',
      privateKey: '',
    });
    // Refresh hosts list after dialog closes (in case a host was created)
    refetchHosts();
  };

  // Determine if the button should animate
  const isRefreshingState = isRefetching || isTestingHosts;

  return (
    <>
      <div className="flex items-center gap-2">
        {currentHostCount > 0 && (
          <>
            <Button variant="outline" size="sm" className="h-8" onClick={handleViewModeToggle}>
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleRefresh}
              disabled={isRefreshingState}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingState ? 'animate-spin' : ''}`} />
              {c('refresh')}
            </Button>
          </>
        )}

        <Button size="sm" className="h-8 gap-1" onClick={handleAddHost} id="add-host-button">
          <PlusCircle className="h-4 w-4" />
          <span>{t('add_button')}</span>
        </Button>
      </div>

      <Dialog open={showAddHost} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('add_title')}</DialogTitle>
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
