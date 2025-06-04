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
import { VerificationItem } from '../verification/VerificationItem';
import { VerificationImageComparisonDialog } from '../verification/VerificationImageComparisonDialog';

// Import extracted hooks
import { useVerificationReferences } from '../../hooks/verification/useVerificationReferences';

interface NodeVerification {
  id: string;
  label: string;
  command: string;
  controller_type: 'text' | 'image' | 'adb'; // Keep ADB support
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
  // ADB-specific result data - keep ADB support
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

  // Use extracted hooks
  const {
    availableReferences,
    referencesLoading,
    getModelReferences
  } = useVerificationReferences(reloadTrigger);

  // Debug logging for testResults changes - keep this for troubleshooting
  useEffect(() => {
    console.log('[@component:NodeVerificationsList] testResults updated:', testResults);
  }, [testResults]);

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

  const moveVerificationUp = (index: number) => {
    if (index === 0) return; // Can't move first item up
    const newVerifications = [...verifications];
    [newVerifications[index - 1], newVerifications[index]] = [newVerifications[index], newVerifications[index - 1]];
    onVerificationsChange(newVerifications);
  };

  const moveVerificationDown = (index: number) => {
    if (index === verifications.length - 1) return; // Can't move last item down
    const newVerifications = [...verifications];
    [newVerifications[index], newVerifications[index + 1]] = [newVerifications[index + 1], newVerifications[index]];
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

  const handleImageClick = (sourceUrl: string, referenceUrl: string, userThreshold?: number, matchingResult?: number, resultType?: 'PASS' | 'FAIL' | 'ERROR', imageFilter?: 'none' | 'greyscale' | 'binary') => {
    setImageComparisonDialog({
      open: true,
      sourceUrl,
      referenceUrl,
      userThreshold,
      matchingResult,
      resultType,
      imageFilter
    });
  };

  const handleSourceImageClick = (sourceUrl: string, resultType: 'PASS' | 'FAIL' | 'ERROR') => {
    setImageComparisonDialog({
      open: true,
      sourceUrl,
      referenceUrl: '', // No reference for text verification
      resultType,
      userThreshold: undefined,
      matchingResult: undefined,
      imageFilter: undefined
    });
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
          <VerificationItem
            key={index}
            verification={verification}
            index={index}
            availableActions={availableActions}
            modelReferences={modelReferences}
            referencesLoading={referencesLoading}
            testResult={testResults[index]}
            onVerificationSelect={handleVerificationSelect}
            onReferenceSelect={handleReferenceSelect}
            onImageFilterChange={handleImageFilterChange}
            onTextFilterChange={handleTextFilterChange}
            onUpdateVerification={updateVerification}
            onRemoveVerification={removeVerification}
            onImageClick={handleImageClick}
            onSourceImageClick={handleSourceImageClick}
            onMoveUp={moveVerificationUp}
            onMoveDown={moveVerificationDown}
            canMoveUp={index > 0}
            canMoveDown={index < verifications.length - 1}
          />
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
        
        {onTest && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTest?.();
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
      
      {/* Image Comparison Dialog */}
      <VerificationImageComparisonDialog
        open={imageComparisonDialog.open}
        sourceUrl={imageComparisonDialog.sourceUrl}
        referenceUrl={imageComparisonDialog.referenceUrl}
        userThreshold={imageComparisonDialog.userThreshold}
        matchingResult={imageComparisonDialog.matchingResult}
        resultType={imageComparisonDialog.resultType}
        imageFilter={imageComparisonDialog.imageFilter}
        onClose={() => setImageComparisonDialog(prev => ({ ...prev, open: false }))}
      />
    </Box>
  );
}; 