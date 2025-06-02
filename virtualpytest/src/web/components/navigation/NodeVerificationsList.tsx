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
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, PlayArrow as PlayIcon } from '@mui/icons-material';

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

interface VerificationTestResult {
  success: boolean;
  message?: string;
  error?: string;
  threshold?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
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

interface ReferenceImage {
  name: string;
  model: string;
  path: string;
  full_path: string;
  created_at: string;
  type: string;
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface NodeVerificationsListProps {
  verifications: NodeVerification[];
  availableActions: VerificationActions;
  onVerificationsChange: (verifications: NodeVerification[]) => void;
  loading?: boolean;
  error?: string | null;
  model?: string;
  onTest?: () => void;
  testResults?: VerificationTestResult[];
}

export const NodeVerificationsList: React.FC<NodeVerificationsListProps> = ({
  verifications,
  availableActions = {}, // Default to empty object
  onVerificationsChange,
  loading = false,
  error = null,
  model,
  onTest,
  testResults = [],
}) => {
  const [availableReferences, setAvailableReferences] = useState<ReferenceImage[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);

  // Fetch available reference images on component mount
  useEffect(() => {
    fetchAvailableReferences();
  }, []);

  const fetchAvailableReferences = async () => {
    setReferencesLoading(true);
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/reference/list');
      const result = await response.json();
      
      if (result.success) {
        setAvailableReferences(result.references || []);
        console.log('[@component:NodeVerificationsList] Loaded references:', result.references);
      } else {
        console.error('[@component:NodeVerificationsList] Failed to load references:', result.error);
      }
    } catch (error) {
      console.error('[@component:NodeVerificationsList] Error fetching references:', error);
    } finally {
      setReferencesLoading(false);
    }
  };

  // Filter references by current model
  const getModelReferences = () => {
    if (!model) return availableReferences;
    return availableReferences.filter(ref => ref.model === model);
  };

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
    
    // Search through all categories to find the action
    for (const [category, actions] of Object.entries(availableActions)) {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        selectedAction = action;
        // Determine controller type from category or action properties
        if (category.toLowerCase().includes('image') || action.command.includes('image')) {
          controllerType = 'image';
        } else {
          controllerType = 'text';
        }
        break;
      }
    }

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
        inputValue: ''
      });
    }
  };

  const handleReferenceSelect = (index: number, referenceName: string) => {
    const selectedRef = getModelReferences().find(ref => ref.name === referenceName);
    if (selectedRef) {
      updateVerification(index, {
        inputValue: selectedRef.name,
        params: {
          ...verifications[index].params,
          reference_image: selectedRef.name,
          reference_path: selectedRef.path,
          full_path: selectedRef.full_path,
          area: {
            x: selectedRef.area.x,
            y: selectedRef.area.y,
            width: selectedRef.area.width,
            height: selectedRef.area.height
          }
        }
      });
      console.log('[@component:NodeVerificationsList] Selected reference:', selectedRef.name, 'with full_path:', selectedRef.full_path, 'and area:', selectedRef.area);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
        <CircularProgress size={20} />
        <Typography>Running verifications...</Typography>
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

  const modelReferences = getModelReferences();

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        {verifications.map((verification, index) => (
          <Box key={index} sx={{ mb: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {/* Line 1: Verification dropdown */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                <Select
                  value={verification.id}
                  onChange={(e) => handleVerificationSelect(index, e.target.value)}
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
                      return <em style={{ fontSize: '0.8rem' }}>Select verification...</em>;
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
                    <MenuItem key={`header-${category}`} disabled sx={{ fontWeight: 'bold', fontSize: '0.65rem', minHeight: '24px' }}>
                      {category.replace(/_/g, ' ').toUpperCase()}
                    </MenuItem>,
                    ...actions.map(action => (
                      <MenuItem key={action.id} value={action.id} sx={{ pl: 3, fontSize: '0.7rem', minHeight: '28px' }}>
                        {action.label}
                      </MenuItem>
                    ))
                  ])}
                </Select>
              </FormControl>
              
              <IconButton size="small" onClick={() => removeVerification(index)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            
            {/* Line 2: Timeout, threshold, and area controls */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 1 }}>
              {verification.id && (
                <TextField
                  size="small"
                  type="number"
                  label="Timeout"
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
              )}
              
              {verification.controller_type === 'image' && (
                <TextField
                  size="small"
                  type="number"
                  label="Threshold"
                  value={verification.params?.threshold || 0.8}
                  onChange={(e) => updateVerification(index, { 
                    params: { 
                      ...verification.params, 
                      threshold: parseFloat(e.target.value) || 0.8 
                    }
                  })}
                  sx={{ width: 80 }}
                  inputProps={{ min: 0.1, max: 1.0, step: 0.05 }}
                />
              )}
              
              {verification.controller_type === 'image' && (
                <>
                  <TextField
                    size="small"
                    type="number"
                    label="X"
                    value={verification.params?.area?.x || 0}
                    onChange={(e) => updateVerification(index, { 
                      params: { 
                        ...verification.params, 
                        area: { 
                          ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                          x: parseInt(e.target.value) || 0 
                        }
                      }
                    })}
                    sx={{ width: 70 }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Y"
                    value={verification.params?.area?.y || 0}
                    onChange={(e) => updateVerification(index, { 
                      params: { 
                        ...verification.params, 
                        area: { 
                          ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                          y: parseInt(e.target.value) || 0 
                        }
                      }
                    })}
                    sx={{ width: 70 }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Width"
                    value={verification.params?.area?.width || 100}
                    onChange={(e) => updateVerification(index, { 
                      params: { 
                        ...verification.params, 
                        area: { 
                          ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                          width: parseInt(e.target.value) || 100 
                        }
                      }
                    })}
                    sx={{ width: 80 }}
                    inputProps={{ min: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Height"
                    value={verification.params?.area?.height || 100}
                    onChange={(e) => updateVerification(index, { 
                      params: { 
                        ...verification.params, 
                        area: { 
                          ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                          height: parseInt(e.target.value) || 100 
                        }
                      }
                    })}
                    sx={{ width: 80 }}
                    inputProps={{ min: 1 }}
                  />
                </>
              )}
            </Box>
            
            {/* Line 3: Reference Image Selector or Manual Input */}
            {verification.requiresInput && verification.id && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {verification.controller_type === 'image' && modelReferences.length > 0 ? (
                  <>
                    {/* Reference Image Dropdown */}
                    <FormControl size="small" sx={{ width: 200 }}>
                      <InputLabel>Reference Image</InputLabel>
                      <Select
                        value={verification.params?.reference_image || ''}
                        onChange={(e) => handleReferenceSelect(index, e.target.value)}
                        label="Reference Image"
                        size="small"
                        sx={{
                          '& .MuiSelect-select': {
                            fontSize: '0.75rem',
                          },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                          <em>Select reference image...</em>
                        </MenuItem>
                        {modelReferences.map((ref) => (
                          <MenuItem key={ref.name} value={ref.name} sx={{ fontSize: '0.75rem' }}>
                            {ref.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                ) : (
                  /* Fallback to manual input */
                  <TextField
                    size="small"
                    label={verification.inputLabel || 'Input Value'}
                    placeholder={verification.inputPlaceholder || 'Enter value...'}
                    value={verification.inputValue || ''}
                    onChange={(e) => updateVerification(index, { inputValue: e.target.value })}
                    sx={{ width: 200 }}
                  />
                )}
                
                {/* Test Result Status Indicator */}
                {testResults[index] && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    minWidth: 120,
                    padding: '4px 8px',
                    borderRadius: 1,
                    backgroundColor: testResults[index].resultType === 'PASS' 
                      ? 'rgba(76, 175, 80, 0.1)' 
                      : testResults[index].resultType === 'ERROR' 
                        ? 'rgba(255, 152, 0, 0.1)' 
                        : 'rgba(244, 67, 54, 0.1)',
                    border: `1px solid ${
                      testResults[index].resultType === 'PASS' 
                        ? '#4caf50' 
                        : testResults[index].resultType === 'ERROR' 
                          ? '#ff9800' 
                          : '#f44336'
                    }`
                  }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: testResults[index].resultType === 'PASS' 
                        ? '#4caf50' 
                        : testResults[index].resultType === 'ERROR' 
                          ? '#ff9800' 
                          : '#f44336'
                    }} />
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.7rem',
                      color: testResults[index].resultType === 'PASS' 
                        ? '#4caf50' 
                        : testResults[index].resultType === 'ERROR' 
                          ? '#ff9800' 
                          : '#f44336',
                      fontWeight: 600
                    }}>
                      {testResults[index].resultType || (testResults[index].success ? 'PASS' : 'FAIL')}
                    </Typography>
                    {verification.controller_type === 'image' && testResults[index].threshold !== undefined && (
                      <Typography variant="caption" sx={{ 
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.7)',
                        ml: 0.5
                      }}>
                        {(testResults[index].threshold! * 100).toFixed(1)}%
                      </Typography>
                    )}
                    {/* Show error message for ERROR type results */}
                    {testResults[index].resultType === 'ERROR' && (testResults[index].message || testResults[index].error) && (
                      <Typography variant="caption" sx={{ 
                        fontSize: '0.6rem',
                        color: 'rgba(255,255,255,0.8)',
                        ml: 0.5,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={testResults[index].message || testResults[index].error}>
                        {testResults[index].message || testResults[index].error}
                      </Typography>
                    )}
                  </Box>
                )}
                
                {/* Show loading indicator for references */}
                {verification.controller_type === 'image' && referencesLoading && (
                  <CircularProgress size={16} />
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addVerification}
          sx={{ minWidth: 'auto' }}
        >
          Add
        </Button>
        {onTest && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={onTest}
            disabled={verifications.length === 0}
            sx={{
              minWidth: 'auto',
              ml: 1,
              borderColor: '#444',
              color: 'inherit',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#666',
              },
              '&:disabled': {
                borderColor: '#333',
                color: 'rgba(255,255,255,0.3)',
              }
            }}
          >
            Test
          </Button>
        )}
      </Box>
    </Box>
  );
}; 