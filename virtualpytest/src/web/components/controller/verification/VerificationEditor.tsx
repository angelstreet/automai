import {
  Camera as CameraIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  IconButton,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import {
  VerificationEditorLayoutConfig,
  getVerificationEditorLayout,
} from '../../../config/layoutConfig';

// Import registration context

import { NodeVerificationsList } from '../../navigation/Navigation_NodeVerificationsList';

// Define DeviceConnection interface locally since it's not exported
interface DeviceConnection {
  flask_url: string;
  host_url: string;
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
  // Add properties for verification results
  lastRunResult?: boolean;
  lastRunResults?: boolean[];
  resultImageUrl?: string;
  referenceImageUrl?: string;
  lastRunDetails?: string;
}

// Centralized VerificationTestResult interface - MUST match NodeVerificationsList.tsx
// This ensures all verification types (text, image, ADB) use the same result structure
// and are handled uniformly throughout the application
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

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VerificationEditorProps {
  isVisible: boolean;
  isScreenshotMode: boolean;
  isCaptureActive: boolean;
  captureImageRef?: React.RefObject<HTMLImageElement>;
  captureImageDimensions?: { width: number; height: number };
  originalImageDimensions?: { width: number; height: number };
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  model: string;
  // VideoCapture component state
  videoFramesPath?: string;
  totalFrames?: number;
  currentFrame?: number;
  // ScreenshotCapture component state
  screenshotPath?: string;
  sx?: any;
  onReferenceSaved?: (referenceName: string) => void;
  layoutConfig?: VerificationEditorLayoutConfig; // Allow direct override if needed
  // Device connection information
  deviceConnection?: {
    flask_url: string; // e.g., "http://192.168.1.67:5119"
    host_url: string; // e.g., "https://192.168.1.67:444"
  };
  // Host device with controller proxies (for new controller architecture)
  selectedHostDevice?: any;
}

export const VerificationEditor: React.FC<VerificationEditorProps> = ({
  isVisible,
  isScreenshotMode,
  isCaptureActive,
  captureImageRef,
  captureImageDimensions,
  originalImageDimensions,
  captureSourcePath,
  selectedArea,
  onAreaSelected,
  onClearSelection,
  model,
  // VideoCapture component state
  videoFramesPath,
  totalFrames,
  currentFrame,
  // ScreenshotCapture component state
  screenshotPath,
  sx = {},
  onReferenceSaved,
  layoutConfig,
  // Device connection information
  deviceConnection,
  // Host device with controller proxies (for new controller architecture)
  selectedHostDevice,
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<VerificationTestResult[]>([]);

  // Collapsible sections state
  const [captureCollapsed, setCaptureCollapsed] = useState<boolean>(false);
  const [verificationsCollapsed, setVerificationsCollapsed] = useState<boolean>(false);

  const captureContainerRef = useRef<HTMLDivElement>(null);

  const [tempReferenceUrl, setTempReferenceUrl] = useState<string>('');
  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceType, setReferenceType] = useState<'image' | 'text'>('image');
  const [detectedTextData, setDetectedTextData] = useState<{
    text: string;
    fontSize: number;
    confidence: number;
    detectedLanguage?: string;
    detectedLanguageName?: string;
    languageConfidence?: number;
  } | null>(null);
  const [textImageFilter, setTextImageFilter] = useState<'none' | 'greyscale' | 'binary'>('none');
  const [referenceSaveCounter, setReferenceSaveCounter] = useState<number>(0);

  // Image processing options for capture only
  const [imageProcessingOptions, setImageProcessingOptions] = useState({
    autocrop: false,
    removeBackground: false,
  });

  // NEW: State for selected reference image preview
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [selectedReferenceInfo, setSelectedReferenceInfo] = useState<{
    name: string;
    type: 'image' | 'text';
  } | null>(null);

  // Get verification proxy using server route instead of controller proxy
  const getVerificationProxy = useCallback(() => {
    if (selectedHostDevice) {
      console.log('[@component:VerificationEditor] Using server route for verification operations');
      return {
        // Return a simplified interface that uses server routes
        executeVerification: async (verification: any) => {
          const response = await fetch(`/server/verification/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host_name: selectedHostDevice.host_name,
              verification,
            }),
          });
          return response.json();
        },
      };
    }
    return null;
  }, [selectedHostDevice]);

  // Use the provided layout config or get it from the model type
  const finalLayoutConfig = useMemo(() => {
    const config = layoutConfig || getVerificationEditorLayout(model);
    console.log('[@component:VerificationEditor] Layout config recalculated:', {
      model,
      providedLayoutConfig: layoutConfig,
      calculatedConfig: config,
      isMobileModel: config.isMobileModel,
      width: config.width,
      height: config.height,
      captureHeight: config.captureHeight,
    });
    return config;
  }, [model, layoutConfig]);

  // Debug logging for component mount/unmount
  useEffect(() => {
    console.log('[@component:VerificationEditor] Component mounted with props:', {
      isVisible,
      model,
      isScreenshotMode,
      isCaptureActive,
      layoutConfig: finalLayoutConfig,
    });

    return () => {
      console.log('[@component:VerificationEditor] Component unmounting');
    };
  }, []);

  // Debug logging for selected reference image changes
  useEffect(() => {
    if (selectedReferenceImage) {
      console.log(
        '[@component:VerificationEditor] Selected reference image state updated:',
        selectedReferenceImage,
      );
    }
  }, [selectedReferenceImage]);

  useEffect(() => {
    if (isVisible) {
      fetchVerificationActions();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!model || model.trim() === '') {
      console.error('[@component:VerificationEditor] Model prop is required but not provided');
      setError('Model is required for verification editor');
    } else {
      console.log(`[@component:VerificationEditor] Using model: ${model}`);
    }
  }, [model]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchVerificationActions = async () => {
    try {
      const verificationController = getVerificationProxy();

      if (verificationController) {
        console.log(
          `[@component:VerificationEditor] Using verification controller proxy for actions`,
        );
        const result = await verificationController.getVerificationActions();

        if (result.success && result.data) {
          setVerificationActions(result.data);
        } else {
          console.error(
            `[@component:VerificationEditor] Controller failed to get actions:`,
            result.error,
          );
        }
      } else {
        console.error(`[@component:VerificationEditor] No verification controller proxy available`);
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error fetching verification actions:', error);
    }
  };

  const handleVerificationsChange = (newVerifications: NodeVerification[]) => {
    setVerifications(newVerifications);
    // Clear test results when verifications change
    setTestResults([]);
  };

  // NEW: Handle reference selection to update preview
  const handleReferenceSelected = async (referenceName: string, referenceData: any) => {
    console.log(
      '[@component:VerificationEditor] Reference selected:',
      referenceName,
      referenceData,
    );
    // TODO: Implement with verification controller proxy
    // For now, just clear preview
    setSelectedReferenceImage(null);
    setSelectedReferenceInfo(null);
    setCapturedReferenceImage(null);
    setHasCaptured(false);
  };

  // Handle area selection from drag overlay
  const handleAreaSelected = useCallback(
    (area: { x: number; y: number; width: number; height: number }) => {
      console.log('[@component:VerificationEditor] === AREA SELECTION DEBUG ===');
      console.log('[@component:VerificationEditor] New area selected:', {
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        area: area,
      });
      console.log('[@component:VerificationEditor] Previous selected area:', selectedArea);
      console.log(
        '[@component:VerificationEditor] Capture image dimensions:',
        captureImageDimensions,
      );
      console.log(
        '[@component:VerificationEditor] Original image dimensions:',
        originalImageDimensions,
      );
      console.log('[@component:VerificationEditor] Capture source path:', captureSourcePath);

      if (onAreaSelected) {
        console.log(
          '[@component:VerificationEditor] Calling parent onAreaSelected with area:',
          area,
        );
        onAreaSelected(area);
      }
    },
    [
      selectedArea,
      captureImageDimensions,
      originalImageDimensions,
      captureSourcePath,
      onAreaSelected,
    ],
  );

  // Handle clearing selection
  const handleClearSelection = useCallback(() => {
    console.log('[@component:VerificationEditor] === AREA CLEAR DEBUG ===');
    console.log('[@component:VerificationEditor] Clearing area selection');
    console.log('[@component:VerificationEditor] Previous selected area:', selectedArea);

    // Clear captured reference images when clearing selection
    setCapturedReferenceImage(null);
    setHasCaptured(false);
    // Also clear selected reference when clearing selection
    setSelectedReferenceImage(null);
    setSelectedReferenceInfo(null);

    if (onClearSelection) {
      console.log('[@component:VerificationEditor] Calling parent onClearSelection');
      onClearSelection();
    }
  }, [selectedArea, onClearSelection]);

  const handleCaptureReference = async () => {
    console.log('[@component:VerificationEditor] Capture reference requested');
    // TODO: Implement with verification controller proxy
    // For now, just mark as captured
    setHasCaptured(true);
  };

  const handleSaveReference = async () => {
    if (!selectedArea || !screenshotPath) {
      setError('Please select an area on the screenshot first');
      return;
    }

    if (!referenceName.trim()) {
      setError('Please enter a reference name');
      return;
    }

    setPendingSave(true);
    setError(null);

    try {
      console.log('[@component:VerificationEditor] Saving reference with data:', {
        name: referenceName,
        model: model,
        area: selectedArea,
        screenshot_path: screenshotPath,
      });

      const verificationController = getVerificationProxy();

      if (verificationController) {
        console.log(`[@component:VerificationEditor] Using verification controller proxy for save`);
        const result = await verificationController.saveReference({
          name: referenceName,
          model: model,
          area: selectedArea,
          screenshot_path: screenshotPath,
        });

        if (result.success) {
          console.log('[@component:VerificationEditor] Reference saved successfully');
          setReferenceName('');

          // Trigger reload of available references
          setReferenceSaveCounter((prev) => prev + 1);
        } else {
          setError(result.error || 'Failed to save reference');
        }
      } else {
        setError('No verification controller proxy available');
      }
    } catch (err: any) {
      console.error('[@component:VerificationEditor] Error saving reference:', err);
      setError(err.message || 'Failed to save reference');
    } finally {
      setPendingSave(false);
    }
  };

  const handleTest = async (event?: React.MouseEvent) => {
    // Prevent any default form submission behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (verifications.length === 0) {
      console.log('[@component:VerificationEditor] No verifications to test');
      return;
    }

    console.log('[@component:VerificationEditor] === VERIFICATION TEST DEBUG ===');
    console.log(
      '[@component:VerificationEditor] Number of verifications before filtering:',
      verifications.length,
    );

    // Filter out empty/invalid verifications before testing
    const validVerifications = verifications.filter((verification, index) => {
      // Check if verification has an id (is configured)
      if (!verification.id || verification.id.trim() === '') {
        console.log(
          `[@component:VerificationEditor] Removing verification ${index}: No verification type selected`,
        );
        return false;
      }

      // Check if verification has required input based on controller type
      if (verification.controller_type === 'image') {
        // Image verifications need a reference image
        const hasImagePath =
          verification.params?.full_path ||
          verification.params?.reference_path ||
          verification.inputValue;
        if (!hasImagePath) {
          console.log(
            `[@component:VerificationEditor] Removing verification ${index}: No image reference specified`,
          );
          return false;
        }
      } else if (verification.controller_type === 'text') {
        // Text verifications need text to search for
        const hasText = verification.inputValue && verification.inputValue.trim() !== '';
        if (!hasText) {
          console.log(
            `[@component:VerificationEditor] Removing verification ${index}: No text specified`,
          );
          return false;
        }
      } else if (verification.controller_type === 'adb') {
        // ADB verifications need search criteria
        const hasSearchTerm = verification.inputValue && verification.inputValue.trim() !== '';
        if (!hasSearchTerm) {
          console.log(
            `[@component:VerificationEditor] Removing verification ${index}: No search term specified`,
          );
          return false;
        }
      }

      // For other types, check if requiresInput is set and if so, validate accordingly
      if (verification.requiresInput) {
        const hasInput = verification.inputValue && verification.inputValue.trim() !== '';
        if (!hasInput) {
          console.log(
            `[@component:VerificationEditor] Removing verification ${index}: Required input missing`,
          );
          return false;
        }
      }

      return true;
    });

    // Update verifications list if any were filtered out
    if (validVerifications.length !== verifications.length) {
      console.log(
        `[@component:VerificationEditor] Filtered out ${verifications.length - validVerifications.length} empty verifications`,
      );
      setVerifications(validVerifications);

      // Show message about removed verifications
      if (validVerifications.length === 0) {
        setError(
          'All verifications were empty and have been removed. Please add valid verifications.',
        );
        return;
      } else {
        setSuccessMessage(
          `Removed ${verifications.length - validVerifications.length} empty verification(s). Testing ${validVerifications.length} valid verification(s).`,
        );
      }
    }

    console.log(
      '[@component:VerificationEditor] Number of valid verifications:',
      validVerifications.length,
    );
    console.log('[@component:VerificationEditor] Model:', model);
    console.log('[@component:VerificationEditor] Capture source path:', captureSourcePath);

    // Log each valid verification with its area coordinates
    validVerifications.forEach((verification, index) => {
      console.log(`[@component:VerificationEditor] Valid verification ${index}:`, {
        id: verification.id,
        label: verification.label,
        command: verification.command,
        controller_type: verification.controller_type,
        params: verification.params,
        area: verification.params?.area,
        inputValue: verification.inputValue,
      });

      if (verification.params?.area) {
        console.log(`[@component:VerificationEditor] Verification ${index} area details:`, {
          x: verification.params.area.x,
          y: verification.params.area.y,
          width: verification.params.area.width,
          height: verification.params.area.height,
        });
      }
    });

    try {
      setLoading(true);
      setError(null);
      // Clear previous test results
      setTestResults([]);

      // Skip controller initialization since host is directly connected via ADB
      console.log('[@component:VerificationEditor] Executing verifications directly on host...');

      // NEW: Extract capture filename from captureSourcePath for specific capture selection
      let capture_filename = null;
      if (captureSourcePath) {
        // Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
        const url = new URL(captureSourcePath);
        const pathname = url.pathname;
        capture_filename = pathname.split('/').pop()?.split('?')[0]; // Get filename without query params
        console.log('[@component:VerificationEditor] Using specific capture:', capture_filename);
      }

      const batchPayload = {
        verifications: validVerifications, // Use filtered verifications
        model: model,
        node_id: 'verification-editor',
        tree_id: 'verification-tree',
        capture_filename: capture_filename, // NEW: Send specific capture filename
      };

      console.log('[@component:VerificationEditor] Batch execution payload:', batchPayload);

      const verificationController = getVerificationProxy();

      if (!verificationController) {
        throw new Error('No verification controller proxy available');
      }

      console.log(
        `[@component:VerificationEditor] Using verification controller proxy for batch execution`,
      );
      const batchResult = await verificationController.executeVerificationBatch({
        verifications: validVerifications,
        model: model,
        node_id: 'verification-editor',
      });

      console.log('[@component:VerificationEditor] Raw batch result:', batchResult);

      // Process results if we have them, regardless of overall batch success
      // The batch can be "unsuccessful" if some verifications failed, but we still want to show the results
      if (batchResult.results && batchResult.results.length > 0) {
        console.log(
          '[@component:VerificationEditor] Processing batch results:',
          batchResult.results.length,
          'results',
        );

        // Process and set test results for NodeVerificationsList to display
        const processedResults: VerificationTestResult[] = batchResult.results.map(
          (result: any, index: number) => {
            const verification = validVerifications[index]; // Use validVerifications instead of verifications

            console.log(`[@component:VerificationEditor] Processing result ${index}:`, result);
            console.log(
              `[@component:VerificationEditor] Corresponding verification ${index}:`,
              verification,
            );

            // Determine result type
            let resultType: 'PASS' | 'FAIL' | 'ERROR' = 'FAIL';
            if (result.success) {
              resultType = 'PASS';
            } else if (result.error && !result.message) {
              resultType = 'ERROR';
            }

            const processedResult: VerificationTestResult = {
              success: result.success,
              message: result.message,
              error: result.error,
              threshold: result.confidence || result.threshold, // Use confidence from host result
              resultType: resultType,
              sourceImageUrl: result.sourceImageUrl,
              referenceImageUrl: result.referenceImageUrl,
              extractedText: result.extracted_text,
              searchedText: result.searched_text,
              imageFilter: result.image_filter || verification.params?.image_filter,
              detectedLanguage: result.detected_language,
              languageConfidence: result.language_confidence,
              // Add ADB-specific fields
              search_term: result.search_term,
              wait_time: result.wait_time,
              total_matches: result.total_matches,
              matches: result.matches,
            };

            console.log(
              `[@component:VerificationEditor] Processed result ${index}:`,
              processedResult,
            );
            return processedResult;
          },
        );

        console.log('[@component:VerificationEditor] Setting test results:', processedResults);
        setTestResults(processedResults);

        // Update verifications with results (use validVerifications for consistency)
        const updatedVerifications = validVerifications.map((verification, index) => {
          const result = batchResult.results?.[index];
          if (result) {
            return {
              ...verification,
              lastRunResult: result.success,
              lastRunResults: [result.success],
              resultImageUrl: result.sourceImageUrl,
              referenceImageUrl: result.referenceImageUrl,
              lastRunDetails: result.message || 'Verification completed',
            };
          }
          return verification;
        });

        setVerifications(updatedVerifications);

        // Show success message with pass/fail count
        const passedCount = batchResult.passed_count || 0;
        const totalCount = batchResult.total_count || processedResults.length;
        setSuccessMessage(`Verification completed: ${passedCount}/${totalCount} passed`);
      } else if (batchResult.success === false && batchResult.error) {
        // Only treat as error if there's an actual error and no results
        const errorMessage = batchResult.message || batchResult.error || 'Unknown error occurred';
        console.log(
          '[@component:VerificationEditor] Batch execution failed with error:',
          errorMessage,
        );
        setError(`Verification failed: ${errorMessage}`);
        // Clear test results on actual failure
        setTestResults([]);
      } else {
        // Fallback case - no results and no clear error
        console.log('[@component:VerificationEditor] No results received from batch execution');
        setError('No verification results received');
        setTestResults([]);
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error running tests:', error);
      setError(`Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Clear test results on error
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetectText = async () => {
    if (!selectedArea || !model) {
      console.log('[@component:VerificationEditor] Cannot auto-detect: missing area or model');
      return;
    }

    if (!captureSourcePath) {
      console.log(
        '[@component:VerificationEditor] Cannot auto-detect: missing capture source path',
      );
      return;
    }

    try {
      console.log(
        '[@component:VerificationEditor] Starting text auto-detection in area:',
        selectedArea,
      );

      const verificationController = getVerificationProxy();

      if (!verificationController) {
        console.error('[@component:VerificationEditor] No verification controller proxy available');
        return;
      }

      console.log(
        `[@component:VerificationEditor] Using verification controller proxy for auto-detect text`,
      );
      const result = await verificationController.autoDetectText({
        model,
        area: selectedArea,
        source_path: captureSourcePath,
        image_filter: textImageFilter,
      });

      if (result.success) {
        console.log('[@component:VerificationEditor] Text auto-detection successful:', result);

        setDetectedTextData({
          text: result.text || '',
          fontSize: result.fontSize || 0,
          confidence: result.confidence || 0,
          detectedLanguage: result.detectedLanguage,
          detectedLanguageName: result.detectedLanguageName,
          languageConfidence: result.languageConfidence,
        });

        // Pre-fill the text input with detected text
        setReferenceText(result.text || '');

        // Note: Preview URL handling would need to be added to controller proxy response
        // For now, just mark as captured
        setHasCaptured(true);
      } else {
        console.error('[@component:VerificationEditor] Text auto-detection failed:', result.error);
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error during text auto-detection:', error);
    }
  };

  const validateRegex = (text: string): boolean => {
    if (!text) return true; // Empty text is valid

    try {
      new RegExp(text);
      return true;
    } catch (error) {
      return false;
    }
  };

  const canCapture = selectedArea;
  const canSave = (() => {
    if (!referenceName.trim() || !selectedArea || !model || model.trim() === '') {
      return false;
    }

    if (referenceType === 'image') {
      return hasCaptured; // Image type requires capture
    } else if (referenceType === 'text') {
      return referenceText.trim() !== '' && validateRegex(referenceText); // Text type requires valid text/regex
    }

    return false;
  })();
  const allowSelection = !isCaptureActive && captureSourcePath && captureImageRef;

  const handleConfirmOverwrite = async () => {
    setShowConfirmDialog(false);
    await handleSaveReference();
  };

  const handleCancelOverwrite = () => {
    setShowConfirmDialog(false);
  };

  if (!isVisible) return null;

  if (!model || model.trim() === '') {
    return (
      <Box
        sx={{
          width: finalLayoutConfig.width,
          height: finalLayoutConfig.height,
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'error.main' }}>
          Configuration Error
        </Typography>
        <Typography variant="body2" sx={{ color: 'error.main', textAlign: 'center' }}>
          Model prop is required for the Verification Editor
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: finalLayoutConfig.width,
        height: finalLayoutConfig.height,
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(255,255,255,0.5)',
          },
        },
        ...sx,
      }}
    >
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
        Verification Editor
        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
          ({model}){' '}
          {!finalLayoutConfig.isMobileModel && (
            <Typography component="span" sx={{ fontSize: '0.7rem' }}>
              [Landscape]
            </Typography>
          )}
        </Typography>
      </Typography>

      {/* Show error message if any */}
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}

      {/* =================== CAPTURE SECTION =================== */}
      <Box>
        {/* Capture Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setCaptureCollapsed(!captureCollapsed)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            {captureCollapsed ? (
              <ArrowRightIcon sx={{ fontSize: '1rem' }} />
            ) : (
              <ArrowDownIcon sx={{ fontSize: '1rem' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Capture
          </Typography>
        </Box>

        {/* Collapsible Capture Content */}
        <Collapse in={!captureCollapsed}>
          <Box>
            {/* 1. Capture Container (Reference Image Preview) */}
            <Box>
              <Box
                ref={captureContainerRef}
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: finalLayoutConfig.captureHeight,
                  border: '2px dashed #444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  mb: 1.5,
                }}
              >
                {capturedReferenceImage ? (
                  <>
                    <img
                      src={capturedReferenceImage}
                      alt="Captured Reference"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        maxHeight: finalLayoutConfig.isMobileModel ? 'none' : '100%',
                      }}
                    />
                    {/* Success message overlay */}
                    {successMessage && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          zIndex: 10,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#4caf50',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          }}
                        >
                          {successMessage}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : selectedReferenceImage ? (
                  <>
                    <img
                      src={selectedReferenceImage}
                      alt="Selected Reference"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        maxHeight: finalLayoutConfig.isMobileModel ? 'none' : '100%',
                      }}
                      onLoad={() =>
                        console.log(
                          '[@component:VerificationEditor] Selected reference image loaded successfully',
                        )
                      }
                      onError={(e) =>
                        console.error(
                          '[@component:VerificationEditor] Selected reference image failed to load:',
                          e,
                        )
                      }
                    />
                    {/* Reference info overlay */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: 1,
                        padding: '2px 6px',
                        zIndex: 5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#90caf9',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                        }}
                      >
                        📁 {selectedReferenceInfo?.name}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.65rem',
                      textAlign: 'center',
                      px: 0.5,
                    }}
                  >
                    {allowSelection ? 'Drag area on main image' : 'No image'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 2. Drag Area Info (Selection Info) */}
            <Box sx={{ mb: 0 }}>
              {selectedArea ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5 }}>
                  <TextField
                    size="small"
                    label="X"
                    type="number"
                    value={Math.round(selectedArea.x)}
                    onChange={(e) => {
                      const newX = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          x: newX,
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Y"
                    type="number"
                    value={Math.round(selectedArea.y)}
                    onChange={(e) => {
                      const newY = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          y: newY,
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Width"
                    type="number"
                    value={Math.round(selectedArea.width)}
                    onChange={(e) => {
                      const newWidth = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          width: newWidth,
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Height"
                    type="number"
                    value={Math.round(selectedArea.height)}
                    onChange={(e) => {
                      const newHeight = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          height: newHeight,
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                </Box>
              ) : (
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}
                >
                  No area selected
                </Typography>
              )}
            </Box>

            {/* 3. Reference Type Selection with Image Processing Options */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0, flexWrap: 'wrap' }}>
              <RadioGroup
                row
                value={referenceType}
                onChange={(e) => {
                  setReferenceType(e.target.value as 'image' | 'text');
                  // Reset related states when switching types
                  if (e.target.value === 'text') {
                    setReferenceText('');
                    setDetectedTextData(null);
                    // Reset image processing options when switching to text
                    setImageProcessingOptions({ autocrop: false, removeBackground: false });
                  } else {
                    setTempReferenceUrl('');
                  }
                }}
                sx={{
                  gap: 1,
                  '& .MuiFormControlLabel-root': {
                    margin: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.7rem',
                    },
                  },
                }}
              >
                <FormControlLabel value="image" control={<Radio size="small" />} label="Image" />
                <FormControlLabel value="text" control={<Radio size="small" />} label="Text" />
              </RadioGroup>

              {/* Image Processing Options (only for image type) */}
              {referenceType === 'image' && (
                <>
                  <FormControlLabel
                    control={
                      <input
                        type="checkbox"
                        checked={imageProcessingOptions.autocrop}
                        onChange={(e) =>
                          setImageProcessingOptions((prev) => ({
                            ...prev,
                            autocrop: e.target.checked,
                          }))
                        }
                        style={{ transform: 'scale(0.8)' }}
                      />
                    }
                    label="Auto-crop"
                    sx={{
                      margin: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.9)',
                      },
                    }}
                  />
                  <FormControlLabel
                    control={
                      <input
                        type="checkbox"
                        checked={imageProcessingOptions.removeBackground}
                        onChange={(e) =>
                          setImageProcessingOptions((prev) => ({
                            ...prev,
                            removeBackground: e.target.checked,
                          }))
                        }
                        style={{ transform: 'scale(0.8)' }}
                      />
                    }
                    label="Remove background"
                    sx={{
                      margin: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.9)',
                      },
                    }}
                  />
                </>
              )}
            </Box>

            {/* 4. Text Input and Auto-Detect (only for text type) */}
            {referenceType === 'text' && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
                <TextField
                  size="small"
                  label="Text / Regex Pattern"
                  placeholder="Enter text to find or regex pattern"
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  error={!!(referenceText && !validateRegex(referenceText))}
                  helperText={
                    referenceText && !validateRegex(referenceText) ? 'Invalid regex pattern' : ''
                  }
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-input': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.75rem',
                    },
                    '& .MuiFormHelperText-root': {
                      fontSize: '0.65rem',
                    },
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleAutoDetectText}
                  disabled={!selectedArea || !model || !captureSourcePath}
                  sx={{
                    fontSize: '0.7rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Auto-Detect
                </Button>
              </Box>
            )}

            {/* 5. Detected Text Info (only for text type with detected data) */}
            {referenceType === 'text' && detectedTextData && (
              <Box sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                  Detected: Font Size {detectedTextData.fontSize}px, Confidence{' '}
                  {(detectedTextData.confidence * 100).toFixed(1)}%
                  {detectedTextData.detectedLanguageName && (
                    <>, Language: {detectedTextData.detectedLanguageName}</>
                  )}
                </Typography>
              </Box>
            )}

            {/* 6. Reference Name + Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
              {/* Reference Name Input */}
              <TextField
                size="small"
                placeholder="Reference name"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': {
                    fontSize: '0.75rem',
                  },
                }}
              />

              {/* Action Buttons */}
              {referenceType === 'image' && (
                <Button
                  size="small"
                  startIcon={<CameraIcon sx={{ fontSize: '1rem' }} />}
                  variant="contained"
                  onClick={handleCaptureReference}
                  disabled={!canCapture}
                  sx={{
                    bgcolor: '#1976d2',
                    fontSize: '0.75rem',
                    '&:hover': {
                      bgcolor: '#1565c0',
                    },
                    '&:disabled': {
                      bgcolor: '#333',
                      color: 'rgba(255,255,255,0.3)',
                    },
                  }}
                >
                  Capture
                </Button>
              )}

              <Button
                size="small"
                variant="contained"
                onClick={handleSaveReference}
                disabled={!canSave || pendingSave}
                sx={{
                  bgcolor: '#4caf50',
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#45a049',
                  },
                  '&:disabled': {
                    bgcolor: '#333',
                    color: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                {pendingSave ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* =================== VERIFICATIONS SECTION =================== */}
      <Box>
        {/* Verifications Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => setVerificationsCollapsed(!verificationsCollapsed)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            {verificationsCollapsed ? (
              <ArrowRightIcon sx={{ fontSize: '1rem' }} />
            ) : (
              <ArrowDownIcon sx={{ fontSize: '1rem' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Verifications
            {model && (
              <Typography
                component="span"
                sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 1 }}
              >
                ({verifications.length})
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Collapsible Verifications Content */}
        <Collapse in={!verificationsCollapsed}>
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
            <NodeVerificationsList
              verifications={verifications}
              availableActions={verificationActions}
              onVerificationsChange={handleVerificationsChange}
              loading={loading}
              error={error}
              model={model}
              onTest={handleTest}
              testResults={testResults}
              reloadTrigger={referenceSaveCounter}
              onReferenceSelected={handleReferenceSelected}
            />
          </Box>
        </Collapse>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancelOverwrite}
        PaperProps={{
          sx: {
            backgroundColor: '#2E2E2E',
            color: '#ffffff',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>
          Warning: Overwrite Reference
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
            A {referenceType} reference named "{referenceName}" already exists for model "{model}".
            <br />
            Do you want to overwrite it?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button
            onClick={handleCancelOverwrite}
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#666',
              color: '#ffffff',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#888',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmOverwrite}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#f44336',
              fontSize: '0.75rem',
              '&:hover': {
                bgcolor: '#d32f2f',
              },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerificationEditor;
