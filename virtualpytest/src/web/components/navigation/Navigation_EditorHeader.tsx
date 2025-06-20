import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import React, { useState, useCallback } from 'react';

import { useDeviceControl } from '../../hooks/useDeviceControl';
import { useToast } from '../../hooks/useToast';
import {
  ValidationPreviewClient,
  ValidationResultsClient,
  ValidationProgressClient,
} from '../validation';

import NavigationEditorActionButtons from './Navigation_NavigationEditor_ActionButtons';
import NavigationEditorDeviceControls from './Navigation_NavigationEditor_DeviceControls';
import NavigationEditorTreeControls from './Navigation_NavigationEditor_TreeControls';

export const NavigationEditorHeader: React.FC<{
  hasUnsavedChanges: boolean;
  focusNodeId: string | null;
  availableFocusNodes: any[];
  maxDisplayDepth: number;
  totalNodes: number;
  visibleNodes: number;
  isLoading: boolean;
  error: string | null;
  isLocked: boolean;
  treeId: string;
  selectedHost: any; // Full host object
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  // Host data (filtered by interface models)
  availableHosts: any[];
  getHostByName: (hostName: string) => any;
  fetchHosts: () => void;
  onAddNewNode: () => void;
  onFitView: () => void;
  onSaveToConfig: () => void;
  onDiscardChanges: () => void;
  onFocusNodeChange: (nodeId: string | null) => void;
  onDepthChange: (depth: number) => void;
  onResetFocus: () => void;
  onToggleRemotePanel: () => void;
  onControlStateChange: (active: boolean) => void;
  onDeviceSelect: (host: any) => void;
  onUpdateNode: (nodeId: string, updatedData: any) => void;
  onUpdateEdge: (edgeId: string, updatedData: any) => void;
}> = ({
  hasUnsavedChanges,
  focusNodeId,
  availableFocusNodes,
  maxDisplayDepth,
  totalNodes,
  visibleNodes,
  isLoading,
  error,
  isLocked,
  treeId,
  selectedHost,
  isControlActive,
  isRemotePanelOpen,
  // Host data (filtered by interface models)
  availableHosts,
  fetchHosts,
  onAddNewNode,
  onFitView,
  onSaveToConfig,
  onDiscardChanges,
  onFocusNodeChange,
  onDepthChange,
  onResetFocus,
  onToggleRemotePanel,
  onControlStateChange,
  onDeviceSelect,
  onUpdateNode,
  onUpdateEdge,
}) => {
  // Note: Now using filtered hosts passed as props instead of calling useRegistration directly

  // Get device control functions
  const { takeControl, releaseControl, isDeviceLocked: isDeviceLockedByHost } = useDeviceControl();

  // Get toast notifications
  const { showError, showSuccess, showWarning } = useToast();

  // Local state for control loading
  const [isControlLoading, setIsControlLoading] = useState(false);

  // Create adapter function to match expected signature (hostName -> boolean)
  const isDeviceLocked = (hostName: string): boolean => {
    const host = availableHosts.find((h) => h.host_name === hostName) || null;
    return isDeviceLockedByHost(host);
  };

  // Handle take control using hook's business logic
  const handleTakeControl = useCallback(async () => {
    if (!selectedHost) {
      console.warn('[@component:NavigationEditorHeader] No device selected for take control');
      showWarning('Please select a device first');
      return;
    }

    console.log(
      `[@component:NavigationEditorHeader] ${isControlActive ? 'Releasing' : 'Taking'} control of device: ${selectedHost.host_name}`,
    );
    setIsControlLoading(true);

    try {
      if (isControlActive) {
        // Release control using hook
        const result = await releaseControl(selectedHost.host_name, 'navigation-editor-session');

        if (result.success) {
          console.log(
            `[@component:NavigationEditorHeader] Successfully released control of device: ${selectedHost.host_name}`,
          );
          showSuccess(`Successfully released control of ${selectedHost.host_name}`);
          onControlStateChange(false);

          // Refresh host data to update lock status using event-based pattern
          console.log(
            `[@component:NavigationEditorHeader] Dispatching host refresh event after control release`,
          );
          try {
            await fetchHosts();
            console.log(`[@component:NavigationEditorHeader] Host data refreshed successfully`);
          } catch (refreshError: any) {
            console.warn(
              `[@component:NavigationEditorHeader] Failed to refresh host data:`,
              refreshError,
            );
          }
        } else {
          console.error(`[@component:NavigationEditorHeader] Failed to release control:`, result);
          showError(result.error || 'Failed to release control of device');
          onControlStateChange(false);
        }
      } else {
        // Take control using hook
        const result = await takeControl(selectedHost.host_name, 'navigation-editor-session');

        if (result.success) {
          console.log(
            `[@component:NavigationEditorHeader] Successfully took control of device: ${selectedHost.host_name}`,
          );
          showSuccess(`Successfully took control of ${selectedHost.host_name}`);
          onControlStateChange(true);

          // Refresh host data to update lock status using event-based pattern
          console.log(
            `[@component:NavigationEditorHeader] Dispatching host refresh event after taking control`,
          );
          try {
            await fetchHosts();
            console.log(`[@component:NavigationEditorHeader] Host data refreshed successfully`);
          } catch (refreshError: any) {
            console.warn(
              `[@component:NavigationEditorHeader] Failed to refresh host data:`,
              refreshError,
            );
          }
        } else {
          console.error(`[@component:NavigationEditorHeader] Failed to take control:`, result);

          // Handle specific error types with appropriate toast duration
          if (
            result.errorType === 'stream_service_error' ||
            result.errorType === 'adb_connection_error'
          ) {
            showError(result.error || 'Service error occurred', { duration: 6000 });
          } else {
            showError(result.error || 'Failed to take control of device');
          }

          onControlStateChange(false);
        }
      }
    } catch (error: any) {
      console.error(
        '[@component:NavigationEditorHeader] Exception during control operation:',
        error,
      );
      showError(`Unexpected error: ${error.message || 'Failed to communicate with server'}`);
      onControlStateChange(false);
    } finally {
      setIsControlLoading(false);
    }
  }, [
    selectedHost,
    isControlActive,
    takeControl,
    releaseControl,
    onControlStateChange,
    showError,
    showSuccess,
    showWarning,
    fetchHosts,
  ]);

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ minHeight: 48, px: 2 }}>
          {/* Grid Layout with 4 sections */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '100px 360px 300px 300px',
              gap: 1,
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* Section 1: Tree Name and Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'medium',
                  color: 'text.primary',
                  fontSize: '1rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                root
                {hasUnsavedChanges && (
                  <Typography component="span" sx={{ color: 'warning.main', ml: 0.5 }}>
                    *
                  </Typography>
                )}
              </Typography>
            </Box>

            {/* Section 2: Tree Controls */}
            <NavigationEditorTreeControls
              focusNodeId={focusNodeId}
              availableFocusNodes={availableFocusNodes}
              maxDisplayDepth={maxDisplayDepth}
              totalNodes={totalNodes}
              visibleNodes={visibleNodes}
              onFocusNodeChange={onFocusNodeChange}
              onDepthChange={onDepthChange}
              onResetFocus={onResetFocus}
            />

            {/* Section 3: Action Buttons */}
            <NavigationEditorActionButtons
              treeId={treeId}
              isLocked={isLocked}
              hasUnsavedChanges={hasUnsavedChanges}
              isLoading={isLoading}
              error={error}
              selectedDevice={selectedHost?.host_name || null}
              isControlActive={isControlActive}
              onAddNewNode={onAddNewNode}
              onFitView={onFitView}
              onSaveToConfig={onSaveToConfig}
              onDiscardChanges={onDiscardChanges}
            />

            {/* Section 4: Device Controls */}
            <NavigationEditorDeviceControls
              selectedDevice={selectedHost?.host_name || null}
              isControlActive={isControlActive}
              isControlLoading={isControlLoading}
              isRemotePanelOpen={isRemotePanelOpen}
              availableHosts={availableHosts}
              isDeviceLocked={isDeviceLocked}
              onDeviceSelect={(hostName: string | null) => {
                const host = hostName ? availableHosts.find((h) => h.host_name === hostName) : null;
                onDeviceSelect(host);
              }}
              onTakeControl={handleTakeControl}
              onToggleRemotePanel={onToggleRemotePanel}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Validation Components */}
      {treeId && (
        <>
          <ValidationPreviewClient treeId={treeId} />
          <ValidationResultsClient treeId={treeId} />
          <ValidationProgressClient
            treeId={treeId}
            onUpdateNode={onUpdateNode}
            onUpdateEdge={onUpdateEdge}
          />
        </>
      )}
    </>
  );
};

export default NavigationEditorHeader;
