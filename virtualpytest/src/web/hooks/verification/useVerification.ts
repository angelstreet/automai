import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { Verifications, Verification } from '../../types/verification/VerificationTypes';

// Define interfaces for verification data structures

interface UseVerificationProps {
  selectedHost: Host;
  captureSourcePath?: string;
}

export const useVerification = ({ selectedHost, captureSourcePath }: UseVerificationProps) => {
  // State for verification types and verifications
  const [availableVerificationTypes, setAvailableVerificationTypes] = useState<Verifications>({});
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Verification[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load verification types from host data and clean parameter definitions
  useEffect(() => {
    if (selectedHost?.available_verification_types) {
      console.log('[@hook:useVerification] Loading verification types from host data');

      // Clean parameter definitions in available verification types
      const cleanedVerificationTypes: Verifications = {};
      Object.entries(selectedHost.available_verification_types).forEach(
        ([controllerType, verifications]) => {
          if (Array.isArray(verifications)) {
            cleanedVerificationTypes[controllerType] = verifications.map((verification: any) => {
              if (!verification.params) return verification;

              const cleanParams: any = {};
              Object.entries(verification.params).forEach(([key, value]: [string, any]) => {
                if (typeof value === 'object' && value !== null && 'default' in value) {
                  // Extract default value from parameter definition
                  cleanParams[key] = value.default;
                } else {
                  // Keep actual values as-is
                  cleanParams[key] = value;
                }
              });

              // Add verification_type based on controller type
              let verification_type: 'text' | 'image' | 'adb' = 'text';
              if (controllerType.toLowerCase().includes('image')) {
                verification_type = 'image';
              } else if (controllerType.toLowerCase().includes('adb')) {
                verification_type = 'adb';
              }

              return {
                command: verification.command,
                params: cleanParams,
                verification_type,
              } as Verification;
            });
          } else {
            cleanedVerificationTypes[controllerType] = verifications as Verification[];
          }
        },
      );

      setAvailableVerificationTypes(cleanedVerificationTypes);
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
  const handleVerificationsChange = useCallback((newVerifications: Verification[]) => {
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
        // Check if verification has a command (is configured)
        if (!verification.command || verification.command.trim() === '') {
          console.log(
            `[@hook:useVerification] Removing verification ${index}: No verification type selected`,
          );
          return false;
        }

        // Check if verification has required input based on verification type
        if (verification.verification_type === 'image') {
          // Image verifications need a reference image
          const hasImagePath = verification.params?.image_path;
          if (!hasImagePath) {
            console.log(
              `[@hook:useVerification] Removing verification ${index}: No image reference specified`,
            );
            return false;
          }
        } else if (verification.verification_type === 'text') {
          // Text verifications need text to search for
          const hasText = verification.params?.text && verification.params.text.trim() !== '';
          if (!hasText) {
            console.log(
              `[@hook:useVerification] Removing verification ${index}: No text specified`,
            );
            return false;
          }
        } else if (verification.verification_type === 'adb') {
          // ADB verifications need search criteria
          const hasSearchTerm =
            verification.params?.search_term && verification.params.search_term.trim() !== '';
          if (!hasSearchTerm) {
            console.log(
              `[@hook:useVerification] Removing verification ${index}: No search term specified`,
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
            verifications: validVerifications, // Send verifications directly since params are already clean
            source_filename: capture_filename, // Include the extracted capture filename
          }),
        });

        const batchResult = await response.json();

        console.log('[@hook:useVerification] Raw batch result:', batchResult);
        console.log(
          '[@hook:useVerification] Response status:',
          response.status,
          response.statusText,
        );
        console.log('[@hook:useVerification] Batch result keys:', Object.keys(batchResult));
        console.log('[@hook:useVerification] Batch result.results:', batchResult.results);
        console.log('[@hook:useVerification] Batch result.success:', batchResult.success);
        console.log('[@hook:useVerification] Batch result.error:', batchResult.error);

        // Process results if we have them, regardless of overall batch success
        if (batchResult.results && batchResult.results.length > 0) {
          console.log(
            '[@hook:useVerification] Processing batch results:',
            batchResult.results.length,
            'results',
          );

          // Process and set test results
          const processedResults: Verification[] = batchResult.results.map(
            (result: any, index: number) => {
              const verification = validVerifications[index];

              console.log(`[@hook:useVerification] Processing result ${index}:`, result);
              console.log(
                `[@hook:useVerification] Corresponding verification ${index}:`,
                verification,
              );

              // Results are now flattened by the server batch coordination route
              const actualSuccess = result.success || false;

              // Use the resultType from server or determine based on success/error
              let resultType: 'PASS' | 'FAIL' | 'ERROR' = result.resultType || 'FAIL';
              if (!result.resultType) {
                if (actualSuccess) {
                  resultType = 'PASS';
                } else if (result.error && !result.message) {
                  resultType = 'ERROR';
                }
              }

              const processedResult: Verification = {
                // Core verification data
                command: verification.command,
                params: verification.params,
                verification_type: verification.verification_type,

                // Result data from server response
                success: actualSuccess,
                message: result.message,
                error: result.error,
                threshold: result.threshold,
                resultType: resultType,
                sourceImageUrl: result.sourceImageUrl,
                referenceImageUrl: result.referenceImageUrl,
                extractedText: result.extractedText,
                searchedText: result.searchedText,
                imageFilter: result.imageFilter,
                detectedLanguage: result.detectedLanguage,
                languageConfidence: result.languageConfidence,
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
