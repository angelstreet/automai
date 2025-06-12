import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  // Undo/Redo icons removed
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  ControlCamera as ControlCameraIcon,
  Tv as TvIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { TreeFilterControls } from './Navigation_TreeFilterControls';
import { useRegistration } from '../../contexts/RegistrationContext';
import { 
  ValidationButtonClient,
  ValidationPreviewClient,
  ValidationResultsClient,
  ValidationProgressClient 
} from '../validation';

interface NavigationEditorHeaderProps {
  // Navigation state
  navigationPath: string[];
  navigationNamePath: string[];
  viewPath: { id: string; name: string }[];
  hasUnsavedChanges: boolean;
  
  // Tree filtering props
  focusNodeId: string | null;
  availableFocusNodes: { id: string; label: string; depth: number }[];
  maxDisplayDepth: number;
  totalNodes: number;
  visibleNodes: number;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  // History props removed - using page reload for cancel changes
  
  // Lock management props
  isLocked?: boolean;
  lockInfo?: any;
  sessionId?: string;
  
  // Remote control props
  isRemotePanelOpen: boolean;
  selectedDevice: string | null;
  isControlActive: boolean;
  
  // User interface props
  userInterface: any;
  
  // Device props - now using RegisteredHost from RegistrationContext
  devicesLoading?: boolean;
  
  // Validation props
  treeId: string;
  
  // Action handlers
  onNavigateToParent: () => void;
  onNavigateToTreeLevel: (index: number) => void;
  onNavigateToParentView: (index: number) => void;
  onAddNewNode: (nodeType: string, position: { x: number; y: number }) => void;
  onFitView: () => void;
  // onUndo/onRedo removed - using page reload for cancel changes

  onSaveToConfig?: (treeName: string) => void;
  onLockTree?: (treeName: string) => void;
  onUnlockTree?: (treeName: string) => void;
  onDiscardChanges: () => void;
  
  // Tree filtering handlers
  onFocusNodeChange: (nodeId: string | null) => void;
  onDepthChange: (depth: number) => void;
  onResetFocus: () => void;
  
  // Remote control handlers
  onToggleRemotePanel: () => void;
  onDeviceSelect: (device: string | null) => void;
  onTakeControl: () => void;
  
  // Update handlers for validation confidence tracking
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  onUpdateEdge?: (edgeId: string, updatedData: any) => void;
}

export const NavigationEditorHeader: React.FC<NavigationEditorHeaderProps> = ({
  navigationPath,
  navigationNamePath,
  viewPath,
  hasUnsavedChanges,
  focusNodeId,
  availableFocusNodes,
  maxDisplayDepth,
  totalNodes,
  visibleNodes,
  isLoading,
  error,
  // History props removed
  isLocked,
  lockInfo,
  sessionId,
  isRemotePanelOpen,
  selectedDevice,
  isControlActive,
  userInterface,
  devicesLoading = false,
  treeId,
  onNavigateToParent,
  onNavigateToTreeLevel,
  onNavigateToParentView,
  onAddNewNode,
  onFitView,
  // onUndo/onRedo functions removed
  onSaveToConfig,
  onLockTree,
  onUnlockTree,
  onDiscardChanges,
  onFocusNodeChange,
  onDepthChange,
  onResetFocus,
  onToggleRemotePanel,
  onDeviceSelect,
  onTakeControl,
  onUpdateNode,
  onUpdateEdge,
}) => {
  // Get devices and lock status from RegistrationContext
  const { availableHosts, isDeviceLocked } = useRegistration();

  // Track logging to prevent spam in development mode
  const lastLoggedState = useRef<{ hasModels: boolean; deviceCount: number } | null>(null);

  // Memoize filtered devices to prevent recreation on every render
  const filteredDevices = useMemo(() => {
    

    const hasUserInterfaceModels = userInterface && userInterface.models && Array.isArray(userInterface.models);
    const currentDeviceCount = availableHosts.length;
    
    // Only log if the state has actually changed
    const shouldLog = !lastLoggedState.current || 
                      lastLoggedState.current.hasModels !== hasUserInterfaceModels ||
                      lastLoggedState.current.deviceCount !== currentDeviceCount;

    if (!hasUserInterfaceModels) {
      if (shouldLog) {
        console.log('[@component:NavigationEditorHeader] No user interface models found, showing all devices');
        lastLoggedState.current = { hasModels: false, deviceCount: currentDeviceCount };
      }
      return availableHosts;
    }

    const interfaceModels = userInterface.models;
    const filtered = availableHosts.filter(device => 
      interfaceModels.includes(device.model)
    );

    if (shouldLog) {
      console.log(`[@component:NavigationEditorHeader] Filtered devices: ${filtered.length}/${availableHosts.length} devices match models: ${interfaceModels.join(', ')}`);
      lastLoggedState.current = { hasModels: true, deviceCount: currentDeviceCount };
    }
    
    return filtered;
  }, [availableHosts, userInterface]);

  // Extract device names for the dropdown
  const availableDevices = useMemo(() => {
    return filteredDevices.map(device => device.name);
  }, [filteredDevices]);

  // Check if selected device is locked
  const selectedDeviceHost = useMemo(() => {
    return filteredDevices.find(device => device.name === selectedDevice);
  }, [filteredDevices, selectedDevice]);

  const isSelectedDeviceLocked = useMemo(() => {
    return selectedDeviceHost ? isDeviceLocked(selectedDeviceHost.id) : false;
  }, [selectedDeviceHost, isDeviceLocked]);

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ minHeight: 48, px: 2 }}>
          {/* Grid Layout with 4 sections - Updated width for validation button */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: '190px 290px 300px 300px',
            gap: 1,
            alignItems: 'center',
            width: '100%'
          }}>
            
            {/* Section 1: Tree Name and Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              {/* Simple Tree Name Display */}
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
                {/* Show tree name from multiple possible sources */}
                root
                {hasUnsavedChanges && (
                  <Typography component="span" sx={{ color: 'warning.main', ml: 0.5 }}>
                    *
                  </Typography>
                )}
              </Typography>
            </Box>
            
            {/* Section 2: Node Controls (TreeFilterControls) */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              minWidth: 0,
              width: '100%',
              '& > *': {
                gap: 1,
                '& .MuiFormControl-root': {
                  minWidth: '70px !important',
                  marginRight: '8px',
                },
                '& .MuiButton-root': {
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  padding: '4px 8px',
                },
                '& .MuiTypography-root': {
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                }
              }
            }}>
              <TreeFilterControls
                focusNodeId={focusNodeId}
                availableFocusNodes={availableFocusNodes}
                onFocusNodeChange={onFocusNodeChange}
                maxDisplayDepth={maxDisplayDepth}
                onDepthChange={onDepthChange}
                onResetFocus={onResetFocus}
                totalNodes={totalNodes}
                visibleNodes={visibleNodes}
              />
            </Box>
            
            {/* Section 3: Action Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, minWidth: 0 }}>
              {/* Validation Button */}
              <ValidationButtonClient 
                treeId={treeId}
                disabled={isLoading || !!error || !isControlActive || !selectedDevice}
              />
              
              <Button
                startIcon={<AddIcon />}
                onClick={() => onAddNewNode('node', { x: 0, y: 0 })}
                size="small"
                disabled={isLoading || !!error || !isLocked}
                variant="outlined"
                sx={{ 
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem'
                }}
                title={!isLocked ? "Cannot add nodes - tree is in read-only mode" : "Add Node"}
              >
                Add&nbsp;Node
              </Button>
              
              <IconButton 
                onClick={onFitView} 
                size="small" 
                title="Fit View" 
                disabled={isLoading || !!error}
              >
                <FitScreenIcon />
              </IconButton>
              
                            {/* Undo/Redo buttons removed - using page reload for cancel changes */}
              
              <IconButton 
                onClick={() => {
                  if (onSaveToConfig) {
                    onSaveToConfig('root');
                  }
                }} 
                size="small" 
                title={
                  !isLocked
                    ? "Cannot save - tree is in read-only mode"
                    : isLocked && lockInfo?.locked_by !== sessionId 
                      ? "Cannot save - tree is locked by another user"
                      : hasUnsavedChanges 
                        ? "Save Changes to Config" 
                        : "Save to Config"
                }
                disabled={
                  isLoading || 
                  !!error || 
                  !isLocked ||
                  (isLocked && lockInfo?.locked_by !== sessionId)
                }
                color={hasUnsavedChanges ? "primary" : "default"}
              >
                {isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
              </IconButton>
              
              <IconButton 
                onClick={onDiscardChanges} 
                size="small" 
                title={hasUnsavedChanges ? "Discard Unsaved Changes" : "Discard Changes"}
                color={hasUnsavedChanges ? "warning" : "default"}
                disabled={isLoading || !!error}
              >
                <CancelIcon />
              </IconButton>
            </Box>

            {/* Section 4: Device Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, minWidth: 0 }}>
              {/* Device Selection Dropdown */}
              <FormControl size="small" sx={{ minWidth: 120, maxWidth: 120 }}>
                <InputLabel id="device-select-label">Device</InputLabel>
                <Select
                  labelId="device-select-label"
                  value={selectedDevice || ''}
                  onChange={(e) => onDeviceSelect(e.target.value || null)}
                  label="Device"
                  disabled={isLoading || !!error || devicesLoading || isControlActive}
                  sx={{ height: 32, fontSize: '0.75rem' }}
                >
                  <MenuItem value="">
                    <em>{devicesLoading ? 'Loading...' : 'None'}</em>
                  </MenuItem>
                  {filteredDevices.map((device) => {
                    const deviceIsLocked = isDeviceLocked(device.id);
                    return (
                      <MenuItem 
                        key={device.name} 
                        value={device.name}
                        disabled={deviceIsLocked}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          opacity: deviceIsLocked ? 0.6 : 1,
                        }}
                      >
                        {deviceIsLocked && <LockIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />}
                        <span>{device.name}</span>
                        {deviceIsLocked && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              ml: 'auto', 
                              color: 'warning.main',
                              fontSize: '0.65rem'
                            }}
                          >
                            (Locked)
                          </Typography>
                        )}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              {/* Combined Take Control & Remote Panel Button */}
              <Button
                variant={isControlActive ? "contained" : "outlined"}
                size="small"
                onClick={() => {
                  // Handle both take control and remote panel toggle
                  onTakeControl();
                  // If taking control, show the remote panel; if releasing, hide it
                  if (!isControlActive && selectedDevice) {
                    // Taking control - ensure remote panel is open
                    if (!isRemotePanelOpen) {
                      onToggleRemotePanel();
                    }
                  } else if (isControlActive) {
                    // Releasing control - hide remote panel
                    if (isRemotePanelOpen) {
                      onToggleRemotePanel();
                    }
                  }
                }}
                disabled={
                  !selectedDevice || 
                  isLoading || 
                  !!error || 
                  devicesLoading || 
                  isSelectedDeviceLocked
                }
                startIcon={isControlActive ? <TvIcon /> : <TvIcon />}
                color={isControlActive ? "success" : "primary"}
                sx={{ 
                  height: 32, 
                  fontSize: '0.7rem', 
                  minWidth: 110,
                  maxWidth: 110,
                  whiteSpace: 'nowrap',
                  px: 1.5
                }}
                title={
                  isSelectedDeviceLocked 
                    ? `Device is locked by ${selectedDeviceHost?.lockedBy || 'another user'}`
                    : isControlActive 
                      ? "Release Control" 
                      : "Take Control"
                }
              >
                {isControlActive ? 'Release' : 'Control'}
              </Button>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Validation Components - Only render when needed */}
      {treeId && (
        <>
          <ValidationPreviewClient treeId={treeId} />
          <ValidationResultsClient treeId={treeId} />
          <ValidationProgressClient treeId={treeId} onUpdateNode={onUpdateNode} onUpdateEdge={onUpdateEdge} />
        </>
      )}
    </>
  );
}; 