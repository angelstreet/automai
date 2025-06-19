import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { Verifications, NodeVerification } from '../../types/verification/VerificationTypes';

// Define interfaces for verification data structures
interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
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

interface UseVerificationProps {
  selectedHost: Host;
  captureSourcePath?: string;
}

export const useVerification = ({ selectedHost, captureSourcePath }: UseVerificationProps) => {
  // State for verification types and verifications
  const [availableVerificationTypes, setAvailableVerificationTypes] = useState<Verifications>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<VerificationTestResult[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load verification types from host data
  useEffect(() => {
    if (selectedHost?.available_verification_types) {
      console.log('[@hook:useVerification] Loading verification types from host data');
      setAvailableVerificationTypes(selectedHost.available_verification_types);
      setError(null); // Clear any previous errors
    } else if (selectedHost) {
      console.log(
        '[@hook:useVerification] No verification types available in host data - using empty object',
      );
      setAvailableVerificationTypes({});
      // Don't show error for missing verification types - they're optional
    }
  }, [selectedHost, selectedHost?.available_verification_types]);

  // Effect to check if selectedHost is provided
  useEffect(() => {
    if (!selectedHost || !selectedHost.device_model || selectedHost.device_model.trim() === '') {
      console.error('[@hook:useVerification] Host device with model is required but not provided');
      setError('Host device with model is required for verification');
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
          const filename = pathname.split('/').pop()?.split('?')[0]; // Get filename without query params

          // Use just the filename - server will look in captures directory
          // Original screenshots are stored in /var/www/html/stream/captures/
          capture_filename = filename;

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

        const response = await fetch(`/server/verification/batch/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            verifications: validVerifications.map((verification) => {
              // Transform parameter definitions into actual values
              const cleanParams: any = {};

              // Extract actual values from parameter definitions
              if (verification.params) {
                Object.entries(verification.params).forEach(([key, value]: [string, any]) => {
                  if (typeof value === 'object' && value !== null && 'default' in value) {
                    // Extract default value from parameter definition
                    cleanParams[key] = value.default;
                  } else {
                    // Keep actual values as-is
                    cleanParams[key] = value;
                  }
                });
              }

              // For image verifications, ensure image_path is set correctly
              if (
                verification.controller_type === 'image' &&
                verification.params?.reference_image
              ) {
                cleanParams.image_path = verification.params.reference_image;
                return {
                  ...verification,
                  params: cleanParams,
                  reference_filename: verification.params.reference_image,
                };
              }

              // For text verifications, ensure text is set from inputValue
              if (verification.controller_type === 'text' && verification.inputValue) {
                cleanParams.text = verification.inputValue;
              }

              return {
                ...verification,
                params: cleanParams,
              };
            }),
            source_filename: capture_filename, // Include the extracted capture filename
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

              // Extract actual verification result from nested structure
              const actualResult = result.verification_result || result;
              const actualSuccess = actualResult.success || false;

              // Determine result type based on actual verification result
              let resultType: 'PASS' | 'FAIL' | 'ERROR' = 'FAIL';
              if (actualSuccess) {
                resultType = 'PASS';
              } else if (actualResult.error && !actualResult.message) {
                resultType = 'ERROR';
              }

              const processedResult: VerificationTestResult = {
                success: actualSuccess,
                message: actualResult.message || result.message,
                error: actualResult.error || result.error,
                threshold:
                  actualResult.confidence ||
                  actualResult.threshold ||
                  result.confidence ||
                  result.threshold,
                resultType: resultType,
                sourceImageUrl: actualResult.source_image_url || result.sourceImageUrl,
                referenceImageUrl: actualResult.reference_image_url || result.referenceImageUrl,
                extractedText: actualResult.extracted_text || result.extracted_text,
                searchedText: actualResult.searched_text || result.searched_text,
                imageFilter: actualResult.image_filter || result.image_filter,
                detectedLanguage: actualResult.detected_language || result.detected_language,
                languageConfidence: actualResult.language_confidence || result.language_confidence,
                // Add ADB-specific fields
                search_term: actualResult.search_term || result.search_term,
                wait_time: actualResult.wait_time || result.wait_time,
                total_matches: actualResult.total_matches || result.total_matches,
                matches: actualResult.matches || result.matches,
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

  return {
    // State
    availableVerificationTypes,
    verifications,
    loading,
    error,
    testResults,
    successMessage,
    selectedHost,

    // Setters
    setSuccessMessage,

    // Handlers
    handleVerificationsChange,
    handleTest,
  };
};

export type UseVerificationType = ReturnType<typeof useVerification>;
