import {
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  TextField,
} from '@mui/material';
import React from 'react';

import type { Actions } from '../../types/controller/Action_Types';
import { EdgeAction } from '../../types/pages/Navigation_Types';

interface ActionItemProps {
  action: EdgeAction;
  index: number;
  availableActions: Actions;
  onActionSelect: (index: number, command: string) => void;
  onUpdateAction: (index: number, updates: Partial<EdgeAction>) => void;
  onRemoveAction: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const ActionItem: React.FC<ActionItemProps> = ({
  action,
  index,
  availableActions,
  onActionSelect,
  onUpdateAction,
  onRemoveAction,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const handleParamChange = (paramName: string, value: string | number) => {
    onUpdateAction(index, {
      params: {
        ...action.params,
        [paramName]: value,
      },
    });
  };

  const renderParameterFields = () => {
    if (!action.command) return null;

    const fields = [];

    // Common timeout field for all actions
    fields.push(
      <TextField
        key="timeout"
        label="Timeout (s)"
        type="number"
        size="small"
        value={action.params?.timeout || 0.5}
        onChange={(e) => handleParamChange('timeout', parseFloat(e.target.value) || 0)}
        inputProps={{ min: 0, max: 60, step: 0.1 }}
        sx={{
          width: 120,
          '& .MuiInputBase-input': {
            padding: '4px 8px',
            fontSize: '0.8rem',
          },
        }}
      />,
    );

    // Action-specific parameter fields
    switch (action.command) {
      case 'press_key':
        fields.push(
          <TextField
            key="key"
            label="Key"
            size="small"
            value={action.params?.key || ''}
            onChange={(e) => handleParamChange('key', e.target.value)}
            placeholder="e.g., UP, DOWN, HOME, BACK"
            sx={{
              width: 200,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'input_text':
        fields.push(
          <TextField
            key="text"
            label="Text"
            size="small"
            value={action.params?.text || ''}
            onChange={(e) => handleParamChange('text', e.target.value)}
            placeholder="Text to input"
            sx={{
              width: 250,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'click_element':
        fields.push(
          <TextField
            key="element_id"
            label="Element ID"
            size="small"
            value={action.params?.element_id || ''}
            onChange={(e) => handleParamChange('element_id', e.target.value)}
            placeholder="e.g., Home Button, Menu Icon"
            sx={{
              width: 250,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'tap_coordinates':
        fields.push(
          <TextField
            key="x"
            label="X"
            type="number"
            size="small"
            value={action.params?.x || ''}
            onChange={(e) => handleParamChange('x', parseInt(e.target.value) || 0)}
            sx={{
              width: 80,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
          <TextField
            key="y"
            label="Y"
            type="number"
            size="small"
            value={action.params?.y || ''}
            onChange={(e) => handleParamChange('y', parseInt(e.target.value) || 0)}
            sx={{
              width: 80,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'swipe':
        fields.push(
          <TextField
            key="direction"
            label="Direction"
            size="small"
            value={action.params?.direction || ''}
            onChange={(e) => handleParamChange('direction', e.target.value)}
            placeholder="e.g., up, down, left, right"
            sx={{
              width: 150,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'launch_app':
      case 'close_app':
        fields.push(
          <TextField
            key="package"
            label="Package Name"
            size="small"
            value={action.params?.package || ''}
            onChange={(e) => handleParamChange('package', e.target.value)}
            placeholder="e.g., com.example.app"
            sx={{
              width: 250,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'wait':
        fields.push(
          <TextField
            key="duration"
            label="Duration (s)"
            type="number"
            size="small"
            value={action.params?.duration || 1}
            onChange={(e) => handleParamChange('duration', parseFloat(e.target.value) || 1)}
            inputProps={{ min: 0.1, max: 60, step: 0.1 }}
            sx={{
              width: 120,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;

      case 'scroll':
        fields.push(
          <TextField
            key="direction"
            label="Direction"
            size="small"
            value={action.params?.direction || ''}
            onChange={(e) => handleParamChange('direction', e.target.value)}
            placeholder="e.g., up, down"
            sx={{
              width: 150,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
          <TextField
            key="amount"
            label="Amount"
            type="number"
            size="small"
            value={action.params?.amount || 1}
            onChange={(e) => handleParamChange('amount', parseInt(e.target.value) || 1)}
            sx={{
              width: 100,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
          />,
        );
        break;
    }

    return fields;
  };

  return (
    <Box
      sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      {/* Line 1: Action command dropdown */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={action.command}
            onChange={(e) => onActionSelect(index, e.target.value)}
            label="Action"
            size="small"
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
              },
            }}
            renderValue={(selected) => {
              // Find the selected action and return its label
              const selectedAction = Object.values(availableActions)
                .flat()
                .find((act) => act.command === selected);
              if (selectedAction) {
                return selectedAction.label;
              }
              return selected;
            }}
          >
            {Object.entries(availableActions).map(([category, actions]) => {
              // Ensure actions is an array
              if (!Array.isArray(actions)) {
                console.warn(
                  `[@component:ActionItem] Invalid actions for category ${category}:`,
                  actions,
                );
                return null;
              }

              return [
                <MenuItem
                  key={`header-${category}`}
                  disabled
                  sx={{ fontWeight: 'bold', fontSize: '0.65rem', minHeight: '24px' }}
                >
                  {category.replace(/_/g, ' ').toUpperCase()}
                </MenuItem>,
                ...actions.map((actionDef) => (
                  <MenuItem
                    key={actionDef.command}
                    value={actionDef.command}
                    sx={{ pl: 3, fontSize: '0.7rem', minHeight: '28px' }}
                  >
                    {actionDef.label}
                  </MenuItem>
                )),
              ];
            })}
          </Select>
        </FormControl>

        {/* Move buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <IconButton
            size="small"
            onClick={() => onMoveUp(index)}
            disabled={!canMoveUp}
            sx={{ p: 0.25, minWidth: 0, width: 20, height: 16 }}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onMoveDown(index)}
            disabled={!canMoveDown}
            sx={{ p: 0.25, minWidth: 0, width: 20, height: 16 }}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        </Box>

        {/* Remove button */}
        <IconButton
          size="small"
          onClick={() => onRemoveAction(index)}
          sx={{ p: 0.25, minWidth: 0, width: 20, height: 20 }}
        >
          <CloseIcon sx={{ fontSize: '0.8rem' }} />
        </IconButton>
      </Box>

      {/* Line 2: Parameter fields - conditional based on action type */}
      {action.command && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            alignItems: 'center',
            mb: 0,
            px: 0,
            mx: 0,
            flexWrap: 'wrap',
          }}
        >
          {renderParameterFields()}
        </Box>
      )}
    </Box>
  );
};
