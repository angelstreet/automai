import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { UINavigationEdge, EdgeForm } from '../../types/navigationTypes';

interface EdgeSelectionPanelProps {
  selectedEdge: UINavigationEdge;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  setIsEdgeDialogOpen: (open: boolean) => void;
  // Device control props
  isControlActive?: boolean;
  selectedDevice?: string | null;
  controllerTypes?: string[]; // e.g., ["android_mobile"]
}

export const EdgeSelectionPanel: React.FC<EdgeSelectionPanelProps> = ({
  selectedEdge,
  onClose,
  onEdit,
  onDelete,
  setEdgeForm,
  setIsEdgeDialogOpen,
  isControlActive = false,
  selectedDevice = null,
  controllerTypes = [],
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  // Check if run button should be enabled
  const canRunAction = isControlActive && selectedDevice && selectedEdge.data?.action && !isRunning;

  // Clear run results when edge selection changes
  useEffect(() => {
    setRunResult(null);
  }, [selectedEdge.id]);

  const handleEdit = () => {
    // Handle both old string format and new object format for actions
    let actionValue: EdgeForm['action'] = undefined;
    
    if (selectedEdge.data?.action) {
      if (typeof selectedEdge.data.action === 'string') {
        // Old format - convert to undefined so user can select from dropdown
        actionValue = undefined;
      } else {
        // New format - use as is
        actionValue = selectedEdge.data.action;
      }
    }

    setEdgeForm({
      action: actionValue,
      description: selectedEdge.data?.description || '',
    });
    setIsEdgeDialogOpen(true);
  };

  // Execute the edge action for testing
  const handleRunAction = async () => {
    if (!selectedEdge.data?.action || typeof selectedEdge.data.action === 'string') {
      console.log('[@component:EdgeSelectionPanel] No valid action to run');
      return;
    }
    
    setIsRunning(true);
    setRunResult(null);
    
    try {
      const action = selectedEdge.data.action;
      
      // Prepare the action data
      const actionToExecute = {
        id: action.id,
        label: action.label,
        command: action.command,
        params: { ...action.params }
      };
      
      // Convert underscore to hyphen for API endpoint (android_mobile -> android-mobile)
      const apiControllerType = controllerTypes[0]?.replace(/_/g, '-') || 'android-mobile';
      const response = await fetch(`http://localhost:5009/api/virtualpytest/${apiControllerType}/execute-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionToExecute
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setRunResult(`✅ ${result.message}`);
        console.log(`[@component:EdgeSelectionPanel] Action executed successfully: ${result.message}`);
      } else {
        // Only show error if it's not a connection issue
        if (!result.error?.includes('No active connection') && !result.error?.includes('not connected')) {
          const errorMessage = result.error || 'Action completed but result unclear';
          if (!result.error) {
            // Show as warning when result is unclear
            setRunResult(`⚠️ ${errorMessage}`);
          } else {
            // Show as error for actual errors
            setRunResult(`❌ ${errorMessage}`);
          }
        }
        console.error(`[@component:EdgeSelectionPanel] Action execution failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error('[@component:EdgeSelectionPanel] Error executing action:', err);
      // Don't show connection-related errors in the UI
      if (!err.message?.includes('Failed to fetch') && !err.message?.includes('connection')) {
        setRunResult(`❌ ${err.message}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 200,
        p: 1.5,
        zIndex: 1000,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
            Edge Selection
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ p: 0.25 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Show From/To information */}
        {selectedEdge.data?.from && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            From: {selectedEdge.data.from}
          </Typography>
        )}
        {selectedEdge.data?.to && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            To: {selectedEdge.data.to}
          </Typography>
        )}
        
        {selectedEdge.data?.action && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            Action: {typeof selectedEdge.data.action === 'string' 
              ? selectedEdge.data.action 
              : selectedEdge.data.action.label}
          </Typography>
        )}

        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Edit and Delete buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
              onClick={onDelete}
            >
              Delete
            </Button>
          </Box>

          {/* Run button - only shown when action exists */}
          {selectedEdge.data?.action && typeof selectedEdge.data.action !== 'string' && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              sx={{ 
                fontSize: '0.75rem', 
                px: 1,
                opacity: !canRunAction ? 0.5 : 1,
              }}
              onClick={handleRunAction}
              disabled={!canRunAction}
              title={
                !isControlActive || !selectedDevice 
                  ? 'Device control required to test actions' 
                  : ''
              }
            >
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          )}
        </Box>
         {/* Run Result Display */}
         {runResult && (
          <Box sx={{ 
            p: 1, 
            bgcolor: runResult.startsWith('✅') ? 'success.light' : 
                     runResult.startsWith('⚠️') ? 'warning.light' : 'error.light', 
            borderRadius: 1,
            mb: 1
          }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
              {runResult}
            </Typography>
          </Box>
        )}
        
      </Box>
    </Paper>
  );
}; 