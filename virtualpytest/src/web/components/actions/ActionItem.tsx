import {
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { Box, FormControl, Select, MenuItem, IconButton, TextField } from '@mui/material';
import React from 'react';

import type { Actions, EdgeAction } from '../../types/controller/ActionTypes';

import { ActionControls } from './ActionControls';
import { ActionTestResults } from './ActionTestResults';

interface ActionItemProps {
  action: EdgeAction;
  index: number;
  availableActionTypes: Actions;
  testResult?: EdgeAction;
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
  availableActionTypes,
  testResult,
  onActionSelect,
  onUpdateAction,
  onRemoveAction,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  return (
    <Box
      sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      {/* Line 1: Action dropdown */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
          <Select
            value={action.id || action.command || ''}
            onChange={(e) => onActionSelect(index, e.target.value)}
            displayEmpty
            size="small"
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 200,
                  '& .MuiMenuItem-root': {
                    fontSize: '0.8rem',
                    minHeight: '28px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    lineHeight: 0.8,
                  },
                },
              },
            }}
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
                paddingTop: '4px',
                paddingBottom: '2px',
              },
            }}
            renderValue={(selected) => {
              if (!selected) {
                return <em style={{ fontSize: '0.8rem' }}>Select action...</em>;
              }

              // Find the selected action to display its label
              let selectedLabel = '';

              // Search through all action categories to find the action (same logic as ActionsList)
              for (const [category, categoryData] of Object.entries(availableActionTypes)) {
                let actions: any[] = [];

                if (Array.isArray(categoryData)) {
                  // Direct array (flat structure)
                  actions = categoryData;
                } else if (categoryData && typeof categoryData === 'object') {
                  // Nested structure - get the array from the nested object
                  const nestedActions = categoryData[category];
                  if (Array.isArray(nestedActions)) {
                    actions = nestedActions;
                  }
                }

                const actionItem = actions.find((a) => a.id === selected);
                if (actionItem) {
                  selectedLabel = actionItem.label;
                  break;
                }
              }

              return selectedLabel || selected;
            }}
          >
            {Object.entries(availableActionTypes).map(([category, categoryData]) => {
              // Handle nested structure: availableActionTypes.remote.remote = [actions...]
              let actions: any[] = [];
              if (Array.isArray(categoryData)) {
                // Direct array (flat structure)
                actions = categoryData;
              } else if (categoryData && typeof categoryData === 'object') {
                // Nested structure - get the array from the nested object
                const nestedActions = categoryData[category];
                if (Array.isArray(nestedActions)) {
                  actions = nestedActions;
                } else {
                  console.warn(
                    `[@component:ActionItem] Invalid nested actions for category ${category}:`,
                    categoryData,
                  );
                  return null;
                }
              } else {
                console.warn(
                  `[@component:ActionItem] Invalid actions for category ${category}:`,
                  categoryData,
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
                ...actions.map((actionItem, actionIndex) => (
                  <MenuItem
                    key={`${category}-${actionIndex}-${actionItem.command}`}
                    value={actionItem.id}
                    sx={{ pl: 3, fontSize: '0.7rem', minHeight: '28px' }}
                  >
                    {actionItem.label}
                  </MenuItem>
                )),
              ];
            })}
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="number"
          value={action.waitTime}
          onChange={(e) => onUpdateAction(index, { waitTime: parseInt(e.target.value) || 0 })}
          sx={{
            width: 80,
            '& .MuiInputBase-input': {
              fontSize: '0.8rem',
              py: 0.5,
            },
          }}
          inputProps={{ min: 0, step: 100 }}
        />

        <IconButton
          size="small"
          onClick={() => onMoveUp(index)}
          disabled={!canMoveUp}
          sx={{ opacity: !canMoveUp ? 0.3 : 1 }}
        >
          <KeyboardArrowUpIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => onMoveDown(index)}
          disabled={!canMoveDown}
          sx={{ opacity: !canMoveDown ? 0.3 : 1 }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={() => onRemoveAction(index)} color="error">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Line 2: Parameter controls using extracted component */}
      <ActionControls action={action} index={index} onUpdateAction={onUpdateAction} />

      {/* Test Results Display using extracted component */}
      {testResult && <ActionTestResults testResult={testResult} />}
    </Box>
  );
};
