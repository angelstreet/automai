import AddIcon from '@mui/icons-material/Add';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Typography, Button, TextField, Collapse, IconButton } from '@mui/material';
import React, { useState } from 'react';

import { EdgeActionItem } from './Navigation_EdgeActionItem';

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
  retryActions: EdgeAction[];
  finalWaitTime: number;
  availableActions: ControllerActions;
  onActionsChange: (actions: EdgeAction[]) => void;
  onRetryActionsChange: (retryActions: EdgeAction[]) => void;
  onFinalWaitTimeChange: (waitTime: number) => void;
}

export const EdgeActionsList: React.FC<EdgeActionsListProps> = ({
  actions,
  retryActions,
  finalWaitTime,
  availableActions,
  onActionsChange,
  onRetryActionsChange,
  onFinalWaitTimeChange,
}) => {
  const [isActionsExpanded, setIsActionsExpanded] = useState(true);
  const [isRetryExpanded, setIsRetryExpanded] = useState(false);

  // Get all actions as flat list
  const getAllActions = (): ControllerAction[] => {
    const allActions: ControllerAction[] = [];
    Object.values(availableActions).forEach((categoryActions) => {
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

  const addRetryAction = () => {
    const newAction: EdgeAction = {
      id: '',
      label: '',
      command: '',
      params: {},
      requiresInput: false,
      inputValue: '',
      waitTime: 2000,
    };
    onRetryActionsChange([...retryActions, newAction]);
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    onActionsChange(newActions);
  };

  const removeRetryAction = (index: number) => {
    const newRetryActions = retryActions.filter((_, i) => i !== index);
    onRetryActionsChange(newRetryActions);
  };

  const updateAction = (index: number, updates: Partial<EdgeAction>) => {
    const newActions = actions.map((action, i) =>
      i === index ? { ...action, ...updates } : action,
    );
    onActionsChange(newActions);
  };

  const updateRetryAction = (index: number, updates: Partial<EdgeAction>) => {
    const newRetryActions = retryActions.map((action, i) =>
      i === index ? { ...action, ...updates } : action,
    );
    onRetryActionsChange(newRetryActions);
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

  const moveRetryActionUp = (index: number) => {
    if (index === 0) return; // Can't move first item up
    const newRetryActions = [...retryActions];
    [newRetryActions[index - 1], newRetryActions[index]] = [
      newRetryActions[index],
      newRetryActions[index - 1],
    ];
    onRetryActionsChange(newRetryActions);
  };

  const moveRetryActionDown = (index: number) => {
    if (index === retryActions.length - 1) return; // Can't move last item down
    const newRetryActions = [...retryActions];
    [newRetryActions[index], newRetryActions[index + 1]] = [
      newRetryActions[index + 1],
      newRetryActions[index],
    ];
    onRetryActionsChange(newRetryActions);
  };

  const allAvailableActions = getAllActions();

  const renderActionSection = (
    title: string,
    actionsList: EdgeAction[],
    isExpanded: boolean,
    onToggleExpanded: () => void,
    onAddAction: () => void,
    onRemoveAction: (index: number) => void,
    onUpdateAction: (index: number, updates: Partial<EdgeAction>) => void,
    onMoveUp: (index: number) => void,
    onMoveDown: (index: number) => void,
    emptyMessage: string,
    isRetrySection: boolean = false,
  ) => (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.5,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          borderRadius: 1,
          px: 1,
          py: 0.5,
        }}
        onClick={onToggleExpanded}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton size="small" sx={{ mr: 0.5, p: 0 }}>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {title}
            {isRetrySection && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (executes if main actions fail)
              </Typography>
            )}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={(e) => {
            e.stopPropagation();
            onAddAction();
            if (!isExpanded) {
              onToggleExpanded();
            }
          }}
          sx={{ minWidth: 'auto' }}
        >
          Add
        </Button>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ pl: 4 }}>
          {!actionsList || actionsList.length === 0 ? (
            <Box
              sx={{
                py: 1,
                px: 2,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                textAlign: 'center',
                mb: 0.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {emptyMessage}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mb: 1 }}>
              {actionsList.map((action, index) => (
                <EdgeActionItem
                  key={index}
                  action={action}
                  availableActions={allAvailableActions}
                  onUpdate={(updates) => onUpdateAction(index, updates)}
                  onRemove={() => onRemoveAction(index)}
                  onMoveUp={() => onMoveUp(index)}
                  onMoveDown={() => onMoveDown(index)}
                  showInput={true}
                  canMoveUp={index > 0}
                  canMoveDown={index < actionsList.length - 1}
                />
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );

  return (
    <Box>
      {/* Main Actions Section */}
      {renderActionSection(
        'Actions',
        actions,
        isActionsExpanded,
        () => setIsActionsExpanded(!isActionsExpanded),
        addAction,
        removeAction,
        updateAction,
        moveActionUp,
        moveActionDown,
        'No actions added. Click "Add" to create your first action.',
      )}

      {/* Retry Actions Section */}
      {renderActionSection(
        'Retry on Failure',
        retryActions,
        isRetryExpanded,
        () => setIsRetryExpanded(!isRetryExpanded),
        addRetryAction,
        removeRetryAction,
        updateRetryAction,
        moveRetryActionUp,
        moveRetryActionDown,
        'No retry actions added. These will execute if main actions fail.',
        true,
      )}

      {/* Final Wait Time */}
      <Box sx={{ mt: 2 }}>
        <TextField
          label="Final Wait Time (ms)"
          type="number"
          size="small"
          value={finalWaitTime}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || 0;
            console.log(
              '[@component:EdgeActionsList] finalWaitTime changed from',
              finalWaitTime,
              'to',
              newValue,
            );
            onFinalWaitTimeChange(newValue);
          }}
          inputProps={{ min: 0, step: 100 }}
          sx={{ width: 160 }}
        />
      </Box>
    </Box>
  );
};
