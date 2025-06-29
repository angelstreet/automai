import { Add as AddIcon, PlayArrow as PlayIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Host } from '../../types/common/Host_Types';
import {
  Verification,
  Verifications,
  ModelReferences,
} from '../../types/verification/Verification_Types';

import { VerificationImageComparisonDialog } from './VerificationImageComparisonDialog';
import { VerificationItem } from './VerificationItem';
import { VerificationTextComparisonDialog } from './VerificationTextComparisonDialog';

export interface VerificationsListProps {
  verifications: Verification[];
  availableVerifications: Verifications;
  onVerificationsChange: (verifications: Verification[]) => void;
  loading: boolean;
  model: string;
  onTest: () => void;
  testResults: Verification[];
  onReferenceSelected: (referenceName: string, referenceData: any) => void;
  selectedHost: Host;
  modelReferences: ModelReferences;
  referencesLoading: boolean;
  showCollapsible: boolean;
  title: string;
}

export const VerificationsList: React.FC<VerificationsListProps> = React.memo(
  ({
    verifications,
    availableVerifications,
    onVerificationsChange,
    loading,
    model,
    onTest,
    testResults,
    onReferenceSelected,
    selectedHost: _selectedHost,
    modelReferences,
    referencesLoading,
    showCollapsible,
    title,
  }) => {
    const [passCondition, setPassCondition] = useState<'all' | 'any'>('all');
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [imageComparisonDialog, setImageComparisonDialog] = useState<{
      open: boolean;
      sourceUrl: string;
      referenceUrl: string;
      overlayUrl?: string;
      userThreshold?: number;
      matchingResult?: number;
      resultType?: 'PASS' | 'FAIL' | 'ERROR';
      imageFilter?: 'none' | 'greyscale' | 'binary';
    }>({
      open: false,
      sourceUrl: '',
      referenceUrl: '',
      overlayUrl: undefined,
      userThreshold: undefined,
      matchingResult: undefined,
      resultType: undefined,
      imageFilter: undefined,
    });

    const [textComparisonDialog, setTextComparisonDialog] = useState<{
      open: boolean;
      searchedText: string;
      extractedText: string;
      sourceUrl?: string;
      resultType?: 'PASS' | 'FAIL' | 'ERROR';
      detectedLanguage?: string;
      languageConfidence?: number;
      imageFilter?: 'none' | 'greyscale' | 'binary';
    }>({
      open: false,
      searchedText: '',
      extractedText: '',
      sourceUrl: undefined,
      resultType: undefined,
      detectedLanguage: undefined,
      languageConfidence: undefined,
      imageFilter: undefined,
    });

    // Image processing functions
    const processImageUrl = useCallback((url: string): string => {
      if (!url) return '';

      console.log(`[@component:VerificationsList] Processing image URL: ${url}`);

      // Handle data URLs (base64) - return as is
      if (url.startsWith('data:')) {
        console.log('[@component:VerificationsList] Using data URL');
        return url;
      }

      // Handle HTTP URLs - use proxy to convert to HTTPS
      if (url.startsWith('http:')) {
        console.log('[@component:VerificationsList] HTTP URL detected, using proxy');
        // URL is already processed by backend
        const proxyUrl = url;
        console.log(`[@component:VerificationsList] Generated proxy URL: ${proxyUrl}`);
        return proxyUrl;
      }

      // Handle HTTPS URLs - return as is (no proxy needed)
      if (url.startsWith('https:')) {
        console.log('[@component:VerificationsList] Using HTTPS URL directly');
        return url;
      }

      // For relative paths or other formats, use directly
      console.log('[@component:VerificationsList] Using URL directly');
      return url;
    }, []);

    const getCacheBustedUrl = useCallback((url: string): string => {
      if (!url) return '';
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}cache=${Date.now()}`;
    }, []);

    // Debug logging for testResults changes
    useEffect(() => {
      console.log('[@component:VerificationsList] testResults updated:', testResults);
    }, [testResults]);

    // Debug logging for verifications changes
    useEffect(() => {
      console.log(
        `[@component:VerificationsList] Verifications updated: ${verifications.length} verifications for model ${model}:`,
        verifications,
      );
    }, [verifications, model]);

    // Debug logging for model references - moved to useEffect to avoid render-time logging
    useEffect(() => {
      console.log(
        `[@component:VerificationsList] Using passed model references for ${model}:`,
        Object.keys(modelReferences).length,
        'references',
      );
    }, [model, modelReferences]);

    const addVerification = useCallback(() => {
      const newVerification: Verification = {
        command: '',
        params: { timeout: 0 } as any,
        verification_type: 'text',
      };
      onVerificationsChange([...verifications, newVerification]);
    }, [verifications, onVerificationsChange]);

    const removeVerification = useCallback(
      (index: number) => {
        const newVerifications = verifications.filter((_, i) => i !== index);
        onVerificationsChange(newVerifications);
      },
      [verifications, onVerificationsChange],
    );

    const updateVerification = useCallback(
      (index: number, updates: any) => {
        const newVerifications = verifications.map((verification, i) =>
          i === index ? { ...verification, ...updates } : verification,
        );
        onVerificationsChange(newVerifications as Verification[]);
      },
      [verifications, onVerificationsChange],
    );

    const moveVerificationUp = useCallback(
      (index: number) => {
        if (index === 0) return;
        const newVerifications = [...verifications];
        [newVerifications[index - 1], newVerifications[index]] = [
          newVerifications[index],
          newVerifications[index - 1],
        ];
        onVerificationsChange(newVerifications);
      },
      [verifications, onVerificationsChange],
    );

    const moveVerificationDown = useCallback(
      (index: number) => {
        if (index === verifications.length - 1) return;
        const newVerifications = [...verifications];
        [newVerifications[index], newVerifications[index + 1]] = [
          newVerifications[index + 1],
          newVerifications[index],
        ];
        onVerificationsChange(newVerifications);
      },
      [verifications, onVerificationsChange],
    );

    const handleVerificationSelect = useCallback(
      (index: number, command: string) => {
        // Find the selected verification from available verifications
        let selectedVerification: any = undefined;

        // Search through all controller types to find the verification
        for (const verifications of Object.values(availableVerifications)) {
          if (!Array.isArray(verifications)) continue;

          const verification = verifications.find((v) => v.command === command);
          if (verification) {
            selectedVerification = verification;
            break;
          }
        }

        if (selectedVerification) {
          // Use the cleaned params from the selectedVerification (already processed by useVerification hook)
          updateVerification(index, {
            command: selectedVerification.command,
            verification_type: selectedVerification.verification_type,
            params: { ...selectedVerification.params },
          });
        }
      },
      [availableVerifications, updateVerification],
    );

    const handleReferenceSelect = useCallback(
      (index: number, internalKey: string) => {
        console.log('[@component:VerificationsList] Reference selected:', {
          index,
          internalKey,
          model,
        });

        const selectedRef = modelReferences[internalKey];

        if (selectedRef) {
          console.log('[@component:VerificationsList] Selected reference details:', {
            internalKey: internalKey,
            name: selectedRef.name,
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
            // Image reference parameters - store internal key as image_path
            updateVerification(index, {
              params: {
                ...baseParams,
                image_path: internalKey, // Store internal key for backend lookup
                reference_name: selectedRef.name, // Store display name for UI
              },
            });
            console.log(
              '[@component:VerificationsList] Updated verification with image reference:',
              {
                internal_key: internalKey,
                display_name: selectedRef.name,
                reference_url: selectedRef.url,
                updatedParams: {
                  ...baseParams,
                  image_path: internalKey,
                  reference_name: selectedRef.name,
                },
              },
            );
          } else if (selectedRef.type === 'text') {
            // Text reference parameters - store text and internal key
            updateVerification(index, {
              params: {
                ...baseParams,
                text: selectedRef.text || '',
                reference_name: internalKey, // Store internal key for backend lookup
              },
            });
            console.log(
              '[@component:VerificationsList] Updated verification with text reference:',
              {
                internal_key: internalKey,
                display_name: selectedRef.name,
                reference_text: selectedRef.text,
                font_size: selectedRef.font_size,
                updatedParams: {
                  ...baseParams,
                  text: selectedRef.text || '',
                  reference_name: internalKey,
                },
              },
            );
          }

          // Pass the display name to the callback, not the internal key
          onReferenceSelected(selectedRef.name || internalKey, selectedRef);
        }
      },
      [model, modelReferences, verifications, updateVerification, onReferenceSelected],
    );

    const handleImageFilterChange = useCallback(
      (index: number, filter: 'none' | 'greyscale' | 'binary') => {
        updateVerification(index, {
          params: {
            ...verifications[index].params,
            image_filter: filter,
          },
        });
        console.log('[@component:VerificationsList] Changed image filter to:', filter);
      },
      [verifications, updateVerification],
    );

    const handleTextFilterChange = useCallback(
      (index: number, filter: 'none' | 'greyscale' | 'binary') => {
        updateVerification(index, {
          params: {
            ...verifications[index].params,
            text_filter: filter,
          },
        });
        console.log('[@component:VerificationsList] Changed text filter to:', filter);
      },
      [verifications, updateVerification],
    );

    const handleImageClick = useCallback(
      (
        sourceUrl: string,
        referenceUrl: string,
        overlayUrl?: string,
        userThreshold?: number,
        matchingResult?: number,
        resultType?: 'PASS' | 'FAIL' | 'ERROR',
        imageFilter?: 'none' | 'greyscale' | 'binary',
      ) => {
        setImageComparisonDialog({
          open: true,
          sourceUrl,
          referenceUrl,
          overlayUrl,
          userThreshold,
          matchingResult,
          resultType,
          imageFilter,
        });
      },
      [],
    );

    const handleTextSourceImageClick = useCallback(
      (
        searchedText: string,
        extractedText: string,
        sourceUrl?: string,
        resultType?: 'PASS' | 'FAIL' | 'ERROR',
        detectedLanguage?: string,
        languageConfidence?: number,
        imageFilter?: 'none' | 'greyscale' | 'binary',
      ) => {
        setTextComparisonDialog({
          open: true,
          searchedText,
          extractedText,
          sourceUrl,
          resultType,
          detectedLanguage,
          languageConfidence,
          imageFilter,
        });
      },
      [],
    );

    // Check if all verifications have required inputs
    const areVerificationsValid = useMemo(() => {
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
          // ADB verifications need search criteria - ADD TYPE CHECKING
          const hasSearchTerm =
            verification.params?.search_term &&
            typeof verification.params.search_term === 'string' &&
            verification.params.search_term.trim() !== '';
          return Boolean(hasSearchTerm);
        }

        return true;
      });
    }, [verifications]);

    if (loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <CircularProgress size={20} />
          <Typography>Running verifications...</Typography>
        </Box>
      );
    }

    const content = (
      <Box sx={{ overflow: 'visible', position: 'relative' }}>
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

        <Box sx={{ mb: 1, overflow: 'visible' }}>
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
              onSourceImageClick={handleTextSourceImageClick}
              processImageUrl={processImageUrl}
              getCacheBustedUrl={getCacheBustedUrl}
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

          <Button
            size="small"
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTest();
            }}
            disabled={!areVerificationsValid}
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
                  ? testResults.every((result) => result.success)
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)'
                  : testResults.some((result) => result.success)
                    ? 'rgba(76, 175, 80, 0.1)'
                    : 'rgba(244, 67, 54, 0.1)',
              border: `1px solid ${
                passCondition === 'all'
                  ? testResults.every((result) => result.success)
                    ? '#4caf50'
                    : '#f44336'
                  : testResults.some((result) => result.success)
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
                    ? testResults.every((result) => result.success)
                      ? '#4caf50'
                      : '#f44336'
                    : testResults.some((result) => result.success)
                      ? '#4caf50'
                      : '#f44336',
              }}
            >
              Final Result:{' '}
              {passCondition === 'all'
                ? testResults.every((result) => result.success)
                  ? 'PASS'
                  : 'FAIL'
                : testResults.some((result) => result.success)
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
          overlayUrl={imageComparisonDialog.overlayUrl}
          userThreshold={imageComparisonDialog.userThreshold}
          matchingResult={imageComparisonDialog.matchingResult}
          resultType={imageComparisonDialog.resultType}
          imageFilter={imageComparisonDialog.imageFilter}
          onClose={() => setImageComparisonDialog((prev) => ({ ...prev, open: false }))}
          processImageUrl={processImageUrl}
          getCacheBustedUrl={getCacheBustedUrl}
        />

        {/* Text Comparison Dialog */}
        <VerificationTextComparisonDialog
          open={textComparisonDialog.open}
          searchedText={textComparisonDialog.searchedText}
          extractedText={textComparisonDialog.extractedText}
          sourceUrl={textComparisonDialog.sourceUrl}
          resultType={textComparisonDialog.resultType}
          detectedLanguage={textComparisonDialog.detectedLanguage}
          languageConfidence={textComparisonDialog.languageConfidence}
          imageFilter={textComparisonDialog.imageFilter}
          onClose={() => setTextComparisonDialog((prev) => ({ ...prev, open: false }))}
        />
      </Box>
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
                overflow: 'visible',
                position: 'relative',
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
    return <Box sx={{ overflow: 'visible', position: 'relative' }}>{content}</Box>;
  },
  (prevProps, nextProps) => {
    // Shallow comparison helper function
    const shallowEqual = (obj1: any, obj2: any): boolean => {
      if (obj1 === obj2) return true;
      if (!obj1 || !obj2) return obj1 === obj2;

      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      for (let key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
      }

      return true;
    };

    // Array comparison helper - improved for better performance
    const arraysEqual = (arr1: any[], arr2: any[]): boolean => {
      if (arr1 === arr2) return true;
      if (!arr1 || !arr2) return arr1 === arr2;
      if (arr1.length !== arr2.length) return false;

      // For verifications array, do a more thorough comparison
      // to avoid re-renders when only internal state changes
      for (let i = 0; i < arr1.length; i++) {
        const item1 = arr1[i];
        const item2 = arr2[i];

        // Compare essential fields that would affect rendering
        if (
          item1.command !== item2.command ||
          item1.verification_type !== item2.verification_type ||
          JSON.stringify(item1.params) !== JSON.stringify(item2.params) ||
          item1.success !== item2.success ||
          item1.error !== item2.error
        ) {
          return false;
        }
      }

      return true;
    };

    // Custom comparison function to prevent unnecessary re-renders
    const verificationsChanged = !arraysEqual(prevProps.verifications, nextProps.verifications);
    const availableVerificationsChanged = !shallowEqual(
      prevProps.availableVerifications,
      nextProps.availableVerifications,
    );
    const loadingChanged = prevProps.loading !== nextProps.loading;
    const modelChanged = prevProps.model !== nextProps.model;
    const testResultsChanged = !arraysEqual(prevProps.testResults, nextProps.testResults);

    const selectedHostChanged = !shallowEqual(prevProps.selectedHost, nextProps.selectedHost);
    const modelReferencesChanged = !shallowEqual(
      prevProps.modelReferences,
      nextProps.modelReferences,
    );
    const referencesLoadingChanged = prevProps.referencesLoading !== nextProps.referencesLoading;
    const showCollapsibleChanged = prevProps.showCollapsible !== nextProps.showCollapsible;
    const titleChanged = prevProps.title !== nextProps.title;

    // Function references - only check if they're different functions
    const onVerificationsChangeChanged =
      prevProps.onVerificationsChange !== nextProps.onVerificationsChange;
    const onTestChanged = prevProps.onTest !== nextProps.onTest;
    const onReferenceSelectedChanged =
      prevProps.onReferenceSelected !== nextProps.onReferenceSelected;

    // Only re-render if meaningful props have changed
    const shouldRerender =
      verificationsChanged ||
      availableVerificationsChanged ||
      loadingChanged ||
      modelChanged ||
      testResultsChanged ||
      selectedHostChanged ||
      modelReferencesChanged ||
      referencesLoadingChanged ||
      showCollapsibleChanged ||
      titleChanged ||
      onVerificationsChangeChanged ||
      onTestChanged ||
      onReferenceSelectedChanged;

    // Reduce logging frequency to avoid console spam
    if (shouldRerender && verificationsChanged) {
      console.log('[@component:VerificationsList] Verifications changed, re-rendering');
    }

    return !shouldRerender; // Return true to skip re-render, false to re-render
  },
);
