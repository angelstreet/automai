import React from 'react';
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
  
  // Remote control props
  isRemotePanelOpen: boolean;
  selectedDevice: string | null;
  isControlActive: boolean;
  
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
  // Empty device list for now
  const availableDevices: string[] = [];

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense" sx={{ minHeight: 48, px: 2 }}>
        {/* Grid Layout with 4 sections */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 2,
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
              {navigationNamePath.length > 0 
                ? decodeURIComponent(navigationNamePath[navigationNamePath.length - 1])
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
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
            {/* Device Selection Dropdown */}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="device-select-label">Device</InputLabel>
              <Select
                labelId="device-select-label"
                value={selectedDevice || ''}
                onChange={(e) => onDeviceSelect(e.target.value || null)}
                label="Device"
                disabled={isLoading || !!error}
                sx={{ height: 32, fontSize: '0.875rem' }}
              >
                <MenuItem value="">
                  <em>No device</em>
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
              onClick={onTakeControl}
              disabled={!selectedDevice || isLoading || !!error}
              startIcon={<ControlCameraIcon />}
              color={isControlActive ? "success" : "primary"}
              sx={{ 
                height: 32, 
                fontSize: '0.65rem', 
                minWidth: 'auto',
                whiteSpace: 'nowrap',
                px: 1
              }}
            >
              {isControlActive ? 'Release' : 'Take&nbsp;Control'}
            </Button>

            {/* Toggle Remote Panel Button */}
            <IconButton 
              onClick={onToggleRemotePanel} 
              size="small" 
              title={isRemotePanelOpen ? "Hide Remote Panel" : "Show Remote Panel"}
              color={isRemotePanelOpen ? "primary" : "default"}
              disabled={isLoading || !!error}
            >
              <TvIcon />
            </IconButton>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 