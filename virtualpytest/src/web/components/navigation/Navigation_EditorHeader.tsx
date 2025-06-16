import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import React, { useState, useCallback } from 'react';

import { useDeviceControl } from '../../hooks/useDeviceControl';
import { useRegistration } from '../../hooks/useRegistration';
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
  selectedDevice: string;
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  onAddNewNode: () => void;
  onFitView: () => void;
  onSaveToConfig: () => void;
  onDiscardChanges: () => void;
  onFocusNodeChange: (nodeId: string | null) => void;
  onDepthChange: (depth: number) => void;
  onResetFocus: () => void;
  onToggleRemotePanel: () => void;
  onControlStateChange: (active: boolean) => void;
  onDeviceSelect: (device: string | null) => void;
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
  selectedDevice,
  isControlActive,
  isRemotePanelOpen,
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
  // Get host data from RegistrationContext
  const { availableHosts } = useRegistration();

  // Get device control functions
  const { lockDevice, unlockDevice, isDeviceLocked: isDeviceLockedByHost } = useDeviceControl();

  // Local state for control loading
  const [isControlLoading, setIsControlLoading] = useState(false);

  // Create adapter function to match expected signature (hostName -> boolean)
  const isDeviceLocked = (hostName: string): boolean => {
    const host = availableHosts.find((h) => h.host_name === hostName) || null;
    return isDeviceLockedByHost(host);
  };

  // Handle take control with proper device locking
  const handleTakeControl = useCallback(async () => {
    if (!selectedDevice) {
      console.warn('[@component:NavigationEditorHeader] No device selected for take control');
      return;
    }

    console.log(`[@component:NavigationEditorHeader] Taking control of device: ${selectedDevice}`);
    setIsControlLoading(true);

    try {
      if (!isControlActive) {
        // Take control using device control hook (handles locked_by_same_user)
        const lockSuccess = await lockDevice(selectedDevice, 'navigation-editor-session');

        if (lockSuccess) {
          console.log(`[@component:NavigationEditorHeader] Control taken successfully`);
          onControlStateChange(true);
        } else {
          console.error(`[@component:NavigationEditorHeader] Failed to take control`);
        }
      } else {
        // Release control
        const unlockSuccess = await unlockDevice(selectedDevice, 'navigation-editor-session');

        if (unlockSuccess) {
          console.log(`[@component:NavigationEditorHeader] Control released successfully`);
        } else {
          console.warn(
            `[@component:NavigationEditorHeader] Failed to release control, but continuing with UI cleanup`,
          );
        }

        onControlStateChange(false);
      }
    } catch (error) {
      console.error('[@component:NavigationEditorHeader] Error during take control:', error);
      onControlStateChange(false);
    } finally {
      setIsControlLoading(false);
    }
  }, [selectedDevice, isControlActive, lockDevice, unlockDevice, onControlStateChange]);

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
              selectedDevice={selectedDevice}
              isControlActive={isControlActive}
              onAddNewNode={onAddNewNode}
              onFitView={onFitView}
              onSaveToConfig={onSaveToConfig}
              onDiscardChanges={onDiscardChanges}
            />

            {/* Section 4: Device Controls */}
            <NavigationEditorDeviceControls
              selectedDevice={selectedDevice}
              isControlActive={isControlActive}
              isControlLoading={isControlLoading}
              isRemotePanelOpen={isRemotePanelOpen}
              availableHosts={availableHosts}
              isDeviceLocked={isDeviceLocked}
              onDeviceSelect={onDeviceSelect}
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
