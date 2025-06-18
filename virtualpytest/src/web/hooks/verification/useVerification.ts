import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';

// Define interfaces for verification data structures
interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Import unified types
import { Verification, Verifications } from '../../types/verification/VerificationTypes';

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

interface DetectedTextData {
  text: string;
  fontSize: number;
  confidence: number;
  detectedLanguage?: string;
  detectedLanguageName?: string;
  languageConfidence?: number;
}

interface ImageProcessingOptions {
  autocrop: boolean;
  removeBackground: boolean;
}

interface SelectedReferenceInfo {
  name: string;
  type: 'image' | 'text';
}

interface UseVerificationProps {
  isVisible: boolean;
  selectedHost: Host;
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  screenshotPath?: string;
  isCaptureActive?: boolean;
}

export const useVerification = ({
  isVisible,
  selectedHost,
  captureSourcePath,
  selectedArea,
  onAreaSelected: _onAreaSelected,
  onClearSelection: _onClearSelection,
  screenshotPath,
  isCaptureActive,
}: UseVerificationProps) => {
  // State for verification types and verifications
  const [availableVerificationTypes, setAvailableVerificationTypes] = useState<Verifications>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<VerificationTestResult[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // State for reference capture
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [referenceSaveCounter, setReferenceSaveCounter] = useState<number>(0);

  // State for reference type and details
  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceType, setReferenceType] = useState<'image' | 'text'>('image');
  const [detectedTextData, setDetectedTextData] = useState<DetectedTextData | null>(null);
  const [textImageFilter, setTextImageFilter] = useState<'none' | 'greyscale' | 'binary'>('none');

  // State for selected reference image preview
  const [selectedReferenceImage, setSelectedReferenceImage] = useState<string | null>(null);
  const [selectedReferenceInfo, setSelectedReferenceInfo] = useState<SelectedReferenceInfo | null>(
    null,
  );

  // Image processing options for capture only
  const [imageProcessingOptions, setImageProcessingOptions] = useState<ImageProcessingOptions>({
    autocrop: false,
    removeBackground: false,
  });

  // Collapsible sections state
  const [verificationsCollapsed, setVerificationsCollapsed] = useState<boolean>(false);

  // Load verification types from host data when visible
  useEffect(() => {
    if (isVisible && selectedHost?.available_verification_types) {
      console.log('[@hook:useVerification] Loading verification types from host data');
      setAvailableVerificationTypes(selectedHost.available_verification_types);
      setError(null); // Clear any previous errors
    } else if (isVisible && selectedHost) {
      console.log(
        '[@hook:useVerification] No verification types available in host data - using empty object',
      );
      setAvailableVerificationTypes({});
      // Don't show error for missing verification types - they're optional
    }
  }, [isVisible, selectedHost?.available_verification_types]);

  // Effect to check if selectedHost is provided
  useEffect(() => {
    if (!selectedHost || !selectedHost.device_model || selectedHost.device_model.trim() === '') {
      console.error('[@hook:useVerification] Host device with model is required but not provided');
      setError('Host device with model is required for verification editor');
    } else {
      console.log(`[@hook:useVerification] Using model: ${selectedHost.device_model}`);
    }
  }, [selectedHost]);

  // Effect to clear success message after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle verifications change
  const handleVerificationsChange = useCallback((newVerifications: NodeVerification[]) => {
    setVerifications(newVerifications);
    // Clear test results when verifications change
    setTestResults([]);
  }, []);

  // Handle reference selection
  const handleReferenceSelected = useCallback(async (referenceName: string, referenceData: any) => {
    console.log('[@hook:useVerification] Reference selected:', referenceName, referenceData);
    // TODO: Implement with verification controller proxy
    // For now, just clear preview
    setSelectedReferenceImage(null);
    setSelectedReferenceInfo(null);
    setCapturedReferenceImage(null);
    setHasCaptured(false);
  }, []);

  // Handle capture reference
  const handleCaptureReference = useCallback(async () => {
    console.log('[@hook:useVerification] Capture reference requested');
    // TODO: Implement with verification controller proxy
    // For now, just mark as captured
    setHasCaptured(true);
  }, []);

  // Handle save reference
  const handleSaveReference = useCallback(async () => {
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
      console.log('[@hook:useVerification] Saving reference with data:', {
        name: referenceName,
        model: selectedHost.device_model,
        area: selectedArea,
        screenshot_path: screenshotPath,
      });

      // Determine the correct endpoint based on reference type
      const endpoint =
        referenceType === 'text'
          ? '/server/verification/text/save-text-reference'
          : '/server/verification/image/save-image-reference';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost, // Send full host object
          name: referenceName,
          model: selectedHost.device_model,
          area: selectedArea,
          screenshot_path: screenshotPath,
          referenceType: referenceType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useVerification] Reference saved successfully');
        setReferenceName('');

        // Trigger reload of available references
        setReferenceSaveCounter((prev) => prev + 1);
      } else {
        setError(result.error || 'Failed to save reference');
      }
    } catch (err: any) {
      console.error('[@hook:useVerification] Error saving reference:', err);
      setError(err.message || 'Failed to save reference');
    } finally {
      setPendingSave(false);
    }
  }, [selectedArea, screenshotPath, referenceName, selectedHost, referenceType]);

  // Handle test execution
  const handleTest = useCallback(
    async (event?: React.MouseEvent) => {
      // Prevent any default form submission behavior
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (verifications.length === 0) {
        console.log('[@hook:useVerification] No verifications to test');
        return;
      }

      console.log('[@hook:useVerification] === VERIFICATION TEST DEBUG ===');
      console.log(
        '[@hook:useVerification] Number of verifications before filtering:',
        verifications.length,
      );

      // Filter out empty/invalid verifications before testing
      const validVerifications = verifications.filter((verification, index) => {
        // Check if verification has an id (is configured)
        if (!verification.id || verification.id.trim() === '') {
          console.log(
            `[@hook:useVerification] Removing verification ${index}: No verification type selected`,
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
              `[@hook:useVerification] Removing verification ${index}: No image reference specified`,
            );
            return false;
          }
        } else if (verification.controller_type === 'text') {
          // Text verifications need text to search for
          const hasText = verification.inputValue && verification.inputValue.trim() !== '';
          if (!hasText) {
            console.log(
              `[@hook:useVerification] Removing verification ${index}: No text specified`,
            );
            return false;
          }
        } else if (verification.controller_type === 'adb') {
          // ADB verifications need search criteria
          const hasSearchTerm = verification.inputValue && verification.inputValue.trim() !== '';
          if (!hasSearchTerm) {
            console.log(
              `[@hook:useVerification] Removing verification ${index}: No search term specified`,
            );
            return false;
          }
        }

        // For other types, check if requiresInput is set and if so, validate accordingly
        if (verification.requiresInput) {
          const hasInput = verification.inputValue && verification.inputValue.trim() !== '';
          if (!hasInput) {
            console.log(
              `[@hook:useVerification] Removing verification ${index}: Required input missing`,
            );
            return false;
          }
        }

        return true;
      });

      // Update verifications list if any were filtered out
      if (validVerifications.length !== verifications.length) {
        console.log(
          `[@hook:useVerification] Filtered out ${verifications.length - validVerifications.length} empty verifications`,
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

      try {
        setLoading(true);
        setError(null);
        // Clear previous test results
        setTestResults([]);

        // Extract capture filename from captureSourcePath for specific capture selection
        let capture_filename = null;
        if (captureSourcePath) {
          // Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
          const url = new URL(captureSourcePath);
          const pathname = url.pathname;
          capture_filename = pathname.split('/').pop()?.split('?')[0]; // Get filename without query params
          console.log('[@hook:useVerification] Using specific capture:', capture_filename);
        }

        const batchPayload = {
          verifications: validVerifications, // Use filtered verifications
          model: selectedHost.device_model,
          node_id: 'verification-editor',
          tree_id: 'verification-tree',
          capture_filename: capture_filename, // Send specific capture filename
        };

        console.log('[@hook:useVerification] Batch execution payload:', batchPayload);

        const response = await fetch(`/server/verification/execution/execute-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            verifications: validVerifications,
            model: selectedHost.device_model,
            node_id: 'verification-editor',
          }),
        });

        const batchResult = await response.json();

        console.log('[@hook:useVerification] Raw batch result:', batchResult);

        // Process results if we have them, regardless of overall batch success
        if (batchResult.results && batchResult.results.length > 0) {
          console.log(
            '[@hook:useVerification] Processing batch results:',
            batchResult.results.length,
            'results',
          );

          // Process and set test results
          const processedResults: VerificationTestResult[] = batchResult.results.map(
            (result: any, index: number) => {
              const verification = validVerifications[index];

              console.log(`[@hook:useVerification] Processing result ${index}:`, result);
              console.log(
                `[@hook:useVerification] Corresponding verification ${index}:`,
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
                threshold: result.confidence || result.threshold,
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

              console.log(`[@hook:useVerification] Processed result ${index}:`, processedResult);
              return processedResult;
            },
          );

          console.log('[@hook:useVerification] Setting test results:', processedResults);
          setTestResults(processedResults);

          // Update verifications with results
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
          console.log('[@hook:useVerification] Batch execution failed with error:', errorMessage);
          setError(`Verification failed: ${errorMessage}`);
          // Clear test results on actual failure
          setTestResults([]);
        } else {
          // Fallback case - no results and no clear error
          console.log('[@hook:useVerification] No results received from batch execution');
          setError('No verification results received');
          setTestResults([]);
        }
      } catch (error: any) {
        console.error('[@hook:useVerification] Error running tests:', error);
        setError(
          `Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Clear test results on error
        setTestResults([]);
      } finally {
        setLoading(false);
      }
    },
    [verifications, selectedHost, captureSourcePath],
  );

  // Handle auto-detect text
  const handleAutoDetectText = useCallback(async () => {
    if (!selectedArea || !selectedHost.device_model) {
      console.log('[@hook:useVerification] Cannot auto-detect: missing area or model');
      return;
    }

    if (!captureSourcePath) {
      console.log('[@hook:useVerification] Cannot auto-detect: missing capture source path');
      return;
    }

    try {
      console.log('[@hook:useVerification] Starting text auto-detection in area:', selectedArea);

      const response = await fetch(`/server/verification/text/auto-detect-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost, // Send full host object
          model: selectedHost.device_model,
          area: selectedArea,
          source_path: captureSourcePath,
          image_filter: textImageFilter,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[@hook:useVerification] Text auto-detection successful:', result);

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

        // Mark as captured
        setHasCaptured(true);
      } else {
        console.error('[@hook:useVerification] Text auto-detection failed:', result.error);
      }
    } catch (error) {
      console.error('[@hook:useVerification] Error during text auto-detection:', error);
    }
  }, [selectedArea, selectedHost, captureSourcePath, textImageFilter]);

  // Validate regex
  const validateRegex = useCallback((text: string): boolean => {
    if (!text) return true; // Empty text is valid

    try {
      new RegExp(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Handle confirm overwrite
  const handleConfirmOverwrite = useCallback(async () => {
    setShowConfirmDialog(false);
    await handleSaveReference();
  }, [handleSaveReference]);

  // Handle cancel overwrite
  const handleCancelOverwrite = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Calculate if capture is possible
  const canCapture = selectedArea;

  // Calculate if save is possible
  const canSave = (() => {
    if (
      !referenceName.trim() ||
      !selectedArea ||
      !selectedHost.device_model ||
      selectedHost.device_model.trim() === ''
    ) {
      return false;
    }

    if (referenceType === 'image') {
      return hasCaptured; // Image type requires capture
    } else if (referenceType === 'text') {
      return referenceText.trim() !== '' && validateRegex(referenceText); // Text type requires valid text/regex
    }

    return false;
  })();

  // Calculate if selection is allowed
  const allowSelection = !isCaptureActive && captureSourcePath;

  // Handle type change
  const handleReferenceTypeChange = useCallback((newType: 'image' | 'text') => {
    setReferenceType(newType);
    // Reset related states when switching types
    if (newType === 'text') {
      setReferenceText('');
      setDetectedTextData(null);
      // Reset image processing options when switching to text
      setImageProcessingOptions({ autocrop: false, removeBackground: false });
    } else {
      // Use _setTempReferenceUrl instead of setTempReferenceUrl
      // setTempReferenceUrl('');
    }
  }, []);

  return {
    // State
    availableVerificationTypes,
    verifications,
    loading,
    error,
    referenceName,
    capturedReferenceImage,
    hasCaptured,
    successMessage,
    showConfirmDialog,
    pendingSave,
    testResults,
    referenceText,
    referenceType,
    detectedTextData,
    textImageFilter,
    referenceSaveCounter,
    imageProcessingOptions,
    selectedReferenceImage,
    selectedReferenceInfo,
    canCapture,
    canSave,
    allowSelection,
    selectedHost,
    verificationsCollapsed,

    // Setters
    setReferenceName,
    setCapturedReferenceImage,
    setHasCaptured,
    setSuccessMessage,
    setShowConfirmDialog,
    setPendingSave,
    setReferenceText,
    setTextImageFilter,
    setImageProcessingOptions,
    setVerificationsCollapsed,

    // Handlers
    handleVerificationsChange,
    handleReferenceSelected,
    handleCaptureReference,
    handleSaveReference,
    handleTest,
    handleAutoDetectText,
    validateRegex,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    handleReferenceTypeChange,
  };
};

export type UseVerificationType = ReturnType<typeof useVerification>;
