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
  type: 'image' | 'text';
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Text reference specific fields
  text?: string;
  font_size?: number;
  confidence?: number;
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
  const [availableReferences, setAvailableReferences] = useState<ReferenceImage[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [passCondition, setPassCondition] = useState<'all' | 'any'>('all');
  const [imageComparisonDialog, setImageComparisonDialog] = useState<{
    open: boolean;
    sourceUrl: string;
    referenceUrl: string;
    userThreshold?: number;
    matchingResult?: number;
    resultType?: 'PASS' | 'FAIL' | 'ERROR';
    imageFilter?: 'none' | 'greyscale' | 'binary';
  }>({
    open: false,
    sourceUrl: '',
    referenceUrl: '',
    userThreshold: undefined,
    matchingResult: undefined,
    resultType: undefined,
    imageFilter: undefined
  });

  // Fetch available reference images on component mount
  useEffect(() => {
    fetchAvailableReferences();
  }, []);

  // Reload references when reloadTrigger changes
  useEffect(() => {
    if (reloadTrigger > 0) {
      console.log('[@component:NodeVerificationsList] Reloading references due to trigger:', reloadTrigger);
      fetchAvailableReferences();
    }
  }, [reloadTrigger]);

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

  // Component for displaying image comparison thumbnails
  const ImageComparisonThumbnails: React.FC<{
    sourceUrl: string;
    referenceUrl: string;
    resultType: 'PASS' | 'FAIL' | 'ERROR';
    userThreshold?: number;
    matchingResult?: number;
    imageFilter?: 'none' | 'greyscale' | 'binary';
  }> = ({ sourceUrl, referenceUrl, resultType, userThreshold, matchingResult, imageFilter }) => {
    const handleImageClick = () => {
      setImageComparisonDialog({
        open: true,
        sourceUrl: `http://localhost:5009${sourceUrl}`,
        referenceUrl: `http://localhost:5009${referenceUrl}`,
        userThreshold,
        matchingResult,
        resultType,
        imageFilter
      });
    };

    return (
      <Box sx={{ 
        display: 'flex', 
        gap: 0.5, 
        alignItems: 'center',
        padding: '4px',
        border: `1px solid ${
          resultType === 'PASS' ? '#4caf50' : resultType === 'ERROR' ? '#ff9800' : '#f44336'
        }`,
        borderRadius: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        width: '100%'
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
            Source
          </Typography>
          <img
            src={`http://localhost:5009${sourceUrl}`}
            alt="Source"
            style={{
              width: '100%',
              maxWidth: '200px',
              height: '150px',
              objectFit: 'contain',
              border: '1px solid #666',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={handleImageClick}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
            Reference
          </Typography>
          <img
            src={`http://localhost:5009${referenceUrl}`}
            alt="Reference"
            style={{
              width: '100%',
              maxWidth: '200px',
              height: '150px',
              objectFit: 'contain',
              border: '1px solid #666',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={handleImageClick}
          />
        </Box>
      </Box>
    );
  };

  // Component for displaying text comparison
  const TextComparisonDisplay: React.FC<{
    searchedText: string;
    extractedText: string;
    sourceUrl?: string;
    resultType: 'PASS' | 'FAIL' | 'ERROR';
    detectedLanguage?: string;
    languageConfidence?: number;
  }> = ({ searchedText, extractedText, sourceUrl, resultType, detectedLanguage, languageConfidence }) => {
    
    const handleSourceImageClick = () => {
      if (sourceUrl) {
        setImageComparisonDialog({
          open: true,
          sourceUrl: `http://localhost:5009${sourceUrl}`,
          referenceUrl: '', // No reference for text verification
          resultType,
          userThreshold: undefined,
          matchingResult: undefined,
          imageFilter: undefined
        });
      }
    };

    // Map language codes to readable names
    const getLanguageName = (langCode: string) => {
      const languageMap: { [key: string]: string } = {
        'eng': 'English',
        'fra': 'French',
        'ita': 'Italian',
        'deu': 'German',
        'spa': 'Spanish',
        'por': 'Portuguese',
        'rus': 'Russian',
        'jpn': 'Japanese',
        'chi': 'Chinese',
        'kor': 'Korean'
      };
      return languageMap[langCode] || langCode.toUpperCase();
    };
    
    return (
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        alignItems: 'flex-start',
        padding: '8px',
        border: `1px solid ${
          resultType === 'PASS' ? '#4caf50' : resultType === 'ERROR' ? '#ff9800' : '#f44336'
        }`,
        borderRadius: 1,
        backgroundColor: 'rgba(0,0,0,0.1)'
      }}>
        {sourceUrl && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
              Source
            </Typography>
            <img
              src={`http://localhost:5009${sourceUrl}`}
              alt="Source"
              onClick={handleSourceImageClick}
              style={{
                width: '100px',
                height: '100px',
                objectFit: 'contain',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title="Click to view full size"
            />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
              Searched:
            </Typography>
            <Typography variant="caption" sx={{ 
              fontSize: '0.7rem', 
              display: 'block',
              color: '#90caf9',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              "{searchedText}"
            </Typography>
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
              Found:
            </Typography>
            <Typography variant="caption" sx={{ 
              fontSize: '0.7rem', 
              display: 'block',
              color: resultType === 'PASS' ? '#4caf50' : '#f44336',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              "{extractedText || 'No text found'}"
            </Typography>
          </Box>
          {/* Language detection information */}
          {detectedLanguage && languageConfidence !== undefined && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ 
                fontSize: '0.6rem', 
                color: '#ffb74d',
                fontWeight: 500
              }}>
                {getLanguageName(detectedLanguage)}
              </Typography>
              <Typography variant="caption" sx={{ 
                fontSize: '0.6rem', 
                color: '#81c784',
                fontWeight: 500
              }}>
                {(languageConfidence * 100).toFixed(1)}% confidence
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
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
      }
      
      return true;
    });
  };

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
              
              {verification.controller_type === 'text' && (
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
              
              {(verification.controller_type === 'image' || verification.controller_type === 'text') && (
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
            
            {/* Line 3: Reference Image Selector or Manual Input */}
            {verification.requiresInput && verification.id && (
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
                    /* Fallback to manual input when no references available */
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
                      {/* Show threshold for image verifications */}
                      {verification.controller_type === 'image' && testResults[index].threshold !== undefined && (
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.65rem',
                          color: 'rgba(255,255,255,0.7)',
                          ml: 0.5
                        }}>
                          {(testResults[index].threshold! * 100).toFixed(1)}%
                        </Typography>
                      )}
                      {/* Show OCR confidence for text verifications */}
                      {verification.controller_type === 'text' && testResults[index].ocrConfidence !== undefined && (
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.65rem',
                          color: 'rgba(255,255,255,0.7)',
                          ml: 0.5
                        }}>
                          {testResults[index].ocrConfidence!.toFixed(1)}%
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
                
                {/* Second Row: Comparison images/text below */}
                {testResults[index] && (
                  <Box sx={{ mt: 0 }}>
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
                      />
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <FormControl size="small" sx={{ minWidth: 130 }}>
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
        
        <Box sx={{ display: 'flex' }}>
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
      
      {/* Scaled Image Modal */}
      <Dialog
        open={imageComparisonDialog.open}
        onClose={() => setImageComparisonDialog(prev => ({ ...prev, open: false }))}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2E2E2E',
            color: '#ffffff',
            maxWidth: '95vw',
            maxHeight: '95vh'
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem', textAlign: 'center' }}>
          {imageComparisonDialog.userThreshold !== undefined || imageComparisonDialog.matchingResult !== undefined ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {imageComparisonDialog.userThreshold !== undefined && (
                  <Typography component="span" sx={{ fontSize: '0.9rem' }}>
                    Threshold: {(imageComparisonDialog.userThreshold * 100).toFixed(1)}%
                  </Typography>
                )}
                {imageComparisonDialog.matchingResult !== undefined && (
                  <Typography component="span" sx={{ 
                    fontSize: '0.9rem',
                    color: imageComparisonDialog.resultType === 'PASS' ? '#4caf50' : '#f44336',
                    fontWeight: 600
                  }}>
                    Matching: {(imageComparisonDialog.matchingResult * 100).toFixed(1)}%
                  </Typography>
                )}
                {imageComparisonDialog.resultType && (
                  <Typography component="span" sx={{ 
                    color: imageComparisonDialog.resultType === 'PASS' ? '#4caf50' : 
                          imageComparisonDialog.resultType === 'ERROR' ? '#ff9800' : '#f44336',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    [{imageComparisonDialog.resultType}]
                  </Typography>
                )}
              </Box>
              {imageComparisonDialog.imageFilter && imageComparisonDialog.imageFilter !== 'none' && (
                <Typography component="span" sx={{ 
                  color: '#90caf9',
                  fontWeight: 500,
                  fontSize: '0.8rem'
                }}>
                  Filter: {imageComparisonDialog.imageFilter}
                </Typography>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography component="span">
                {imageComparisonDialog.referenceUrl ? 'Image Comparison' : 'Text Verification'}
              </Typography>
              {imageComparisonDialog.resultType && (
                <Typography component="span" sx={{ 
                  color: imageComparisonDialog.resultType === 'PASS' ? '#4caf50' : 
                        imageComparisonDialog.resultType === 'ERROR' ? '#ff9800' : '#f44336',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  [{imageComparisonDialog.resultType}]
                </Typography>
              )}
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 2, 
            alignItems: 'flex-start',
            justifyContent: 'center',
            width: '100%'
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              {imageComparisonDialog.referenceUrl && (
                <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1, color: '#ffffff' }}>
                  Source
                </Typography>
              )}
              <img
                src={imageComparisonDialog.sourceUrl}
                alt="Source Image"
                style={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  border: '2px solid #666',
                  borderRadius: '8px'
                }}
              />
            </Box>
            {imageComparisonDialog.referenceUrl && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1, color: '#ffffff' }}>
                  Reference
                </Typography>
                <img
                  src={imageComparisonDialog.referenceUrl}
                  alt="Reference Image"
                  style={{
                    width: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    border: '2px solid #666',
                    borderRadius: '8px'
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button 
            onClick={() => setImageComparisonDialog(prev => ({ ...prev, open: false }))}
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#666',
              color: '#ffffff',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#888',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 