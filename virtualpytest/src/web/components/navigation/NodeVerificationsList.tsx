import React from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

interface NodeVerification {
  id: string;
  label: string;
  command: string;
  controller_type: 'text' | 'image';
  params: any;
  description?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
}

interface VerificationAction {
  id: string;
  label: string;
  command: string;
  params: any;
  description: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface VerificationActions {
  [category: string]: VerificationAction[];
}

interface NodeVerificationsListProps {
  verifications: NodeVerification[];
  availableActions: VerificationActions;
  onVerificationsChange: (verifications: NodeVerification[]) => void;
  loading?: boolean;
  error?: string | null;
}

export const NodeVerificationsList: React.FC<NodeVerificationsListProps> = ({
  verifications,
  availableActions = {}, // Default to empty object
  onVerificationsChange,
  loading = false,
  error = null,
}) => {
  const addVerification = () => {
    const newVerification: NodeVerification = {
      id: '',
      label: '',
      command: '',
      controller_type: 'text',
      params: {},
      inputValue: '',
    };
    onVerificationsChange([...verifications, newVerification]);
  };

  const removeVerification = (index: number) => {
    const newVerifications = verifications.filter((_, i) => i !== index);
    onVerificationsChange(newVerifications);
  };

  const updateVerification = (index: number, updates: Partial<NodeVerification>) => {
    const newVerifications = verifications.map((verification, i) => 
      i === index ? { ...verification, ...updates } : verification
    );
    onVerificationsChange(newVerifications);
  };

  const handleVerificationSelect = (index: number, actionId: string) => {
    // Find the selected action from available actions
    let selectedAction: VerificationAction | undefined = undefined;
    let controllerType: 'text' | 'image' = 'text';
    
    Object.entries(availableActions).forEach(([category, actions]) => {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        selectedAction = action;
        // Determine controller type from category or action properties
        if (category.toLowerCase().includes('image') || action.command.includes('image')) {
          controllerType = 'image';
        } else {
          controllerType = 'text';
        }
      }
    });

    if (selectedAction) {
      updateVerification(index, {
        id: selectedAction.id,
        label: selectedAction.label,
        command: selectedAction.command,
        controller_type: controllerType,
        params: { ...selectedAction.params },
        description: selectedAction.description,
        requiresInput: selectedAction.requiresInput,
        inputLabel: selectedAction.inputLabel,
        inputPlaceholder: selectedAction.inputPlaceholder,
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={20} />
        <Typography>Loading verification actions...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
          Verifications
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addVerification}
          sx={{ minWidth: 'auto' }}
        >
          Add
        </Button>
      </Box>

      <Box sx={{ mb: 1 }}>
        {verifications.map((verification, index) => (
          <Box key={index} sx={{ mb: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                <Select
                  value={verification.id}
                  onChange={(e) => handleVerificationSelect(index, e.target.value)}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) {
                      return <em>Select verification...</em>;
                    }
                    // Find the selected verification to display its label
                    let selectedLabel = '';
                    Object.values(availableActions).forEach(actions => {
                      const action = actions.find(a => a.id === selected);
                      if (action) selectedLabel = action.label;
                    });
                    return selectedLabel;
                  }}
                >
                  {Object.entries(availableActions).map(([category, actions]) => [
                    <MenuItem key={`header-${category}`} disabled sx={{ fontWeight: 'bold' }}>
                      {category.replace(/_/g, ' ').toUpperCase()}
                    </MenuItem>,
                    ...actions.map(action => (
                      <MenuItem key={action.id} value={action.id} sx={{ pl: 3 }}>
                        {action.label}
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>
              
              <TextField
                size="small"
                type="number"
                value={verification.params?.timeout || 10}
                onChange={(e) => updateVerification(index, { 
                  params: { 
                    ...verification.params, 
                    timeout: parseFloat(e.target.value) || 10 
                  }
                })}
                sx={{ width: 80 }}
                inputProps={{ min: 1, max: 60, step: 0.5 }}
              />
              
              <IconButton size="small" onClick={() => removeVerification(index)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            
            {verification.requiresInput && verification.id && (
              <Box sx={{ ml: 1 }}>
                <TextField
                  size="small"
                  label={verification.inputLabel || 'Input Value'}
                  placeholder={verification.inputPlaceholder || 'Enter value...'}
                  value={verification.inputValue || ''}
                  onChange={(e) => updateVerification(index, { inputValue: e.target.value })}
                  fullWidth
                  required
                  error={!verification.inputValue?.trim()}
                />
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}; 