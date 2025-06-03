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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, PlayArrow as PlayIcon, ZoomIn as ZoomInIcon } from '@mui/icons-material';

// Import extracted components
import { ImageComparisonThumbnails } from '../verification/ImageComparisonThumbnails';
import { TextComparisonDisplay } from '../verification/TextComparisonDisplay';
import { ImageComparisonModal } from '../verification/ImageComparisonModal';

// Import extracted hooks
import { useVerificationReferences } from '../../hooks/verification/useVerificationReferences';
import { useImageComparisonModal } from '../../hooks/verification/useImageComparisonModal';

interface NodeVerification {
  id: string;
  label: string;
  command: string;
  controller_type: 'text' | 'image' | 'adb';
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
  sourceImageUrl?: string;
  referenceImageUrl?: string;
  extractedText?: string;
  searchedText?: string;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  // Language detection for text verifications
  detectedLanguage?: string;
  languageConfidence?: number;
  // OCR confidence for text verifications
  ocrConfidence?: number;
  // ADB-specific result data
  search_term?: string;
  wait_time?: number;
  total_matches?: number;
  matches?: Array<{
    element_id: number;
    matched_attribute: string;
    matched_value: string;
    match_reason: string;
    search_term: string;
    case_match: string;
    all_matches: Array<{
      attribute: string;
      value: string;
      reason: string;
    }>;
    full_element: {
      id: number;
      text: string;
      resourceId: string;
      contentDesc: string;
      className: string;
      bounds: string;
      clickable: boolean;
      enabled: boolean;
      tag?: string;
    };
  }>;
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
  model?: string;
  onTest?: () => void;
  testResults?: VerificationTestResult[];
  reloadTrigger?: number; // Trigger to reload references
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
  reloadTrigger = 0,
}) => {
  const [passCondition, setPassCondition] = useState<'all' | 'any'>('all');

  // Use extracted hooks
  const {
    availableReferences,
    referencesLoading,
    getModelReferences
  } = useVerificationReferences(reloadTrigger);

  const {
    imageComparisonDialog,
    openImageComparisonModal,
    closeImageComparisonModal
  } = useImageComparisonModal();

  // Add debounced state management to prevent excessive parent re-renders
  const [localVerifications, setLocalVerifications] = useState(verifications);
  
  // Debounce the parent notification
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onVerificationsChange(localVerifications);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timeoutId);
  }, [localVerifications, onVerificationsChange]);
  
  // Update local state when prop changes (from parent)
  useEffect(() => {
    setLocalVerifications(verifications);
  }, [verifications]);

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
    let controllerType: 'text' | 'image' | 'adb' = 'text';
    
    // Search through all categories to find the action
    for (const [category, actions] of Object.entries(availableActions)) {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        selectedAction = action;
        // Determine controller type from category or action properties
        if (category.toLowerCase().includes('image') || action.command.includes('image')) {
          controllerType = 'image';
        } else if (category.toLowerCase().includes('adb')) {
          controllerType = 'adb';
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
    const selectedRef = getModelReferences(model).find(ref => ref.name === referenceName);
    if (selectedRef) {
      console.log('[@component:NodeVerificationsList] Selected reference details:', {
        name: selectedRef.name,
        model: selectedRef.model,
        type: selectedRef.type,
        path: selectedRef.path,
        full_path: selectedRef.full_path,
        area: selectedRef.area
      });
      
      const baseParams = {
        ...verifications[index].params,
        area: {
          x: selectedRef.area.x,
          y: selectedRef.area.y,
          width: selectedRef.area.width,
          height: selectedRef.area.height
        }
      };

      if (selectedRef.type === 'image') {
        // Image reference parameters
        updateVerification(index, {
          inputValue: selectedRef.name,
          params: {
            ...baseParams,
            reference_image: selectedRef.name,
            reference_path: selectedRef.path,
            full_path: selectedRef.full_path
          }
        });
        console.log('[@component:NodeVerificationsList] Updated verification with image reference:', {
          reference_image: selectedRef.name,
          reference_path: selectedRef.path,
          full_path: selectedRef.full_path
        });
      } else if (selectedRef.type === 'text') {
        // Text reference parameters
        updateVerification(index, {
          inputValue: selectedRef.text || selectedRef.name,
          params: {
            ...baseParams,
            reference_text: selectedRef.text,
            reference_name: selectedRef.name,
            font_size: selectedRef.font_size
          }
        });
        console.log('[@component:NodeVerificationsList] Updated verification with text reference:', {
          reference_text: selectedRef.text,
          reference_name: selectedRef.name,
          font_size: selectedRef.font_size
        });
      }
    }
  };

  const handleImageFilterChange = (index: number, filter: 'none' | 'greyscale' | 'binary') => {
    updateVerification(index, {
      params: {
        ...verifications[index].params,
        image_filter: filter
      }
    });
    console.log('[@component:NodeVerificationsList] Changed image filter to:', filter);
  };

  const handleTextFilterChange = (index: number, filter: 'none' | 'greyscale' | 'binary') => {
    updateVerification(index, {
      params: {
        ...verifications[index].params,
        text_filter: filter
      }
    });
    console.log('[@component:NodeVerificationsList] Changed text filter to:', filter);
  };

  // Check if all verifications have required inputs
  const areVerificationsValid = () => {
    if (verifications.length === 0) return false;
    
    return verifications.every(verification => {
      // Skip verifications that don't require input
      if (!verification.requiresInput || !verification.id) return true;
      
      if (verification.controller_type === 'image') {
        // Image verifications need a reference image
        const hasImagePath = verification.params?.full_path || 
                            verification.params?.reference_path || 
                            verification.inputValue;
        return Boolean(hasImagePath);
      } else if (verification.controller_type === 'text') {
        // Text verifications need text to search for
        const hasText = verification.inputValue && verification.inputValue.trim() !== '';
        return Boolean(hasText);
      } else if (verification.controller_type === 'adb') {
        // ADB verifications need search criteria
        const hasSearchTerm = verification.inputValue && verification.inputValue.trim() !== '';
        return Boolean(hasSearchTerm);
      }
      
      return true;
    });
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

  const modelReferences = getModelReferences(model);

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        {verifications.map((verification, index) => (
          <Box key={index} sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0 , px: 0, mx: 0 }}>
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
                  sx={{ 
                    width: 80,
                    '& .MuiInputBase-input': {
                      padding: '4px 8px',
                      fontSize: '0.8rem'
                    }
                  }}
                  inputProps={{ min: 1, max: 60, step: 0.5 }}
                />
              )}
              
              {verification.id && verification.controller_type === 'adb' && verification.requiresInput && (
                <TextField
                  size="small"
                  label={verification.inputLabel || 'Element Criteria'}
                  placeholder={verification.inputPlaceholder || 'text=Button'}
                  value={verification.inputValue || ''}
                  onChange={(e) => updateVerification(index, { inputValue: e.target.value })}
                  sx={{ 
                    flex: 1,
                    '& .MuiInputBase-input': {
                      padding: '4px 8px',
                      fontSize: '0.8rem'
                    }
                  }}
                />
              )}
              
              {verification.id && (verification.controller_type === 'image' || verification.controller_type === 'text') && (
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
                  sx={{ 
                    width: 80,
                    '& .MuiInputBase-input': {
                      padding: '4px 8px',
                      fontSize: '0.8rem'
                    }
                  }}
                  inputProps={{ min: 0.1, max: 1.0, step: 0.05 }}
                />
              )}
              
              {verification.id && verification.controller_type === 'text' && (
                <TextField
                  size="small"
                  type="number"
                  label="Confidence"
                  value={verification.params?.confidence || 0.8}
                  onChange={(e) => updateVerification(index, { 
                    params: { 
                      ...verification.params, 
                      confidence: parseFloat(e.target.value) || 0.8 
                    }
                  })}
                  sx={{ 
                    width: 80,
                    '& .MuiInputBase-input': {
                      padding: '4px 8px',
                      fontSize: '0.8rem'
                    }
                  }}
                  inputProps={{ min: 0.1, max: 1.0, step: 0.05 }}
                />
              )}
              
              {verification.id && (verification.controller_type === 'image' || verification.controller_type === 'text') && (
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
                    sx={{ 
                      width: 70,
                      '& .MuiInputBase-input': {
                        padding: '4px 8px',
                        fontSize: '0.8rem'
                      }
                    }}
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
                    sx={{ 
                      width: 70,
                      '& .MuiInputBase-input': {
                        padding: '4px 8px',
                        fontSize: '0.8rem'
                      }
                    }}
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
                    sx={{ 
                      width: 80,
                      '& .MuiInputBase-input': {
                        padding: '4px 8px',
                        fontSize: '0.8rem'
                      }
                    }}
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
                    sx={{ 
                      width: 80,
                      '& .MuiInputBase-input': {
                        padding: '4px 8px',
                        fontSize: '0.8rem'
                      }
                    }}
                    inputProps={{ min: 1 }}
                  />
                </>
              )}
            </Box>
            
            {/* Line 3: Reference Image Selector or Manual Input - exclude ADB verifications */}
            {verification.requiresInput && verification.id && verification.controller_type !== 'adb' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* First Row: Reference selection and test result status */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {verification.requiresInput && verification.id && modelReferences.length > 0 ? (
                    <>
                      {/* Reference Dropdown - shows both image and text references */}
                      <FormControl size="small" sx={{ width: 250 }}>
                        <InputLabel>Reference</InputLabel>
                        <Select
                          value={verification.params?.reference_image || verification.params?.reference_name || ''}
                          onChange={(e) => handleReferenceSelect(index, e.target.value)}
                          label="Reference"
                          size="small"
                          sx={{
                            '& .MuiSelect-select': {
                              fontSize: '0.8rem',
                            },
                          }}
                        >
                          <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                            <em>Select reference...</em>
                          </MenuItem>
                          {modelReferences
                            .filter(ref => {
                              // Filter references based on verification type
                              if (verification.controller_type === 'image') {
                                return ref.type === 'image';
                              } else if (verification.controller_type === 'text') {
                                return ref.type === 'text';
                              }
                              return true; // Show all if type is not determined
                            })
                            .map((ref) => (
                            <MenuItem key={ref.name} value={ref.name} sx={{ fontSize: '0.75rem' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {ref.type === 'image' ? '🖼️' : '📝'}
                                <span>{ref.name}</span>
                                {ref.type === 'text' && ref.text && (
                                  <Typography variant="caption" sx={{ 
                                    fontSize: '0.65rem', 
                                    color: 'text.secondary',
                                    ml: 0.5,
                                    maxWidth: 100,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    ({ref.text})
                                  </Typography>
                                )}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </>
                  ) : verification.requiresInput && verification.id ? (
                    /* Manual input for text/image when no references available */
                    <TextField
                      size="small"
                      label={verification.inputLabel || 'Input Value'}
                      placeholder={verification.inputPlaceholder || 'Enter value...'}
                      value={verification.inputValue || ''}
                      onChange={(e) => updateVerification(index, { inputValue: e.target.value })}
                      sx={{ width: 250 }}
                    />
                  ) : null}
                  
                  {/* Image Filter Selection - only for image verifications */}
                  {verification.controller_type === 'image' && verification.id && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 0.5 }}>
                      <RadioGroup
                        value={verification.params?.image_filter || 'none'}
                        onChange={(e) => handleImageFilterChange(index, e.target.value as 'none' | 'greyscale' | 'binary')}
                        sx={{
                          gap: 0,
                          '& .MuiFormControlLabel-root': {
                            margin: 0,
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.65rem',
                              paddingLeft: '2px'
                            },
                            '& .MuiRadio-root': {
                              padding: '2px',
                              '& .MuiSvgIcon-root': {
                                fontSize: '0.9rem'
                              }
                            }
                          }
                        }}
                      >
                        <FormControlLabel value="none" control={<Radio />} label="None" />
                        <FormControlLabel value="greyscale" control={<Radio />} label="Greyscale" />
                        <FormControlLabel value="binary" control={<Radio />} label="Binarization" />
                      </RadioGroup>
                    </Box>
                  )}
                  
                  {/* Text Filter Selection - only for text verifications */}
                  {verification.controller_type === 'text' && verification.id && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 0.5 }}>
                      <RadioGroup
                        value={verification.params?.text_filter || 'none'}
                        onChange={(e) => handleTextFilterChange(index, e.target.value as 'none' | 'greyscale' | 'binary')}
                        sx={{
                          gap: 0,
                          '& .MuiFormControlLabel-root': {
                            margin: 0,
                            '& .MuiFormControlLabel-label': {
                              fontSize: '0.65rem',
                              paddingLeft: '2px'
                            },
                            '& .MuiRadio-root': {
                              padding: '2px',
                              '& .MuiSvgIcon-root': {
                                fontSize: '0.9rem'
                              }
                            }
                          }
                        }}
                      >
                        <FormControlLabel value="none" control={<Radio />} label="None" />
                        <FormControlLabel value="greyscale" control={<Radio />} label="Greyscale" />
                        <FormControlLabel value="binary" control={<Radio />} label="Binarization" />
                      </RadioGroup>
                    </Box>
                  )}
                  
                  {/* Show loading indicator for references */}
                  {verification.controller_type === 'image' && referencesLoading && (
                    <CircularProgress size={16} />
                  )}
                </Box>
              </Box>
            )}
            
            {/* Comparison results section - also moved outside ADB exclusion */}
            {testResults[index] && (
              <Box sx={{ mt: 0 }}>
                {/* Universal Test Result Status Indicator - shows for ALL verification types */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  minWidth: 120,
                  padding: '4px 8px',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: testResults[index].resultType === 'PASS' || testResults[index].success
                    ? 'rgba(76, 175, 80, 0.1)' 
                    : testResults[index].resultType === 'ERROR' 
                      ? 'rgba(255, 152, 0, 0.1)' 
                      : 'rgba(244, 67, 54, 0.1)',
                  border: `2px solid ${
                    testResults[index].resultType === 'PASS' || testResults[index].success
                      ? '#4caf50' 
                      : testResults[index].resultType === 'ERROR' 
                        ? '#ff9800' 
                        : '#f44336'
                  }`
                }}>
                  <Typography sx={{ 
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    color: testResults[index].resultType === 'PASS' || testResults[index].success
                      ? '#4caf50' 
                      : testResults[index].resultType === 'ERROR' 
                        ? '#ff9800' 
                        : '#f44336'
                  }}>
                    {testResults[index].resultType === 'PASS' || testResults[index].success ? 'PASS' : 
                     testResults[index].resultType === 'ERROR' ? 'ERROR' : 'FAIL'}
                  </Typography>
                  
                  {testResults[index].message && (
                    <Typography sx={{ 
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      ml: 1
                    }}>
                      {testResults[index].message}
                    </Typography>
                  )}
                </Box>
                
                {/* Image comparison thumbnails for image verifications */}
                {verification.controller_type === 'image' && 
                 testResults[index].sourceImageUrl && 
                 testResults[index].referenceImageUrl && (
                  <ImageComparisonThumbnails
                    sourceUrl={testResults[index].sourceImageUrl!}
                    referenceUrl={testResults[index].referenceImageUrl!}
                    resultType={testResults[index].resultType || (testResults[index].success ? 'PASS' : 'FAIL')}
                    userThreshold={verification.params?.threshold}
                    matchingResult={testResults[index].threshold}
                    imageFilter={verification.params?.image_filter}
                    onImageClick={() => openImageComparisonModal({
                      sourceUrl: testResults[index].sourceImageUrl!,
                      referenceUrl: testResults[index].referenceImageUrl!,
                      userThreshold: verification.params?.threshold,
                      matchingResult: testResults[index].threshold,
                      resultType: testResults[index].resultType || (testResults[index].success ? 'PASS' : 'FAIL'),
                      imageFilter: verification.params?.image_filter
                    })}
                  />
                )}
                
                {/* Text comparison for text verifications */}
                {verification.controller_type === 'text' && 
                 (testResults[index].searchedText || testResults[index].sourceImageUrl) && (
                  <TextComparisonDisplay
                    searchedText={testResults[index].searchedText || verification.params?.reference_text || verification.inputValue || ''}
                    extractedText={testResults[index].extractedText || ''}
                    sourceUrl={testResults[index].sourceImageUrl}
                    resultType={testResults[index].resultType || (testResults[index].success ? 'PASS' : 'FAIL')}
                    detectedLanguage={testResults[index].detectedLanguage}
                    languageConfidence={testResults[index].languageConfidence}
                    onSourceImageClick={() => {
                      if (testResults[index].sourceImageUrl) {
                        openImageComparisonModal({
                          sourceUrl: testResults[index].sourceImageUrl!,
                          referenceUrl: '', // No reference for text verification
                          resultType: testResults[index].resultType || (testResults[index].success ? 'PASS' : 'FAIL'),
                          userThreshold: undefined,
                          matchingResult: undefined,
                          imageFilter: undefined
                        });
                      }
                    }}
                  />
                )}
                
                {/* ADB element details for ADB verifications */}
                {(verification.controller_type as string) === 'adb' && testResults[index] && (
                  <Box sx={{ 
                    mt: 1, 
                    p: 1, 
                    bgcolor: testResults[index].success 
                      ? 'rgba(76, 175, 80, 0.05)' 
                      : 'rgba(244, 67, 54, 0.05)', 
                    borderRadius: 1, 
                    border: `1px solid ${testResults[index].success ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`
                  }}>
                    {testResults[index].success && testResults[index].matches ? (
                      <>
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 600, 
                          color: '#4caf50',
                          display: 'block',
                          mb: 0.5
                        }}>
                          Found {testResults[index].total_matches} element(s) after {testResults[index].wait_time?.toFixed(1)}s
                        </Typography>
                        
                        {testResults[index].matches?.map((match: any, matchIndex: number) => (
                          <Box key={matchIndex} sx={{ 
                            mb: 1, 
                            p: 0.5, 
                            bgcolor: 'rgba(255, 255, 255, 0.05)', 
                            borderRadius: 0.5,
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <Typography variant="caption" sx={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 600,
                              display: 'block'
                            }}>
                              Element {match.element_id}: {match.match_reason}
                            </Typography>
                            
                            {match.full_element && (
                              <Box sx={{ mt: 0.5, fontSize: '0.6rem', color: 'text.secondary' }}>
                                {match.full_element.text && match.full_element.text !== '<no text>' && (
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                    <strong>Text:</strong> {match.full_element.text}
                                  </Typography>
                                )}
                                {match.full_element.contentDesc && match.full_element.contentDesc !== '<no content-desc>' && (
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                    <strong>Content-Desc:</strong> {match.full_element.contentDesc}
                                  </Typography>
                                )}
                                {match.full_element.resourceId && match.full_element.resourceId !== '<no resource-id>' && (
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                    <strong>Resource-ID:</strong> {match.full_element.resourceId}
                                  </Typography>
                                )}
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                  <strong>Class:</strong> {match.full_element.className || 'N/A'}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                  <strong>Bounds:</strong> {match.full_element.bounds || 'N/A'}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                  <strong>Clickable:</strong> {match.full_element.clickable ? 'Yes' : 'No'} | 
                                  <strong> Enabled:</strong> {match.full_element.enabled ? 'Yes' : 'No'}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 600, 
                        color: '#f44336',
                        display: 'block'
                      }}>
                        {testResults[index].message || testResults[index].error || 'ADB verification failed'}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 1 }}>
        <FormControl size="small" sx={{ minWidth: 100, mr: 1 }}>
          <Select
            value={passCondition}
            onChange={(e) => setPassCondition(e.target.value as 'all' | 'any')}
            size="small"
            sx={{
              fontSize: '0.75rem',
              height: '30px',
              '& .MuiSelect-select': {
                padding: '5px 10px',
              }
            }}
          >
            <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All must pass</MenuItem>
            <MenuItem value="any" sx={{ fontSize: '0.75rem' }}>Any can pass</MenuItem>
          </Select>
        </FormControl>
        
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
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTest();
            }}
            disabled={!areVerificationsValid()}
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
      
      {/* Final Result indicator */}
      {testResults.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 2,
          p: 1,
          borderRadius: 1,
          backgroundColor: passCondition === 'all'
            ? (testResults.every(result => result.success || result.resultType === 'PASS') 
              ? 'rgba(76, 175, 80, 0.1)' 
              : 'rgba(244, 67, 54, 0.1)')
            : (testResults.some(result => result.success || result.resultType === 'PASS')
              ? 'rgba(76, 175, 80, 0.1)' 
              : 'rgba(244, 67, 54, 0.1)'),
          border: `1px solid ${
            passCondition === 'all'
              ? (testResults.every(result => result.success || result.resultType === 'PASS') 
                ? '#4caf50' 
                : '#f44336')
              : (testResults.some(result => result.success || result.resultType === 'PASS')
                ? '#4caf50' 
                : '#f44336')
          }`
        }}>
          <Typography sx={{ 
            fontWeight: 'bold',
            color: passCondition === 'all'
              ? (testResults.every(result => result.success || result.resultType === 'PASS') 
                ? '#4caf50' 
                : '#f44336')
              : (testResults.some(result => result.success || result.resultType === 'PASS')
                ? '#4caf50' 
                : '#f44336')
          }}>
            Final Result: {
              passCondition === 'all'
                ? (testResults.every(result => result.success || result.resultType === 'PASS') ? 'PASS' : 'FAIL')
                : (testResults.some(result => result.success || result.resultType === 'PASS') ? 'PASS' : 'FAIL')
            }
          </Typography>
        </Box>
      )}
      
      {/* Use extracted ImageComparisonModal component */}
      <ImageComparisonModal
        open={imageComparisonDialog.open}
        sourceUrl={imageComparisonDialog.sourceUrl}
        referenceUrl={imageComparisonDialog.referenceUrl}
        userThreshold={imageComparisonDialog.userThreshold}
        matchingResult={imageComparisonDialog.matchingResult}
        resultType={imageComparisonDialog.resultType}
        imageFilter={imageComparisonDialog.imageFilter}
        onClose={closeImageComparisonModal}
      />
    </Box>
  );
}; 