import React, { useState, useEffect } from 'react';
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
  
  // User interface props
  userInterface: any;
  
  // Device props
  devices: any[];
  devicesLoading: boolean;
  selectedDevice: string | null;
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  remoteConfig: any;
  
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
  userInterface,
  devices,
  devicesLoading,
  selectedDevice,
  isControlActive,
  isRemotePanelOpen,
  remoteConfig,
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

  // Check if selected device has remote capabilities
  const hasRemoteCapability = !!remoteConfig;

  // Handle take control click with auto-connect logic
  const handleTakeControlClick = () => {
    if (!hasRemoteCapability) {
      console.log('[@component:NavigationEditorHeader] Device has no remote capability');
      return;
    }
    
    if (!isControlActive && selectedDevice) {
      // Taking control - auto-connect and show panel
      console.log(`[@component:NavigationEditorHeader] Taking control of ${selectedDevice}`);
      onTakeControl(); // Sets isControlActive = true
      if (!isRemotePanelOpen) {
        onToggleRemotePanel(); // Opens panel
      }
    } else if (isControlActive) {
      // Releasing control - auto-disconnect and hide panel
      console.log(`[@component:NavigationEditorHeader] Releasing control of ${selectedDevice}`);
      onTakeControl(); // Sets isControlActive = false
      if (isRemotePanelOpen) {
        onToggleRemotePanel(); // Closes panel
      }
    }
  };

  // Get controller type name for display
  const getControllerTypeName = () => {
    if (!remoteConfig) return 'No Remote';
    
    switch (remoteConfig.type) {
      case 'android_mobile': return 'Android Mobile';
      case 'android_tv': return 'Android TV';
      case 'ir_remote': return 'IR Remote';
      case 'bluetooth_remote': return 'Bluetooth';
      default: return 'Remote';
    }
  };

  // Extract device names for the dropdown
  const availableDevices = devices.map(device => device.name);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense" sx={{ minHeight: 48, px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
          
          {/* Section 1: Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: '0 1 auto' }}>
            <IconButton 
              onClick={onNavigateToParent} 
              size="small" 
              title="Return to User Interfaces"
            >
              <ArrowBackIcon />
            </IconButton>
            
            {/* Breadcrumb navigation - compact display */}
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, maxWidth: 300 }}>
              {viewPath.length > 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  {viewPath.map((pathItem, index) => (
                    <React.Fragment key={pathItem.id}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onNavigateToParentView(index)}
                        sx={{ 
                          fontSize: '0.7rem', 
                          minWidth: 'auto', 
                          px: 0.5,
                          textTransform: 'none',
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={pathItem.name}
                      >
                        {pathItem.name}
                      </Button>
                      {index < viewPath.length - 1 && <Typography variant="caption" sx={{ mx: 0.25 }}>{'>'}</Typography>}
                    </React.Fragment>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                  {navigationNamePath.map((name, index) => (
                    <React.Fragment key={index}>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onNavigateToTreeLevel(index)}
                        sx={{ 
                          fontSize: '0.7rem', 
                          minWidth: 'auto', 
                          px: 0.5,
                          textTransform: 'none',
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={name}
                      >
                        {name}
                      </Button>
                      {index < navigationNamePath.length - 1 && <Typography variant="caption" sx={{ mx: 0.25 }}>{'>'}</Typography>}
                    </React.Fragment>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          {/* Section 2: Tree Filtering Controls */}
          <Box sx={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center', minWidth: 0 }}>
            <TreeFilterControls
              focusNodeId={focusNodeId}
              availableFocusNodes={availableFocusNodes}
              maxDisplayDepth={maxDisplayDepth}
              totalNodes={totalNodes}
              visibleNodes={visibleNodes}
              onFocusNodeChange={onFocusNodeChange}
              onDepthChange={onDepthChange}
              onResetFocus={onResetFocus}
              compact={true}
            />
          </Box>

          {/* Section 3: Editor Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '0 0 auto' }}>
            <IconButton 
              onClick={onAddNewNode} 
              size="small" 
              title="Add New Node"
              disabled={isLoading || !!error}
            >
              <AddIcon />
            </IconButton>
            
            <IconButton 
              onClick={onFitView} 
              size="small" 
              title="Fit to Screen"
              disabled={isLoading || !!error}
            >
              <FitScreenIcon />
            </IconButton>
            
            <IconButton 
              onClick={onUndo} 
              size="small" 
              title={`Undo (${historyIndex + 1}/${historyLength})`}
              disabled={historyIndex <= 0 || isLoading || !!error}
            >
              <UndoIcon />
            </IconButton>
            
            <IconButton 
              onClick={onRedo} 
              size="small" 
              title={`Redo (${historyIndex + 1}/${historyLength})`}
              disabled={historyIndex >= historyLength - 1 || isLoading || !!error}
            >
              <RedoIcon />
            </IconButton>
            
            <IconButton 
              onClick={onSaveToDatabase} 
              size="small" 
              title={hasUnsavedChanges ? "Save Unsaved Changes" : "Save Navigation Tree"}
              color={hasUnsavedChanges ? "primary" : "default"}
              disabled={isLoading || !!error}
            >
              <SaveIcon />
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, minWidth: 0 }}>
            {/* Device Selection Dropdown */}
            <FormControl size="small" sx={{ minWidth: 120, maxWidth: 140 }}>
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

            {/* Take Control Button */}
            <Button
              variant={isControlActive ? "contained" : "outlined"}
              size="small"
              onClick={handleTakeControlClick}
              disabled={!selectedDevice || !hasRemoteCapability || isLoading || !!error || devicesLoading}
              startIcon={isControlActive ? <TvIcon /> : <TvIcon />}
              color={isControlActive ? "success" : "primary"}
              sx={{ 
                height: 32, 
                fontSize: '0.6rem', 
                minWidth: 110,
                maxWidth: 110,
                whiteSpace: 'nowrap',
                px: 0.5
              }}
              title={hasRemoteCapability ? 
                `${isControlActive ? 'Release' : 'Take'} control of ${getControllerTypeName()} remote` :
                'Selected device has no remote control capability'
              }
            >
              {isControlActive ? 'Stop Remote' : (hasRemoteCapability ? 'Take Control' : 'No Remote')}
            </Button>
            
            {/* Optional: Show remote type indicator */}
            {selectedDevice && hasRemoteCapability && (
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'textSecondary', minWidth: 'fit-content' }}>
                {getControllerTypeName()}
              </Typography>
            )}
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 