import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Camera as CameraIcon } from '@mui/icons-material';

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

interface VerificationEditorProps {
  isVisible: boolean;
  isScreenshotMode: boolean;
  isCaptureActive: boolean;
  sx?: any;
}

export const VerificationEditor: React.FC<VerificationEditorProps> = ({
  isVisible,
  isScreenshotMode,
  isCaptureActive,
  sx = {},
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [selectedVerification, setSelectedVerification] = useState<VerificationAction | null>(null);
  const [parameters, setParameters] = useState<any>({});
  const [referenceName, setReferenceName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchVerificationActions();
    }
  }, [isVisible]);

  const fetchVerificationActions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/verification/actions');
      const result = await response.json();
      
      if (result.success) {
        setVerificationActions(result.verifications);
      }
    } catch (error) {
      console.error('Error fetching verification actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSelect = (actionId: string) => {
    let selectedAction: VerificationAction | null = null;
    
    Object.values(verificationActions).forEach(actions => {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        selectedAction = action;
      }
    });

    if (selectedAction) {
      setSelectedVerification(selectedAction);
      setParameters({
        timeout: 10,
        threshold: 0.8,
        area: { x: 0, y: 0, width: 100, height: 100 },
        ...selectedAction.params
      });
    }
  };

  const updateParameter = (key: string, value: any) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const updateAreaParameter = (key: string, value: number) => {
    setParameters(prev => ({
      ...prev,
      area: { ...prev.area, [key]: value }
    }));
  };

  const isValidName = (name: string) => {
    return /^[a-z0-9_-]+$/.test(name);
  };

  const canSave = selectedVerification && referenceName && isValidName(referenceName);

  if (!isVisible) return null;

  return (
    <Box sx={{ 
      width: 400, 
      height: '100%', 
      p: 2, 
      border: '1px solid #ddd', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      ...sx 
    }}>
      <Typography variant="h6">Verification Editor</Typography>
      
      {/* Row 1: Thumbnail + Capture */}
      <Box>
        <Box sx={{ 
          width: '100%', 
          height: 150, 
          border: '2px dashed #ccc', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            No image captured
          </Typography>
        </Box>
        <Button 
          size="small" 
          startIcon={<CameraIcon />}
          variant="outlined"
          fullWidth
          disabled={!selectedVerification}
        >
          Capture
        </Button>
      </Box>

      {/* Row 2: Dynamic Parameters */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0 }}>Parameters</Typography>
        {selectedVerification && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              size="small"
              type="number"
              label="Timeout"
              value={parameters.timeout || 10}
              onChange={(e) => updateParameter('timeout', parseFloat(e.target.value) || 10)}
              inputProps={{ min: 1, max: 60, step: 0.5 }}
            />
            
            {selectedVerification.command.includes('image') && (
              <>
                <TextField
                  size="small"
                  type="number"
                  label="Threshold"
                  value={parameters.threshold || 0.8}
                  onChange={(e) => updateParameter('threshold', parseFloat(e.target.value) || 0.8)}
                  inputProps={{ min: 0.1, max: 1.0, step: 0.05 }}
                />
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    type="number"
                    label="X"
                    value={parameters.area?.x || 0}
                    onChange={(e) => updateAreaParameter('x', parseInt(e.target.value) || 0)}
                    sx={{ width: '25%' }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Y"
                    value={parameters.area?.y || 0}
                    onChange={(e) => updateAreaParameter('y', parseInt(e.target.value) || 0)}
                    sx={{ width: '25%' }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Width"
                    value={parameters.area?.width || 100}
                    onChange={(e) => updateAreaParameter('width', parseInt(e.target.value) || 100)}
                    sx={{ width: '25%' }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Height"
                    value={parameters.area?.height || 100}
                    onChange={(e) => updateAreaParameter('height', parseInt(e.target.value) || 100)}
                    sx={{ width: '25%' }}
                  />
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Row 3: Verification Selection */}
      <Box>
        <FormControl fullWidth size="small">
          <InputLabel>Verification Type</InputLabel>
          <Select
            value={selectedVerification?.id || ''}
            label="Verification Type"
            onChange={(e) => handleVerificationSelect(e.target.value)}
            disabled={loading}
          >
            {Object.entries(verificationActions).map(([category, actions]) => [
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
      </Box>

      {/* Row 4: Reference Name */}
      <Box>
        <TextField
          fullWidth
          size="small"
          label="Reference Name"
          value={referenceName}
          onChange={(e) => setReferenceName(e.target.value.toLowerCase())}
          placeholder="my_button"
          error={referenceName && !isValidName(referenceName)}
          helperText={referenceName && !isValidName(referenceName) ? 'Only lowercase letters, numbers, - and _' : ''}
        />
      </Box>

      {/* Row 5: Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
        <Button 
          variant="outlined" 
          size="small"
          disabled={!selectedVerification}
        >
          Test
        </Button>
        <Button 
          variant="contained" 
          size="small"
          disabled={!canSave}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default VerificationEditor; 