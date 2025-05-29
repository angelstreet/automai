import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
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
}) => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        {/* Only show back button if not at root level */}
        {navigationPath.length > 1 && (
          <IconButton 
            edge="start" 
            onClick={onNavigateToParent} 
            size="small" 
            title="Back to Trees"
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        
        {/* Breadcrumb navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {/* Tree level breadcrumb */}
          {navigationNamePath.map((treeName, index) => (
            <Box key={`tree-${index}`} sx={{ display: 'flex', alignItems: 'center' }}>
              {index > 0 && (
                <Typography variant="h6" sx={{ mx: 0.5, color: 'text.secondary' }}>
                  &gt;
                </Typography>
              )}
              <Button
                variant="text"
                size="small"
                onClick={() => onNavigateToTreeLevel(index)}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  fontWeight: 'normal',
                  color: 'text.secondary',
                }}
              >
                {decodeURIComponent(treeName)}
              </Button>
            </Box>
          ))}
          
          {/* View level breadcrumb */}
          {viewPath.length > 1 && viewPath.map((level, index) => (
            <Box key={`view-${index}`} sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mx: 0.5, color: 'text.secondary' }}>
                &gt;
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => onNavigateToParentView(index)}
                sx={{
                  textTransform: 'none',
                  minWidth: 'auto',
                  fontWeight: index === viewPath.length - 1 ? 'bold' : 'normal',
                  color: index === viewPath.length - 1 ? 'primary.main' : 'text.secondary',
                }}
              >
                {level.name}
                {index === viewPath.length - 1 && hasUnsavedChanges && (
                  <Typography component="span" sx={{ color: 'warning.main', ml: 0.5 }}>
                    *
                  </Typography>
                )}
              </Button>
            </Box>
          ))}
        </Box>
        
        {/* Tree Filter Controls */}
        <Box sx={{ mr: 2 }}>
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
        
        {/* Action Buttons */}
        <Button
          startIcon={<AddIcon />}
          onClick={onAddNewNode}
          size="small"
          sx={{ mr: 1 }}
          disabled={isLoading || !!error}
        >
          Add Node
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
      </Toolbar>
    </AppBar>
  );
}; 