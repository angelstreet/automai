import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import React from 'react';

import { useRegistration } from '../../contexts/RegistrationContext';
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
  onTakeControl: () => Promise<void>;
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
  onTakeControl,
  onUpdateNode,
  onUpdateEdge,
}) => {
  // Get host data from RegistrationContext
  const { availableHosts, isDeviceLocked } = useRegistration();

  // Handle device selection
  const handleDeviceSelect = (device: string | null) => {
    console.log(`[@component:NavigationEditorHeader] Selected device: ${device}`);
    // Implementation would go here
  };

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ minHeight: 48, px: 2 }}>
          {/* Grid Layout with 4 sections */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '190px 290px 300px 300px',
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
              onAddNewNode={onAddNewNode}
              onFitView={onFitView}
              onSaveToConfig={onSaveToConfig}
              onDiscardChanges={onDiscardChanges}
            />

            {/* Section 4: Device Controls */}
            <NavigationEditorDeviceControls
              selectedDevice={selectedDevice}
              isControlActive={isControlActive}
              isRemotePanelOpen={isRemotePanelOpen}
              isLoading={isLoading}
              error={error}
              availableHosts={availableHosts}
              isDeviceLocked={isDeviceLocked}
              onDeviceSelect={handleDeviceSelect}
              onTakeControl={onTakeControl}
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
