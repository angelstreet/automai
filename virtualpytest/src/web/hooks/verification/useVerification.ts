import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { Verifications, Verification } from '../../types/verification/VerificationTypes';

// Define interfaces for verification data structures

interface UseVerificationProps {
  selectedHost: Host | null;
  deviceId: string | null;
  captureSourcePath?: string;
}

export const useVerification = ({
  selectedHost,
  deviceId,
  captureSourcePath,
}: UseVerificationProps) => {
  // State for verification types and verifications
  const [availableVerificationTypes, setAvailableVerificationTypes] = useState<Verifications>({});
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Verification[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load verification types from selected device data and clean parameter definitions
  useEffect(() => {
    // Get verification types from the selected device
    const device = selectedHost?.devices?.find((d) => d.device_id === deviceId);
    const deviceVerificationTypes = device?.available_verification_types;

    if (deviceVerificationTypes) {
      console.log('[@hook:useVerification] Loading verification types from device data');

      // Clean parameter definitions in available verification types
      const cleanedVerificationTypes: Verifications = {};
      Object.entries(deviceVerificationTypes).forEach(([controllerType, verifications]) => {
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
      });

      setAvailableVerificationTypes(cleanedVerificationTypes);
      setError(null); // Clear any previous errors
    } else if (selectedHost && deviceId) {
      console.log(
        '[@hook:useVerification] No verification types available in device data - using empty object',
      );
      setAvailableVerificationTypes({});
      // Don't show error for missing verification types - they're optional
    }
  }, [selectedHost, deviceId]);

  // Effect to check if selectedHost and deviceId are provided
  useEffect(() => {
    const device = selectedHost?.devices?.find((d) => d.device_id === deviceId);
    if (!selectedHost || !deviceId || !device?.model || device.model.trim() === '') {
      console.error(
        '[@hook:useVerification] Host, device ID, and device with model are required but not provided',
      );
      setError('Host, device ID, and device with model are required for verification');
    } else {
      console.log(`[@hook:useVerification] Using model: ${device.model}`);
    }
  }, [selectedHost, deviceId]);

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
          capture_filename = pathname.split('/').pop(); // Get the filename
          console.log('[@hook:useVerification] Using specific capture:', capture_filename);
        }

        console.log('[@hook:useVerification] Submitting batch verification request');
        console.log(
          '[@hook:useVerification] Valid verifications count:',
          validVerifications.length,
        );

        const device = selectedHost?.devices?.find((d) => d.device_id === deviceId);

        const batchPayload = {
          verifications: validVerifications, // Use filtered verifications
          model: device?.model || 'unknown',
          node_id: 'verification-editor',
          tree_id: 'verification-tree',
          capture_filename: capture_filename, // Send specific capture filename
        };

        console.log('[@hook:useVerification] Batch payload:', batchPayload);

        const response = await fetch('/server/verification/batch/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            device_id: deviceId, // Send device ID
            ...batchPayload,
          }),
        });

        console.log(
          `[@hook:useVerification] Fetching from: /server/verification/batch/test with host: ${selectedHost?.host_name} and device: ${deviceId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[@hook:useVerification] Batch test result:', result);

        if (result.success) {
          // Update results with tested verifications
          const resultsWithStatus = validVerifications.map((verification, index) => ({
            ...verification,
            status: result.results?.[index]?.success ? 'passed' : 'failed',
            result_message: result.results?.[index]?.message || 'No message',
            execution_time: result.results?.[index]?.execution_time || 0,
          }));

          setTestResults(resultsWithStatus);
          console.log('[@hook:useVerification] Test results set:', resultsWithStatus);

          // Show summary message
          const passedCount = result.results?.filter((r: any) => r.success).length || 0;
          const totalCount = result.results?.length || 0;
          setSuccessMessage(`Verification completed: ${passedCount}/${totalCount} passed`);
        } else {
          setError(result.error || 'Verification test failed');
        }
      } catch (error) {
        console.error('[@hook:useVerification] Error during verification test:', error);
        setError(error instanceof Error ? error.message : 'Unknown error during verification test');
      } finally {
        setLoading(false);
      }
    },
    [verifications, selectedHost, deviceId, captureSourcePath],
  );

  return {
    availableVerificationTypes,
    verifications,
    loading,
    error,
    testResults,
    successMessage,
    handleVerificationsChange,
    handleTest,
    selectedHost,
    deviceId,
  };
};

export type UseVerificationType = ReturnType<typeof useVerification>;
