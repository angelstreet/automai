import React from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  TextField,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

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

interface EdgeActionItemProps {
  action: EdgeAction;
  availableActions: ControllerAction[];
  onUpdate: (updates: Partial<EdgeAction>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  showInput: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const EdgeActionItem: React.FC<EdgeActionItemProps> = ({
  action,
  availableActions,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  showInput,
  canMoveUp,
  canMoveDown,
}) => {
  const handleActionChange = (actionId: string) => {
    if (actionId === '') {
      onUpdate({ id: '', label: '', command: '', params: {}, inputValue: '' });
      return;
    }
    
    const selectedAction = availableActions.find(a => a.id === actionId);
    if (selectedAction) {
      onUpdate({
        id: selectedAction.id,
        label: selectedAction.label,
        command: selectedAction.command,
        params: selectedAction.params,
        requiresInput: selectedAction.requiresInput,
        inputValue: '',
      });
    }
  };

  const handleInputValueChange = (value: string) => {
    const updatedParams = { ...action.params };
    
    if (action.command === 'launch_app') {
      updatedParams.package = value;
    } else if (action.command === 'input_text') {
      updatedParams.text = value;
    } else if (action.command === 'click_element') {
      updatedParams.element_id = value;
    } else if (action.command === 'coordinate_tap') {
      const coords = value.split(',').map(coord => parseInt(coord.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        updatedParams.x = coords[0];
        updatedParams.y = coords[1];
      }
    }
    
    onUpdate({
      inputValue: value,
      params: updatedParams,
    });
  };

  return (
    <Box sx={{ 
      border: 1, 
      borderColor: 'divider', 
      borderRadius: 1, 
      px: 1.5,
      py: 1,
      mb: 0.5
    }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
          <Select
            value={availableActions.find(a => a.id === action.id) ? action.id : ''}
            onChange={(e) => handleActionChange(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">Select Action</MenuItem>
            {availableActions.map((availableAction) => (
              <MenuItem key={availableAction.id} value={availableAction.id}>
                {availableAction.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <TextField
          size="small"
          type="number"
          value={action.waitTime}
          onChange={(e) => onUpdate({ waitTime: parseInt(e.target.value) || 0 })}
          sx={{ width: 80 }}
          inputProps={{ min: 0, step: 100 }}
        />
        
        <IconButton 
          size="small" 
          onClick={onMoveUp} 
          disabled={!canMoveUp}
          sx={{ opacity: !canMoveUp ? 0.3 : 1 }}
        >
          <KeyboardArrowUpIcon fontSize="small" />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={onMoveDown} 
          disabled={!canMoveDown}
          sx={{ opacity: !canMoveDown ? 0.3 : 1 }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>
        
        <IconButton size="small" onClick={onRemove} color="error">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      
      {showInput && action.requiresInput && action.id && (
        <Box sx={{ mb: 0 }}>
          <TextField
            size="small"
            value={action.inputValue || ''}
            onChange={(e) => handleInputValueChange(e.target.value)}
            placeholder={
              action.command === 'launch_app' ? 'com.example.app' :
              action.command === 'input_text' ? 'Enter text' :
              action.command === 'click_element' ? 'Element ID' :
              action.command === 'coordinate_tap' ? 'x,y' : 'Input value'
            }
            fullWidth
          />
        </Box>
      )}
    </Box>
  );
}; 