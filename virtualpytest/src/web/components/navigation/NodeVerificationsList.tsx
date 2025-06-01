import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  availableActions,
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1">
          Verifications ({verifications.length})
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addVerification}
        >
          Add Verification
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {verifications.map((verification, index) => (
          <Card key={index} variant="outlined">
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Header with remove button */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">
                    Verification {index + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => removeVerification(index)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>

                {/* Verification selection */}
                <FormControl fullWidth size="small">
                  <InputLabel>Verification Type</InputLabel>
                  <Select
                    value={verification.id}
                    label="Verification Type"
                    onChange={(e) => handleVerificationSelect(index, e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select verification...</em>
                    </MenuItem>
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

                {/* Show verification details if selected */}
                {verification.id && (
                  <>
                    {/* Input field for verifications that require input */}
                    {verification.requiresInput && (
                      <TextField
                        label={verification.inputLabel || 'Input Value'}
                        placeholder={verification.inputPlaceholder || 'Enter value...'}
                        value={verification.inputValue || ''}
                        onChange={(e) => updateVerification(index, { inputValue: e.target.value })}
                        fullWidth
                        size="small"
                        required
                        error={!verification.inputValue?.trim()}
                      />
                    )}

                    {/* Timeout setting */}
                    <TextField
                      label="Timeout (seconds)"
                      type="number"
                      value={verification.params?.timeout || 10}
                      onChange={(e) => updateVerification(index, { 
                        params: { 
                          ...verification.params, 
                          timeout: parseFloat(e.target.value) || 10 
                        }
                      })}
                      size="small"
                      sx={{ width: 150 }}
                      inputProps={{ min: 1, max: 60, step: 0.5 }}
                    />
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}; 