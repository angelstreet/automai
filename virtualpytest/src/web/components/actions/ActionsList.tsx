import { Add as AddIcon } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import React from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
import { EdgeAction } from '../../types/pages/Navigation_Types';

import { ActionItem } from './ActionItem';

interface ActionsListProps {
  actions: EdgeAction[];
  onActionsUpdate: (actions: EdgeAction[]) => void;
}

export const ActionsList: React.FC<ActionsListProps> = ({ actions, onActionsUpdate }) => {
  const { getAvailableActions } = useDeviceData();
  const availableActions = getAvailableActions();

  const handleAddAction = () => {
    const newAction: EdgeAction = {
      id: `action_${Date.now()}`,
      command: '',
      params: {},
      description: '',
    };
    onActionsUpdate([...actions, newAction]);
  };

  const handleActionSelect = (index: number, command: string) => {
    // Find the selected action from available actions
    let selectedAction: any = undefined;

    // Search through all controller types to find the action
    for (const actions of Object.values(availableActions)) {
      if (!Array.isArray(actions)) continue;

      const action = actions.find((a) => a.command === command);
      if (action) {
        selectedAction = action;
        break;
      }
    }

    const updatedActions = actions.map((action, i) => {
      if (i === index) {
        return {
          ...action,
          command,
          // Use the action definition's params or initialize with defaults
          params: selectedAction
            ? { ...selectedAction.params, delay: 0.5 }
            : { ...action.params, delay: action.params?.delay || 0.5 },
        };
      }
      return action;
    });
    onActionsUpdate(updatedActions);
  };

  const handleUpdateAction = (index: number, updates: Partial<EdgeAction>) => {
    const updatedActions = actions.map((action, i) => {
      if (i === index) {
        return { ...action, ...updates };
      }
      return action;
    });
    onActionsUpdate(updatedActions);
  };

  const handleRemoveAction = (index: number) => {
    const updatedActions = actions.filter((_, i) => i !== index);
    onActionsUpdate(updatedActions);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updatedActions = [...actions];
    [updatedActions[index - 1], updatedActions[index]] = [
      updatedActions[index],
      updatedActions[index - 1],
    ];
    onActionsUpdate(updatedActions);
  };

  const handleMoveDown = (index: number) => {
    if (index === actions.length - 1) return;
    const updatedActions = [...actions];
    [updatedActions[index], updatedActions[index + 1]] = [
      updatedActions[index + 1],
      updatedActions[index],
    ];
    onActionsUpdate(updatedActions);
  };

  return (
    <Box>
      {actions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {actions.map((action, index) => (
            <ActionItem
              key={action.id}
              action={action}
              index={index}
              availableActions={availableActions}
              onActionSelect={handleActionSelect}
              onUpdateAction={handleUpdateAction}
              onRemoveAction={handleRemoveAction}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              canMoveUp={index > 0}
              canMoveDown={index < actions.length - 1}
            />
          ))}
        </Box>
      )}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddAction}
        fullWidth
        sx={{ mt: 1 }}
      >
        Add Action
      </Button>

      {actions.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          No actions configured. Click "Add Action" to get started.
        </Typography>
      )}
    </Box>
  );
};
