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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { UINavigationEdge, EdgeForm, EdgeAction } from '../../types/pages/Navigation_Types';
import { EdgeActionsList } from './Navigation_EdgeActionsList';
import { executeEdgeActions } from '../../utils/navigation/navigationUtils';

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
  selectedHostDevice?: any; // Add host device prop for controller proxy access
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
  selectedHostDevice,
}) => {
  const [controllerActions, setControllerActions] = useState<ControllerActions>({});
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [isRunningActions, setIsRunningActions] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const canRunActions = isControlActive && selectedDevice && edgeForm.actions.length > 0 && !isRunningActions;

  useEffect(() => {
    if (!isOpen) {
      setActionResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Only log when dialog is actually opened, not when closed
    if (isOpen) {
      console.log(`[@component:EdgeEditDialog] Dialog opened, controllerTypes:`, controllerTypes);
      if (controllerTypes.length > 0 && selectedHostDevice?.controllerProxies?.remote) {
        console.log(`[@component:EdgeEditDialog] Fetching actions for controller: ${controllerTypes[0]}`);
        fetchControllerActions(controllerTypes[0]);
      } else {
        console.log('[@component:EdgeEditDialog] No controller types or remote controller proxy available');
        setActionsError('No controller types available or remote controller not accessible');
      }
    }
  }, [isOpen, controllerTypes, selectedHostDevice]);

  const fetchControllerActions = async (controllerType: string) => {
    if (!selectedHostDevice?.controllerProxies?.remote) {
      setActionsError('Remote controller proxy not available');
      return;
    }

    setLoadingActions(true);
    setActionsError(null);
    
    try {
      console.log(`[@component:EdgeEditDialog] Fetching actions using remote controller proxy`);
      const result = await selectedHostDevice.controllerProxies.remote.getActions();
      
      console.log(`[@component:EdgeEditDialog] Controller proxy response:`, result);
      
      if (result.success) {
        setControllerActions(result.actions);
        console.log(`[@component:EdgeEditDialog] Loaded ${Object.keys(result.actions).length} action categories for remote controller`);
      } else {
        console.error(`[@component:EdgeEditDialog] Controller proxy returned error:`, result.error);
        setActionsError(result.error || 'Failed to load actions');
      }
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error fetching actions:', err);
      setActionsError('Failed to connect to remote controller');
    } finally {
      setLoadingActions(false);
    }
  };

  const isFormValid = () => {
    return edgeForm.actions.every(action => 
      !action.id || !action.requiresInput || (action.inputValue && action.inputValue.trim())
    );
  };

  const handleRunActions = async () => {
    if (edgeForm.actions.length === 0) return;
    
    if (isRunningActions) {
      console.log('[@component:EdgeEditDialog] Execution already in progress, ignoring duplicate request');
      return;
    }
    
    setIsRunningActions(true);
    setActionResult(null);
    console.log(`[@component:EdgeEditDialog] Starting execution of ${edgeForm.actions.length} actions with ${edgeForm.retryActions.length} retry actions`);
    
    try {
      const result = await executeEdgeActions(
        edgeForm.actions,
        controllerTypes,
        selectedHostDevice, // Pass selectedHostDevice instead of buildServerUrl
        undefined,
        edgeForm.finalWaitTime,
        edgeForm.retryActions,
        undefined
      );
      
      // Update the edge form with the updated actions
      setEdgeForm(prev => ({
        ...prev,
        actions: result.updatedActions,
        retryActions: result.updatedRetryActions || prev.retryActions
      }));
      
      setActionResult(result.results.join('\n'));
      
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error executing actions:', err);
      setActionResult(`❌ ${err.message}`);
    } finally {
      setIsRunningActions(false);
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
            availableActions={controllerActions}
            onActionsChange={(newActions) => setEdgeForm({ ...edgeForm, actions: newActions })}
            onRetryActionsChange={(newRetryActions) => setEdgeForm({ ...edgeForm, retryActions: newRetryActions })}
            onFinalWaitTimeChange={(finalWaitTime) => setEdgeForm({ ...edgeForm, finalWaitTime })}
          />

          {actionResult && (
            <Box sx={{ 
              p: 2, 
              bgcolor: actionResult.includes('❌ OVERALL RESULT: FAILED') ? 'error.light' : 
                       actionResult.includes('✅ OVERALL RESULT: SUCCESS') ? 'success.light' :
                       actionResult.includes('❌') && !actionResult.includes('✅') ? 'error.light' : 
                       actionResult.includes('⚠️') ? 'warning.light' : 'success.light', 
              borderRadius: 1,
              maxHeight: 200,
              overflow: 'auto'
            }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {actionResult}
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
          {isRunningActions ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 