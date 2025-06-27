import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { Verification } from '../../types/verification/VerificationTypes';

// Define interfaces for verification data structures

interface UseVerificationProps {
  selectedHost: Host | null;
  deviceId?: string | null;
  captureSourcePath?: string; // TODO: Rename to image_source_url
}

export const useVerification = ({
  selectedHost,
  deviceId,
  captureSourcePath,
}: UseVerificationProps) => {
  // State for verification types and verifications
  const [verificationTypes, setVerificationTypes] = useState<Record<string, any>>({});
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Verification[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load verification types from selected device data and clean parameter definitions
  useEffect(() => {
    // Get verification types from the selected device
    const device = selectedHost?.devices?.find((d) => d.device_id === deviceId);
    const deviceVerificationTypes = device?.device_verification_types;

    if (deviceVerificationTypes) {
      console.log(
        '🔍 [useVerification] Loading verification types from device:',
        deviceVerificationTypes,
      );
      console.log(
        '🔍 [useVerification] Device verification types keys:',
        Object.keys(deviceVerificationTypes),
      );
      console.log(
        '🔍 [useVerification] Device verification types structure:',
        JSON.stringify(deviceVerificationTypes, null, 2),
      );

      // Transform the verification types into the format expected by the UI
      const transformedTypes: Record<string, any> = {};

      Object.entries(deviceVerificationTypes).forEach(([verType, verConfig]: [string, any]) => {
        console.log(`🔄 [useVerification] Processing verification type: ${verType}`, verConfig);

        if (!Array.isArray(verConfig)) {
          console.error(
            `❌ [useVerification] Expected array for ${verType}, got:`,
            typeof verConfig,
          );
          return;
        }

        transformedTypes[verType] = verConfig.map((verification: any) => {
          const transformed = {
            command: verification.command || verification.type,
            verification_type: verType,
            params: {} as Record<string, any>,
          };

          if (verification.params && typeof verification.params === 'object') {
            transformed.params = verification.params;
          } else if (verification.parameters && Array.isArray(verification.parameters)) {
            verification.parameters.forEach((paramName: string) => {
              transformed.params[paramName] = '';
            });
          }

          console.log(`✅ [useVerification] Transformed verification:`, transformed);
          return transformed;
        });
      });

      setVerificationTypes(transformedTypes);
      console.log('✅ [useVerification] Transformed verification types:', transformedTypes);
      console.log(
        '✅ [useVerification] Transformed verification types keys:',
        Object.keys(transformedTypes),
      );
      console.log(
        '✅ [useVerification] Transformed verification types structure:',
        JSON.stringify(transformedTypes, null, 2),
      );
    } else {
      console.log('⚠️ [useVerification] No device verification types found for device:', deviceId);
      setVerificationTypes({});
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
          model: device?.device_model || 'unknown',
          node_id: 'verification-editor',
          tree_id: 'verification-tree',
          capture_filename: capture_filename, // Send specific capture filename
        };

        console.log('[@hook:useVerification] Batch payload:', batchPayload);

        const response = await fetch('/server/verification/execute_batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            device_id: deviceId, // Send device ID
            ...batchPayload,
          }),
        });

        console.log(
          `[@hook:useVerification] Fetching from: /server/verification/execute_batch with host: ${selectedHost?.host_name} and device: ${deviceId}`,
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
    verificationTypes,
    availableVerificationTypes: verificationTypes, // Alias for compatibility
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
