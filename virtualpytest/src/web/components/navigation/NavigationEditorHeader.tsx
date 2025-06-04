import React, { useState, useEffect, useMemo } from 'react';
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
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  ControlCamera as ControlCameraIcon,
  Tv as TvIcon,
} from '@mui/icons-material';
import { TreeFilterControls } from './TreeFilterControls';
import { Device } from '../../services/deviceService';
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
  historyIndex: number;
  historyLength: number;
  
  // Remote control props
  isRemotePanelOpen: boolean;
  selectedDevice: string | null;
  isControlActive: boolean;
  
  // User interface props
  userInterface: any;
  
  // Device props - passed from parent to avoid duplication
  devices?: Device[];
  devicesLoading?: boolean;
  
  // Validation props
  treeId: string;
  
  // Action handlers
  onNavigateToParent: () => void;
  onNavigateToTreeLevel: (index: number) => void;
  onNavigateToParentView: (index: number) => void;
  onAddNewNode: () => void;
  onFitView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSaveToDatabase: () => void;
  onDiscardChanges: () => void;
  
  // Tree filtering handlers
  onFocusNodeChange: (nodeId: string | null) => void;
  onDepthChange: (depth: number) => void;
  onResetFocus: () => void;
  
  // Remote control handlers
  onToggleRemotePanel: () => void;
  onDeviceSelect: (device: string | null) => void;
  onTakeControl: () => void;
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
  historyIndex,
  historyLength,
  isRemotePanelOpen,
  selectedDevice,
  isControlActive,
  userInterface,
  devices = [],
  devicesLoading = false,
  treeId,
  onNavigateToParent,
  onNavigateToTreeLevel,
  onNavigateToParentView,
  onAddNewNode,
  onFitView,
  onUndo,
  onRedo,
  onSaveToDatabase,
  onDiscardChanges,
  onFocusNodeChange,
  onDepthChange,
  onResetFocus,
  onToggleRemotePanel,
  onDeviceSelect,
  onTakeControl,
}) => {
  // Memoize filtered devices to prevent recreation on every render
  const filteredDevices = useMemo(() => {
    if (!userInterface || !userInterface.models || !Array.isArray(userInterface.models)) {
      console.log('[@component:NavigationEditorHeader] No user interface models found, showing all devices');
      return devices;
    }

    const interfaceModels = userInterface.models;
    const filtered = devices.filter(device => 
      interfaceModels.includes(device.model)
    );

    console.log(`[@component:NavigationEditorHeader] Filtered devices: ${filtered.length}/${devices.length} devices match models: ${interfaceModels.join(', ')}`);
    return filtered;
  }, [devices, userInterface]);

  // Extract device names for the dropdown
  const availableDevices = useMemo(() => {
    return filteredDevices.map(device => device.name);
  }, [filteredDevices]);

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
            
            {/* Section 1: Tree Name */}
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
                {navigationNamePath.length > 0 
                  ? decodeURIComponent(navigationNamePath[navigationNamePath.length - 1])
                  : viewPath.length > 0 
                    ? viewPath[viewPath.length - 1].name
                    : 'Navigation Tree'
                }
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
                onClick={onAddNewNode}
                size="small"
                disabled={isLoading || !!error}
                variant="outlined"
                sx={{ 
                  minWidth: 'auto',
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem'
                }}
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
              
              <IconButton 
                onClick={onUndo} 
                size="small" 
                title="Undo" 
                disabled={historyIndex <= 0 || isLoading || !!error}
              >
                <UndoIcon />
              </IconButton>
              
              <IconButton 
                onClick={onRedo} 
                size="small" 
                title="Redo" 
                disabled={historyIndex >= historyLength - 1 || isLoading || !!error}
              >
                <RedoIcon />
              </IconButton>
              
              <IconButton 
                onClick={onSaveToDatabase} 
                size="small" 
                title={hasUnsavedChanges ? "Save Changes to Database" : "Save to Database"}
                disabled={isLoading || !!error}
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
                  disabled={isLoading || !!error || devicesLoading}
                  sx={{ height: 32, fontSize: '0.75rem' }}
                >
                  <MenuItem value="">
                    <em>{devicesLoading ? 'Loading...' : 'None'}</em>
                  </MenuItem>
                  {availableDevices.map((device) => (
                    <MenuItem key={device} value={device}>
                      {device}
                    </MenuItem>
                  ))}
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
                disabled={!selectedDevice || isLoading || !!error || devicesLoading}
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
                title={isControlActive ? "Release Control" : "Take Control"}
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
          <ValidationProgressClient treeId={treeId} />
        </>
      )}
    </>
  );
}; 