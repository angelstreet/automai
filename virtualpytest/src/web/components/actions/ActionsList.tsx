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
  const { getActions } = useDeviceData();
  const availableActions = getActions();

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
    // Find the action definition to get default parameters
    const actionDef = Object.values(availableActions)
      .flat()
      .find((action) => action.command === command);

    const updatedActions = [...actions];
    updatedActions[index] = {
      ...updatedActions[index],
      command,
      params: {
        ...actionDef?.params, // Use default params from action definition
        delay: updatedActions[index].params?.delay || 0.5, // Preserve existing delay or default
      },
    };
    onActionsUpdate(updatedActions);
  };

  const handleUpdateAction = (index: number, updates: Partial<EdgeAction>) => {
    const updatedActions = [...actions];
    updatedActions[index] = { ...updatedActions[index], ...updates };
    onActionsUpdate(updatedActions);
  };

  const handleRemoveAction = (index: number) => {
    const updatedActions = actions.filter((_, i) => i !== index);
    onActionsUpdate(updatedActions);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const updatedActions = [...actions];
      [updatedActions[index - 1], updatedActions[index]] = [
        updatedActions[index],
        updatedActions[index - 1],
      ];
      onActionsUpdate(updatedActions);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < actions.length - 1) {
      const updatedActions = [...actions];
      [updatedActions[index], updatedActions[index + 1]] = [
        updatedActions[index + 1],
        updatedActions[index],
      ];
      onActionsUpdate(updatedActions);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
          Actions ({actions.length})
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddAction}
          sx={{ fontSize: '0.75rem', minHeight: 24 }}
        >
          Add Action
        </Button>
      </Box>

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

      {actions.length === 0 && (
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8rem' }}
        >
          No actions configured. Click "Add Action" to get started.
        </Typography>
      )}
    </Box>
  );
};
