import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import { UINavigationEdge, EdgeForm, EdgeAction } from '../../types/navigationTypes';
import { EdgeActionsList } from './EdgeActionsList';

interface ControllerAction {
  id: string;
  label: string;
  command: string;
  params: any;
  description: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface ControllerActions {
  [category: string]: ControllerAction[];
}

interface EdgeEditDialogProps {
  isOpen: boolean;
  edgeForm: EdgeForm;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  onSubmit: () => void;
  onClose: () => void;
  controllerTypes?: string[];
  selectedEdge?: UINavigationEdge | null;
  isControlActive?: boolean;
  selectedDevice?: string | null;
}

export const EdgeEditDialog: React.FC<EdgeEditDialogProps> = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  onSubmit,
  onClose,
  controllerTypes = [],
  selectedEdge,
  isControlActive = false,
  selectedDevice = null,
}) => {
  const [actions, setActions] = useState<ControllerActions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const canRunActions = isControlActive && selectedDevice && edgeForm.actions.length > 0 && !isRunning;

  useEffect(() => {
    if (!isOpen) {
      setRunResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    console.log(`[@component:EdgeEditDialog] Dialog opened: ${isOpen}, controllerTypes:`, controllerTypes);
    if (isOpen && controllerTypes.length > 0) {
      console.log(`[@component:EdgeEditDialog] Fetching actions for controller: ${controllerTypes[0]}`);
      fetchControllerActions(controllerTypes[0]);
    } else if (isOpen && controllerTypes.length === 0) {
      console.log('[@component:EdgeEditDialog] No controller types provided');
      setError('No controller types available');
    }
  }, [isOpen, controllerTypes]);

  const fetchControllerActions = async (controllerType: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const apiControllerType = controllerType.replace(/_/g, '-');
      console.log(`[@component:EdgeEditDialog] Fetching actions from: http://localhost:5009/api/virtualpytest/${apiControllerType}/actions`);
      const response = await fetch(`http://localhost:5009/api/virtualpytest/${apiControllerType}/actions`);
      const result = await response.json();
      
      console.log(`[@component:EdgeEditDialog] API response:`, result);
      
      if (result.success) {
        setActions(result.actions);
        console.log(`[@component:EdgeEditDialog] Loaded ${Object.keys(result.actions).length} action categories for ${controllerType}`);
      } else {
        console.error(`[@component:EdgeEditDialog] API returned error:`, result.error);
        setError(result.error || 'Failed to load actions');
      }
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error fetching actions:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return edgeForm.actions.every(action => 
      !action.id || !action.requiresInput || (action.inputValue && action.inputValue.trim())
    );
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRunActions = async () => {
    if (edgeForm.actions.length === 0) return;
    
    setIsRunning(true);
    setRunResult(null);
    
    try {
      const apiControllerType = controllerTypes[0].replace(/_/g, '-');
      let results: string[] = [];
      
      for (let i = 0; i < edgeForm.actions.length; i++) {
        const action = edgeForm.actions[i];
        
        if (!action.id) {
          results.push(`❌ Action ${i + 1}: No action selected`);
          continue;
        }
        
        console.log(`[@component:EdgeEditDialog] Executing action ${i + 1}/${edgeForm.actions.length}: ${action.label}`);
        
        const actionToExecute = {
          ...action,
          params: { ...action.params }
        };
        
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
          console.log(`[@component:EdgeEditDialog] Waiting ${action.waitTime}ms after action ${i + 1}`);
          await delay(action.waitTime);
        }
      }
      
      // Final wait
      if (edgeForm.finalWaitTime > 0) {
        console.log(`[@component:EdgeEditDialog] Final wait: ${edgeForm.finalWaitTime}ms`);
        await delay(edgeForm.finalWaitTime);
        results.push(`⏱️ Final wait: ${edgeForm.finalWaitTime}ms completed`);
      }
      
      setRunResult(results.join('\n'));
      console.log(`[@component:EdgeEditDialog] All actions completed`);
      
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error executing actions:', err);
      setRunResult(`❌ ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit Navigation Actions
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="From"
              value={selectedEdge?.data?.from || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="To"
              value={selectedEdge?.data?.to || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>
          
          <TextField
            label="Edge Description"
            value={edgeForm.description}
            onChange={(e) => setEdgeForm({ ...edgeForm, description: e.target.value })}
            fullWidth
            size="small"
          />
          
          <EdgeActionsList
            actions={edgeForm.actions}
            finalWaitTime={edgeForm.finalWaitTime}
            availableActions={actions}
            onActionsChange={(newActions) => setEdgeForm({ ...edgeForm, actions: newActions })}
            onFinalWaitTimeChange={(finalWaitTime) => setEdgeForm({ ...edgeForm, finalWaitTime })}
          />

          {runResult && (
            <Box sx={{ 
              p: 2, 
              bgcolor: runResult.includes('❌') ? 'error.light' : 
                       runResult.includes('⚠️') ? 'warning.light' : 'success.light', 
              borderRadius: 1,
              maxHeight: 200,
              overflow: 'auto'
            }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {runResult}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={!isFormValid()}
        >
          Save
        </Button>
        <Button 
          onClick={handleRunActions} 
          variant="contained"
          disabled={!canRunActions}
          sx={{ opacity: !canRunActions ? 0.5 : 1 }}
        >
          {isRunning ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 