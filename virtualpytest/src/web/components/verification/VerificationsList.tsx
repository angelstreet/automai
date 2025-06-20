import { Add as AddIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

import { useVerificationReferences } from '../../hooks/verification/useVerificationReferences';
import { Host } from '../../types/common/Host_Types';
import {
  Verification,
  Verifications,
  ModelReferences,
} from '../../types/verification/VerificationTypes';

import { VerificationImageComparisonDialog } from './VerificationImageComparisonDialog';
import { VerificationItem } from './VerificationItem';

export interface VerificationsListProps {
  verifications: Verification[];
  availableVerifications: Verifications;
  onVerificationsChange: (verifications: Verification[]) => void;
  loading?: boolean;
  error?: string | null;
  model?: string;
  onTest?: () => void;
  testResults?: Verification[];
  reloadTrigger?: number;
  onReferenceSelected?: (referenceName: string, referenceData: any) => void;
  selectedHost: Host | null;
  modelReferences?: ModelReferences;
  referencesLoading?: boolean;
  showCollapsible?: boolean; // Optional: show collapsible header
  title?: string; // Optional: custom title
}

export const VerificationsList: React.FC<VerificationsListProps> = ({
  verifications,
  availableVerifications = {},
  onVerificationsChange,
  loading = false,
  error = null,
  model,
  onTest,
  testResults = [],
  reloadTrigger = 0,
  onReferenceSelected,
  selectedHost,
  modelReferences: passedModelReferences,
  referencesLoading: passedReferencesLoading,
  showCollapsible = false,
  title = 'Verifications',
}) => {
  const [passCondition, setPassCondition] = useState<'all' | 'any'>('all');
  const [collapsed, setCollapsed] = useState<boolean>(false);
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
    imageFilter: undefined,
  });

  // Use passed references data if available, otherwise use hook as fallback
  const { referencesLoading: hookReferencesLoading, getModelReferences: hookGetModelReferences } =
    useVerificationReferences(reloadTrigger, selectedHost);

  const referencesLoading =
    passedReferencesLoading !== undefined ? passedReferencesLoading : hookReferencesLoading;

  // Memoize model references to prevent multiple calls during render
  const modelReferences = useMemo(() => {
    if (passedModelReferences !== undefined) {
      return passedModelReferences;
    } else {
      return hookGetModelReferences(model);
    }
  }, [passedModelReferences, hookGetModelReferences, model]);

  // Debug logging for testResults changes
  useEffect(() => {
    console.log('[@component:VerificationsList] testResults updated:', testResults);
  }, [testResults]);

  const addVerification = () => {
    const newVerification: Verification = {
      command: '',
      params: { text: '' },
      verification_type: 'text',
    };
    onVerificationsChange([...verifications, newVerification]);
  };

  const removeVerification = (index: number) => {
    const newVerifications = verifications.filter((_, i) => i !== index);
    onVerificationsChange(newVerifications);
  };

  const updateVerification = (index: number, updates: any) => {
    const newVerifications = verifications.map((verification, i) =>
      i === index ? { ...verification, ...updates } : verification,
    );
    onVerificationsChange(newVerifications as Verification[]);
  };

  const moveVerificationUp = (index: number) => {
    if (index === 0) return;
    const newVerifications = [...verifications];
    [newVerifications[index - 1], newVerifications[index]] = [
      newVerifications[index],
      newVerifications[index - 1],
    ];
    onVerificationsChange(newVerifications);
  };

  const moveVerificationDown = (index: number) => {
    if (index === verifications.length - 1) return;
    const newVerifications = [...verifications];
    [newVerifications[index], newVerifications[index + 1]] = [
      newVerifications[index + 1],
      newVerifications[index],
    ];
    onVerificationsChange(newVerifications);
  };

  const handleVerificationSelect = (index: number, command: string) => {
    // Find the selected verification from available verifications
    let selectedVerification: any = undefined;
    let verificationType: 'text' | 'image' | 'adb' = 'text';

    // Search through all controller types to find the verification
    for (const [category, verifications] of Object.entries(availableVerifications)) {
      if (!Array.isArray(verifications)) continue;

      const verification = verifications.find((v) => v.command === command);
      if (verification) {
        selectedVerification = verification;
        // Determine verification type from category name
        if (category.toLowerCase().includes('image')) {
          verificationType = 'image';
        } else if (category.toLowerCase().includes('adb')) {
          verificationType = 'adb';
        } else {
          verificationType = 'text';
        }
        break;
      }
    }

    if (selectedVerification) {
      updateVerification(index, {
        command: selectedVerification.command,
        verification_type: verificationType,
        params: { ...selectedVerification.params },
      });
    }
  };

  const handleReferenceSelect = (index: number, referenceName: string) => {
    console.log('[@component:VerificationsList] Reference selected:', {
      index,
      referenceName,
      model,
    });

    const selectedRef = modelReferences[referenceName];

    if (selectedRef) {
      console.log('[@component:VerificationsList] Selected reference details:', {
        name: referenceName,
        model: model,
        type: selectedRef.type,
        url: selectedRef.url,
        area: selectedRef.area,
      });

      const baseParams = {
        ...verifications[index].params,
        area: {
          x: selectedRef.area.x,
          y: selectedRef.area.y,
          width: selectedRef.area.width,
          height: selectedRef.area.height,
        },
      };

      if (selectedRef.type === 'image') {
        // Image reference parameters - store directly in params
        updateVerification(index, {
          params: {
            ...baseParams,
            image_path: referenceName,
          },
        });
        console.log('[@component:VerificationsList] Updated verification with image reference:', {
          reference_image: referenceName,
          reference_url: selectedRef.url,
        });
      } else if (selectedRef.type === 'text') {
        // Text reference parameters - store directly in params
        updateVerification(index, {
          params: {
            ...baseParams,
            text: selectedRef.text || '',
          },
        });
        console.log('[@component:VerificationsList] Updated verification with text reference:', {
          reference_text: selectedRef.text,
          reference_name: referenceName,
          font_size: selectedRef.font_size,
        });
      }

      if (onReferenceSelected) {
        onReferenceSelected(referenceName, selectedRef);
      }
    }
  };

  const handleImageFilterChange = (index: number, filter: 'none' | 'greyscale' | 'binary') => {
    updateVerification(index, {
      params: {
        ...verifications[index].params,
        image_filter: filter,
      },
    });
    console.log('[@component:VerificationsList] Changed image filter to:', filter);
  };

  const handleTextFilterChange = (index: number, filter: 'none' | 'greyscale' | 'binary') => {
    updateVerification(index, {
      params: {
        ...verifications[index].params,
        text_filter: filter,
      },
    });
    console.log('[@component:VerificationsList] Changed text filter to:', filter);
  };

  const handleImageClick = (
    sourceUrl: string,
    referenceUrl: string,
    userThreshold?: number,
    matchingResult?: number,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => {
    setImageComparisonDialog({
      open: true,
      sourceUrl,
      referenceUrl,
      userThreshold,
      matchingResult,
      resultType,
      imageFilter,
    });
  };

  const handleSourceImageClick = (sourceUrl: string, resultType: 'PASS' | 'FAIL' | 'ERROR') => {
    setImageComparisonDialog({
      open: true,
      sourceUrl,
      referenceUrl: '',
      resultType,
      userThreshold: undefined,
      matchingResult: undefined,
      imageFilter: undefined,
    });
  };

  // Check if all verifications have required inputs
  const areVerificationsValid = () => {
    if (verifications.length === 0) return false;

    return verifications.every((verification) => {
      // Skip verifications that don't have a command (not configured yet)
      if (!verification.command) return true;

      if (verification.verification_type === 'image') {
        // Image verifications need a reference image
        const hasImagePath = verification.params?.image_path;
        return Boolean(hasImagePath);
      } else if (verification.verification_type === 'text') {
        // Text verifications need text to search for
        const hasText =
          verification.params?.text &&
          typeof verification.params.text === 'string' &&
          verification.params.text.trim() !== '';
        return Boolean(hasText);
      } else if (verification.verification_type === 'adb') {
        // ADB verifications need search criteria
        const hasSearchTerm =
          verification.params?.search_term && verification.params.search_term.trim() !== '';
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

  const content = (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
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
            availableVerifications={availableVerifications}
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
              },
            }}
          >
            <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>
              All must pass
            </MenuItem>
            <MenuItem value="any" sx={{ fontSize: '0.75rem' }}>
              Any can pass
            </MenuItem>
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
              },
            }}
          >
            Test
          </Button>
        )}
      </Box>

      {/* Final Result indicator */}
      {testResults.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 2,
            p: 1,
            borderRadius: 1,
            backgroundColor:
              passCondition === 'all'
                ? testResults.every((result) => result.success || result.resultType === 'PASS')
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(244, 67, 54, 0.1)'
                : testResults.some((result) => result.success || result.resultType === 'PASS')
                  ? 'rgba(76, 175, 80, 0.1)'
                  : 'rgba(244, 67, 54, 0.1)',
            border: `1px solid ${
              passCondition === 'all'
                ? testResults.every((result) => result.success || result.resultType === 'PASS')
                  ? '#4caf50'
                  : '#f44336'
                : testResults.some((result) => result.success || result.resultType === 'PASS')
                  ? '#4caf50'
                  : '#f44336'
            }`,
          }}
        >
          <Typography
            sx={{
              fontWeight: 'bold',
              color:
                passCondition === 'all'
                  ? testResults.every((result) => result.success || result.resultType === 'PASS')
                    ? '#4caf50'
                    : '#f44336'
                  : testResults.some((result) => result.success || result.resultType === 'PASS')
                    ? '#4caf50'
                    : '#f44336',
            }}
          >
            Final Result:{' '}
            {passCondition === 'all'
              ? testResults.every((result) => result.success || result.resultType === 'PASS')
                ? 'PASS'
                : 'FAIL'
              : testResults.some((result) => result.success || result.resultType === 'PASS')
                ? 'PASS'
                : 'FAIL'}
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
        onClose={() => setImageComparisonDialog((prev) => ({ ...prev, open: false }))}
      />
    </>
  );

  // If collapsible is requested, wrap in collapsible container
  if (showCollapsible) {
    return (
      <Box>
        {/* Collapsible toggle button and title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Button
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            sx={{ p: 0.25, minWidth: 'auto' }}
          >
            {collapsed ? '▶' : '▼'}
          </Button>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>

        {/* Collapsible content */}
        {!collapsed && (
          <Box
            sx={{
              '& .MuiTypography-subtitle2': {
                fontSize: '0.75rem',
              },
              '& .MuiButton-root': {
                fontSize: '0.7rem',
              },
              '& .MuiTextField-root': {
                '& .MuiInputLabel-root': {
                  fontSize: '0.75rem',
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.75rem',
                },
              },
              '& .MuiSelect-root': {
                fontSize: '0.75rem',
              },
              '& .MuiFormControl-root': {
                '& .MuiInputLabel-root': {
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            {content}
          </Box>
        )}
      </Box>
    );
  }

  // Otherwise return content directly
  return <Box>{content}</Box>;
};
