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
import { executeEdgeActions } from '../../utils/navigationApi';

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

  const handleRunActions = async () => {
    if (edgeForm.actions.length === 0) return;
    
    if (isRunning) {
      console.log('[@component:EdgeEditDialog] Execution already in progress, ignoring duplicate request');
      return;
    }
    
    setIsRunning(true);
    setRunResult(null);
    console.log(`[@component:EdgeEditDialog] Starting execution of ${edgeForm.actions.length} actions with ${edgeForm.retryActions.length} retry actions`);
    
    try {
      const result = await executeEdgeActions(
        edgeForm.actions,
        controllerTypes,
        undefined, // No updateActionResults callback needed for dialog
        edgeForm.finalWaitTime,
        edgeForm.retryActions,
        undefined // No updateRetryActionResults callback needed for dialog
      );
      
      // Update the edge form with the updated actions
      setEdgeForm(prev => ({
        ...prev,
        actions: result.updatedActions,
        retryActions: result.updatedRetryActions || prev.retryActions
      }));
      
      setRunResult(result.results.join('\n'));
      
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
            retryActions={edgeForm.retryActions}
            finalWaitTime={edgeForm.finalWaitTime}
            availableActions={actions}
            onActionsChange={(newActions) => setEdgeForm({ ...edgeForm, actions: newActions })}
            onRetryActionsChange={(newRetryActions) => setEdgeForm({ ...edgeForm, retryActions: newRetryActions })}
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