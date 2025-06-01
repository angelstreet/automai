import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { EdgeActionItem } from './EdgeActionItem';

interface EdgeAction {
  id: string;
  label: string;
  command: string;
  params: any;
  requiresInput?: boolean;
  inputValue?: string;
  waitTime: number;
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

interface EdgeActionsListProps {
  actions: EdgeAction[];
  finalWaitTime: number;
  availableActions: ControllerActions;
  onActionsChange: (actions: EdgeAction[]) => void;
  onFinalWaitTimeChange: (waitTime: number) => void;
}

export const EdgeActionsList: React.FC<EdgeActionsListProps> = ({
  actions,
  finalWaitTime,
  availableActions,
  onActionsChange,
  onFinalWaitTimeChange,
}) => {
  // Get all actions as flat list
  const getAllActions = (): ControllerAction[] => {
    const allActions: ControllerAction[] = [];
    Object.values(availableActions).forEach(categoryActions => {
      allActions.push(...categoryActions);
    });
    return allActions;
  };

  const addAction = () => {
    const newAction: EdgeAction = {
      id: '',
      label: '',
      command: '',
      params: {},
      requiresInput: false,
      inputValue: '',
      waitTime: 2000,
    };
    onActionsChange([...actions, newAction]);
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    onActionsChange(newActions);
  };

  const updateAction = (index: number, updates: Partial<EdgeAction>) => {
    const newActions = actions.map((action, i) => 
      i === index ? { ...action, ...updates } : action
    );
    onActionsChange(newActions);
  };

  // Find the selected action that requires input (for single input field)
  const getSelectedActionWithInput = () => {
    return actions.find(action => action.id && action.requiresInput);
  };

  const selectedActionWithInput = getSelectedActionWithInput();
  const allAvailableActions = getAllActions();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
          Actions
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addAction}
          sx={{ minWidth: 'auto' }}
        >
          Add
        </Button>
      </Box>

      {actions.length === 0 ? (
        <Box sx={{ 
          py: 3, 
          px: 2, 
          border: '1px dashed', 
          borderColor: 'divider', 
          borderRadius: 1,
          textAlign: 'center',
          mb: 2
        }}>
          <Typography variant="body2" color="text.secondary">
            No actions added. Click "Add" to create your first action.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 1 }}>
          {actions.map((action, index) => (
            <EdgeActionItem
              key={index}
              action={action}
              availableActions={allAvailableActions}
              onUpdate={(updates) => updateAction(index, updates)}
              onRemove={() => removeAction(index)}
              showInput={false} // We'll show input separately below
            />
          ))}
        </Box>
      )}

      {selectedActionWithInput && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Input for {selectedActionWithInput.label}:
          </Typography>
          <TextField
            size="small"
            value={selectedActionWithInput.inputValue || ''}
            onChange={(e) => {
              const actionIndex = actions.findIndex(a => a.id === selectedActionWithInput.id);
              if (actionIndex !== -1) {
                updateAction(actionIndex, { inputValue: e.target.value });
                
                // Update params based on command type
                const updatedParams = { ...selectedActionWithInput.params };
                const value = e.target.value;
                
                if (selectedActionWithInput.command === 'launch_app') {
                  updatedParams.package = value;
                } else if (selectedActionWithInput.command === 'input_text') {
                  updatedParams.text = value;
                } else if (selectedActionWithInput.command === 'click_element') {
                  updatedParams.element_id = value;
                } else if (selectedActionWithInput.command === 'coordinate_tap') {
                  const coords = value.split(',').map(coord => parseInt(coord.trim()));
                  if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    updatedParams.x = coords[0];
                    updatedParams.y = coords[1];
                  }
                }
                
                updateAction(actionIndex, { params: updatedParams });
              }
            }}
            placeholder={
              selectedActionWithInput.command === 'launch_app' ? 'com.example.app' :
              selectedActionWithInput.command === 'input_text' ? 'Enter text to send' :
              selectedActionWithInput.command === 'click_element' ? 'Element ID' :
              selectedActionWithInput.command === 'coordinate_tap' ? 'x,y (e.g., 100,200)' : 'Input value'
            }
            fullWidth
          />
        </Box>
      )}

      <Box>
        <TextField
          label="Final Wait Time (ms)"
          type="number"
          size="small"
          value={finalWaitTime}
          onChange={(e) => onFinalWaitTimeChange(parseInt(e.target.value) || 0)}
          inputProps={{ min: 0, step: 100 }}
          sx={{ width: 160 }}
        />
      </Box>
    </Box>
  );
}; 