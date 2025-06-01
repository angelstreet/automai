import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { UINavigationEdge } from '../../types/navigationTypes';

interface EdgeForm {     
  action?: {
    id: string;
    label: string;
    command: string;
    params: any;
    description?: string;
    requiresInput?: boolean;
    inputValue?: string;
  };
  description: string;
}

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
  controllerTypes?: string[]; // e.g., ["android_mobile"]
  selectedEdge?: UINavigationEdge | null; // Handle both undefined and null
}

export const EdgeEditDialog: React.FC<EdgeEditDialogProps> = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  onSubmit,
  onClose,
  controllerTypes = [],
  selectedEdge,
}) => {
  const [actions, setActions] = useState<ControllerActions>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  // Fetch available actions for the controller
  useEffect(() => {
    console.log(`[@component:EdgeEditDialog] Dialog opened: ${isOpen}, controllerTypes:`, controllerTypes);
    if (isOpen && controllerTypes.length > 0) {
      console.log(`[@component:EdgeEditDialog] Fetching actions for controller: ${controllerTypes[0]}`);
      fetchControllerActions(controllerTypes[0]); // Use first controller for now
    } else if (isOpen && controllerTypes.length === 0) {
      console.log('[@component:EdgeEditDialog] No controller types provided');
      setError('No controller types available');
    }
  }, [isOpen, controllerTypes]);

  const fetchControllerActions = async (controllerType: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert underscore to hyphen for API endpoint (android_mobile -> android-mobile)
      const apiControllerType = controllerType.replace(/_/g, '-');
      console.log(`[@component:EdgeEditDialog] Fetching actions from: http://localhost:5009/api/virtualpytest/${apiControllerType}/actions`);
      const response = await fetch(`http://localhost:5009/api/virtualpytest/${apiControllerType}/actions`);
      const result = await response.json();
      
      console.log(`[@component:EdgeEditDialog] API response:`, result);
      
      if (result.success) {
        setActions(result.actions);
        console.log(`[@component:EdgeEditDialog] Loaded ${Object.keys(result.actions).length} action categories for ${controllerType}`);
        console.log(`[@component:EdgeEditDialog] Actions:`, result.actions);
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

  // Get all actions as flat list for dropdown
  const getAllActions = (): ControllerAction[] => {
    const allActions: ControllerAction[] = [];
    Object.values(actions).forEach(categoryActions => {
      allActions.push(...categoryActions);
    });
    return allActions;
  };

  const handleActionChange = (actionId: string) => {
    const allActions = getAllActions();
    const selectedAction = allActions.find(action => action.id === actionId);
    
    if (selectedAction) {
      setEdgeForm(prev => ({
        ...prev,
        action: {
          id: selectedAction.id,
          label: selectedAction.label,
          command: selectedAction.command,
          params: selectedAction.params,
          description: selectedAction.description,
          requiresInput: selectedAction.requiresInput,
          inputValue: '', // Reset input value when changing action
        }
      }));
    }
  };

  const handleInputValueChange = (value: string) => {
    if (edgeForm.action) {
      const updatedParams = { ...edgeForm.action.params };
      
      // Update the appropriate param based on action type
      if (edgeForm.action.command === 'launch_app') {
        updatedParams.package = value;
      } else if (edgeForm.action.command === 'input_text') {
        updatedParams.text = value;
      }
      
      setEdgeForm(prev => ({
        ...prev,
        action: {
          ...prev.action!,
          inputValue: value,
          params: updatedParams,
        }
      }));
    }
  };

  const isFormValid = () => {
    if (!edgeForm.action) return false;
    
    // If action requires input, check if input is provided
    if (edgeForm.action.requiresInput && !edgeForm.action.inputValue?.trim()) {
      return false;
    }
    
    return true;
  };

  // Execute the selected action for testing
  const handleRunAction = async () => {
    if (!edgeForm.action) return;
    
    setIsRunning(true);
    setRunResult(null);
    
    try {
      // Prepare the action data with the input value if needed
      const actionToExecute = {
        ...edgeForm.action,
        params: { ...edgeForm.action.params }
      };
      
      // Update params with input values for actions that require them
      if (edgeForm.action.requiresInput && edgeForm.action.inputValue) {
        if (edgeForm.action.command === 'launch_app') {
          actionToExecute.params.package = edgeForm.action.inputValue;
        } else if (edgeForm.action.command === 'input_text') {
          actionToExecute.params.text = edgeForm.action.inputValue;
        }
      }
      
      // Convert underscore to hyphen for API endpoint (android_mobile -> android-mobile)
      const apiControllerType = controllerTypes[0].replace(/_/g, '-');
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
        console.log(`[@component:EdgeEditDialog] Action executed successfully: ${result.message}`);
      } else {
        setRunResult(`❌ ${result.error || 'Action failed'}`);
        console.error(`[@component:EdgeEditDialog] Action execution failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error executing action:', err);
      setRunResult(`❌ Failed to execute action: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit Navigation Action
        {controllerTypes.length > 0 ? (
          <Typography variant="caption" display="block" color="textSecondary">
            Controller: {controllerTypes[0]}
          </Typography>
        ) : (
          <Typography variant="caption" display="block" color="error">
            No controller types available
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          
          {/* Action Selection */}
          <FormControl fullWidth disabled={loading}>
            <InputLabel>Select Action</InputLabel>
            <Select
              value={edgeForm.action?.id || ''}
              onChange={(e) => handleActionChange(e.target.value)}
              label="Select Action"
            >
              {loading ? (
                <MenuItem disabled>Loading actions...</MenuItem>
              ) : error ? (
                <MenuItem disabled>Error: {error}</MenuItem>
              ) : Object.keys(actions).length === 0 ? (
                <MenuItem disabled>No actions available</MenuItem>
              ) : (
                Object.entries(actions).map(([category, categoryActions]) => [
                  <MenuItem key={`${category}-header`} disabled sx={{ fontWeight: 'bold' }}>
                    {category.toUpperCase()}
                  </MenuItem>,
                  ...categoryActions.map((action) => (
                    <MenuItem key={action.id} value={action.id} sx={{ pl: 3 }}>
                      <Box>
                        <Typography variant="body2">{action.label}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {action.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                ])
              )}
            </Select>
          </FormControl>

          {/* Additional Input for Actions that Require It */}
          {edgeForm.action?.requiresInput && (
            <TextField
              label={edgeForm.action.command === 'launch_app' ? 'Package Name' : 
                     edgeForm.action.command === 'input_text' ? 'Text to Input' : 'Input Value'}
              value={edgeForm.action.inputValue || ''}
              onChange={(e) => handleInputValueChange(e.target.value)}
              placeholder={edgeForm.action.command === 'launch_app' ? 'com.example.app' :
                          edgeForm.action.command === 'input_text' ? 'Enter text to send' : ''}
              fullWidth
              size="small"
              helperText={`This value will be sent as the ${
                edgeForm.action.command === 'launch_app' ? 'package name' :
                edgeForm.action.command === 'input_text' ? 'text input' : 'parameter'
              }`}
            />
          )}

          {/* From/To Information */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="From"
              value={selectedEdge?.data?.from || ''}
              InputProps={{
                readOnly: true,
              }}
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="To"
              value={selectedEdge?.data?.to || ''}
              InputProps={{
                readOnly: true,
              }}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>
          
          {/* Description - Single Line */}
          <TextField
            label="Edge Description"
            value={edgeForm.description}
            onChange={(e) => setEdgeForm({ ...edgeForm, description: e.target.value })}
            fullWidth
            size="small"
           
          />

          {/* Available Actions Preview */}
          {Object.keys(actions).length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  All Available Actions ({getAllActions().length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {Object.entries(actions).map(([category, categoryActions]) => (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        {category.toUpperCase()}
                      </Typography>
                      {categoryActions.map((action) => (
                        <Box key={action.id} sx={{ ml: 2, mb: 1 }}>
                          <Typography variant="body2">
                            {action.label} - {action.description}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Run Result Display */}
          {runResult && (
            <Box sx={{ 
              p: 2, 
              bgcolor: runResult.startsWith('✅') ? 'success.light' : 'error.light', 
              borderRadius: 1,
              mt: 2
            }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
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
          onClick={handleRunAction} 
          variant="contained"
          disabled={!edgeForm.action || isRunning}
        >
          {isRunning ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 