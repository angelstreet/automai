import { Box, TextField } from '@mui/material';
import React from 'react';

import type { EdgeAction } from '../../types/controller/ActionTypes';

interface ActionControlsProps {
  action: EdgeAction;
  index: number;
  onUpdateAction: (index: number, updates: Partial<EdgeAction>) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  action,
  index,
  onUpdateAction,
}) => {
  // Don't show controls if no action is selected
  if (!action.command) {
    return null;
  }

  const handleInputValueChange = (value: string) => {
    const updatedParams: any = { ...action.params };

    // Update params based on action command
    if (action.command === 'launch_app') {
      updatedParams.package = value;
    } else if (action.command === 'input_text') {
      updatedParams.text = value;
    } else if (action.command === 'click_element') {
      updatedParams.element_id = value;
    } else if (action.command === 'coordinate_tap' || action.command === 'tap_coordinates') {
      const coords = value.split(',').map((coord) => parseInt(coord.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        updatedParams.x = coords[0];
        updatedParams.y = coords[1];
        updatedParams.coordinates = value; // Keep original format too
      }
    } else if (action.command === 'press_key') {
      updatedParams.key = value;
    }

    onUpdateAction(index, {
      inputValue: value,
      params: updatedParams,
    });
  };

  // Only show input field if action requires input
  if (!action.requiresInput) {
    return null;
  }

  const getPlaceholder = () => {
    switch (action.command) {
      case 'launch_app':
        return 'com.example.app';
      case 'input_text':
        return 'Enter text';
      case 'click_element':
        return 'Element text (e.g., "OK|Accept")';
      case 'coordinate_tap':
      case 'tap_coordinates':
        return 'x,y (e.g., "100,200")';
      case 'press_key':
        return 'Key name (e.g., "UP", "DOWN", "ENTER")';
      default:
        return 'Enter value';
    }
  };

  return (
    <Box sx={{ mb: 0.5 }}>
      <TextField
        size="small"
        value={action.inputValue || ''}
        onChange={(e) => handleInputValueChange(e.target.value)}
        placeholder={getPlaceholder()}
        fullWidth
        sx={{
          '& .MuiInputBase-input': {
            fontSize: '0.8rem',
            py: 0.5,
          },
        }}
      />
    </Box>
  );
};
