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

  const moveActionUp = (index: number) => {
    if (index === 0) return; // Can't move first item up
    const newActions = [...actions];
    [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
    onActionsChange(newActions);
  };

  const moveActionDown = (index: number) => {
    if (index === actions.length - 1) return; // Can't move last item down
    const newActions = [...actions];
    [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
    onActionsChange(newActions);
  };

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
          mb: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            No actions added. Click "Add" to create your first action.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          {actions.map((action, index) => (
            <EdgeActionItem
              key={index}
              action={action}
              availableActions={allAvailableActions}
              onUpdate={(updates) => updateAction(index, updates)}
              onRemove={() => removeAction(index)}
              onMoveUp={() => moveActionUp(index)}
              onMoveDown={() => moveActionDown(index)}
              showInput={true}
              canMoveUp={index > 0}
              canMoveDown={index < actions.length - 1}
            />
          ))}
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