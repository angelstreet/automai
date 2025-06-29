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

import { EdgeAction } from '../../types/pages/Navigation_Types';

interface ActionItemProps {
  action: EdgeAction;
  index: number;
  availableActions: Record<string, any[]>;
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
  // Find the selected action definition to get its configuration
  const selectedActionDef = Object.values(availableActions)
    .flat()
    .find((actionDef) => actionDef.command === action.command);

  return (
    <Box
      sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      {/* Line 1: Action command dropdown */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Action</InputLabel>
          <Select
            value={action.command || ''}
            onChange={(e) => onActionSelect(index, e.target.value)}
            label="Action"
            size="small"
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
              },
            }}
            renderValue={(selected) => {
              // Find the selected action and return its formatted label
              const selectedAction = Object.values(availableActions)
                .flat()
                .find((actionDef) => actionDef.command === selected);
              if (selectedAction) {
                return (
                  selectedAction.label ||
                  selectedAction.command
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .trim()
                );
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
                    {actionDef.label ||
                      actionDef.command
                        .replace(/_/g, ' ')
                        .replace(/([A-Z])/g, ' $1')
                        .trim()}
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

      {/* Line 2: Parameter fields based on selected action */}
      {action.command && selectedActionDef && (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0, px: 0, mx: 0 }}>
          {/* Input field for actions that require input */}
          {selectedActionDef.requiresInput && (
            <TextField
              size="small"
              label={selectedActionDef.inputLabel || 'Input'}
              placeholder={selectedActionDef.inputPlaceholder || 'Enter value...'}
              value={
                action.params?.input ||
                action.params?.text ||
                action.params?.key ||
                action.params?.package ||
                action.params?.element_identifier ||
                ''
              }
              autoComplete="off"
              onChange={(e) => {
                const value = e.target.value;
                let paramKey = 'input';

                // Determine the correct parameter key based on the command
                if (action.command === 'input_text') {
                  paramKey = 'text';
                } else if (action.command === 'press_key') {
                  paramKey = 'key';
                } else if (action.command === 'launch_app' || action.command === 'close_app') {
                  paramKey = 'package';
                } else if (action.command === 'click_element') {
                  paramKey = 'element_identifier';
                } else if (action.command === 'tap_coordinates') {
                  // For tap_coordinates, we'll handle x,y separately
                  paramKey = 'coordinates';
                }

                onUpdateAction(index, {
                  params: {
                    ...action.params,
                    [paramKey]: value,
                  },
                });
              }}
              sx={{
                flex: 1,
                minWidth: 150,
                '& .MuiInputBase-input': {
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                },
              }}
            />
          )}

          {/* Coordinates fields for tap_coordinates */}
          {action.command === 'tap_coordinates' && (
            <>
              <TextField
                size="small"
                type="number"
                label="X"
                value={action.params?.x || 0}
                autoComplete="off"
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  onUpdateAction(index, {
                    params: {
                      ...action.params,
                      x: value,
                    },
                  });
                }}
                sx={{
                  width: 70,
                  '& .MuiInputBase-input': {
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                  },
                }}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                size="small"
                type="number"
                label="Y"
                value={action.params?.y || 0}
                autoComplete="off"
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  onUpdateAction(index, {
                    params: {
                      ...action.params,
                      y: value,
                    },
                  });
                }}
                sx={{
                  width: 70,
                  '& .MuiInputBase-input': {
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                  },
                }}
                inputProps={{ min: 0, step: 1 }}
              />
            </>
          )}

          {/* Delay field for all actions */}
          <TextField
            size="small"
            type="number"
            label="Delay (s)"
            value={action.params?.delay !== undefined ? action.params.delay : 0.5}
            autoComplete="off"
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              onUpdateAction(index, {
                params: {
                  ...action.params,
                  delay: isNaN(value) ? 0.5 : value,
                },
              });
            }}
            sx={{
              width: 80,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
            inputProps={{ min: 0, max: 10, step: 0.1 }}
          />
        </Box>
      )}
    </Box>
  );
};
