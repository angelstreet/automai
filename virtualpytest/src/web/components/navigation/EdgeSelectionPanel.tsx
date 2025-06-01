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

  // Check if run button should be enabled (for multiple actions)
  const canRunActions = isControlActive && selectedDevice && 
    selectedEdge.data?.actions && selectedEdge.data.actions.length > 0 && !isRunning;

  // Clear run results when edge selection changes
  useEffect(() => {
    setRunResult(null);
  }, [selectedEdge.id]);

  // Check if edge can be deleted (protect edges from entry points and home nodes)
  const isProtectedEdge = selectedEdge.data?.from === 'entry' || 
                         selectedEdge.data?.from === 'home' ||
                         selectedEdge.data?.from?.toLowerCase() === 'entry point' ||
                         selectedEdge.data?.from?.toLowerCase().includes('entry') ||
                         selectedEdge.data?.from?.toLowerCase().includes('home') ||
                         selectedEdge.source === 'entry-node' ||
                         selectedEdge.source?.toLowerCase().includes('entry') ||
                         selectedEdge.source?.toLowerCase().includes('home');

  const handleEdit = () => {
    // Convert old format to new format if needed
    let actions = selectedEdge.data?.actions || [];
    let finalWaitTime = selectedEdge.data?.finalWaitTime || 2000;
    
    // Handle backward compatibility with old single action format
    if (!actions.length && selectedEdge.data?.action && typeof selectedEdge.data.action === 'object') {
      actions = [{
        ...selectedEdge.data.action,
        waitTime: 2000, // Default wait time for converted actions
      }];
    }

    setEdgeForm({
      actions: actions,
      finalWaitTime: finalWaitTime,
      description: selectedEdge.data?.description || '',
    });
    setIsEdgeDialogOpen(true);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Execute all edge actions sequentially
  const handleRunActions = async () => {
    if (!selectedEdge.data?.actions || selectedEdge.data.actions.length === 0) {
      console.log('[@component:EdgeSelectionPanel] No actions to run');
      return;
    }
    
    setIsRunning(true);
    setRunResult(null);
    
    try {
      const apiControllerType = controllerTypes[0]?.replace(/_/g, '-') || 'android-mobile';
      let results: string[] = [];
      
      for (let i = 0; i < selectedEdge.data.actions.length; i++) {
        const action = selectedEdge.data.actions[i];
        
        if (!action.id) {
          results.push(`❌ Action ${i + 1}: No action selected`);
          continue;
        }
        
        console.log(`[@component:EdgeSelectionPanel] Executing action ${i + 1}/${selectedEdge.data.actions.length}: ${action.label}`);
        
        const actionToExecute = {
          ...action,
          params: { ...action.params }
        };
        
        // Update params with input values for actions that require them
        if (action.requiresInput && action.inputValue) {
          if (action.command === 'launch_app') {
            actionToExecute.params.package = action.inputValue;
          } else if (action.command === 'input_text') {
            actionToExecute.params.text = action.inputValue;
          } else if (action.command === 'click_element') {
            actionToExecute.params.element_id = action.inputValue;
          } else if (action.command === 'coordinate_tap') {
            const coords = action.inputValue.split(',').map(coord => parseInt(coord.trim()));
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              actionToExecute.params.x = coords[0];
              actionToExecute.params.y = coords[1];
            }
          }
        }
        
        try {
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
            results.push(`✅ Action ${i + 1}: ${result.message || 'Success'}`);
          } else {
            results.push(`❌ Action ${i + 1}: ${result.error || 'Failed'}`);
          }
        } catch (err: any) {
          results.push(`❌ Action ${i + 1}: ${err.message || 'Network error'}`);
        }
        
        // Wait after action
        if (action.waitTime > 0) {
          console.log(`[@component:EdgeSelectionPanel] Waiting ${action.waitTime}ms after action ${i + 1}`);
          await delay(action.waitTime);
        }
      }
      
      // Final wait
      if (selectedEdge.data.finalWaitTime && selectedEdge.data.finalWaitTime > 0) {
        console.log(`[@component:EdgeSelectionPanel] Final wait: ${selectedEdge.data.finalWaitTime}ms`);
        await delay(selectedEdge.data.finalWaitTime);
        results.push(`⏱️ Final wait: ${selectedEdge.data.finalWaitTime}ms completed`);
      }
      
      setRunResult(results.join('\n'));
      console.log(`[@component:EdgeSelectionPanel] All actions completed`);
      
    } catch (err: any) {
      console.error('[@component:EdgeSelectionPanel] Error executing actions:', err);
      setRunResult(`❌ ${err.message}`);
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
        width: 280,
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
        
        {/* Show compact actions list */}
        {selectedEdge.data?.actions && selectedEdge.data.actions.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {selectedEdge.data.actions.map((action, index) => (
              <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem', mb: 0.3 }}>
                {index + 1}. {action.label || 'No action selected'}
                {action.requiresInput && action.inputValue && (
                  <span style={{ color: '#666', marginLeft: '4px' }}>
                    → {action.inputValue}
                  </span>
                )}
              </Typography>
            ))}
          </Box>
        )}

        {/* Show if no actions configured */}
        {(!selectedEdge.data?.actions || selectedEdge.data.actions.length === 0) && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem', fontStyle: 'italic' }}>
            No actions configured
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
            {/* Only show delete button if not a protected edge (from entry/home points) */}
            {!isProtectedEdge && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
          </Box>

          {/* Run button - only shown when actions exist */}
          {selectedEdge.data?.actions && selectedEdge.data.actions.length > 0 && (
            <Button
              size="small"
              variant="contained"
              sx={{ fontSize: '0.75rem', px: 1 }}
              onClick={handleRunActions}
              disabled={!canRunActions}
              title={
                !isControlActive || !selectedDevice 
                  ? 'Device control required to test actions' 
                  : ''
              }
            >
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          )}

          {/* Run result display */}
          {runResult && (
            <Box sx={{ 
              mt: 0.5,
              p: 0.5,
              bgcolor: runResult.includes('❌') ? 'error.light' : 
                       runResult.includes('⚠️') ? 'warning.light' : 'success.light',
              borderRadius: 0.5,
              maxHeight: 100,
              overflow: 'auto'
            }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {runResult}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}; 