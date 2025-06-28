import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { Verification } from '../../types/verification/Verification_Types';
import { useDeviceData } from '../../contexts/device/DeviceDataContext';

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
  // Get verification types from centralized context
  const { verificationTypes, getVerificationTypes } = useDeviceData();

  // State for verification execution (not data fetching)
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Verification[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setTestResults([]);
  }, []);

  // Handle test execution
  const handleTest = useCallback(
    async (event?: React.MouseEvent) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (verifications.length === 0) {
        console.log('[useVerification] No verifications to test');
        return;
      }

      console.log('[useVerification] === VERIFICATION TEST DEBUG ===');
      console.log(
        '[useVerification] Number of verifications before filtering:',
        verifications.length,
      );

      // Filter out empty/invalid verifications before testing
      const validVerifications = verifications.filter((verification, index) => {
        if (!verification.command || verification.command.trim() === '') {
          console.log(
            `[useVerification] Removing verification ${index}: No verification type selected`,
          );
          return false;
        }

        if (verification.verification_type === 'image') {
          const hasImagePath = verification.params?.image_path;
          if (!hasImagePath) {
            console.log(
              `[useVerification] Removing verification ${index}: No image reference specified`,
            );
            return false;
          }
        } else if (verification.verification_type === 'text') {
          const hasText = verification.params?.text && verification.params.text.trim() !== '';
          if (!hasText) {
            console.log(`[useVerification] Removing verification ${index}: No text specified`);
            return false;
          }
        } else if (verification.verification_type === 'adb') {
          const hasSearchTerm =
            verification.params?.search_term && verification.params.search_term.trim() !== '';
          if (!hasSearchTerm) {
            console.log(
              `[useVerification] Removing verification ${index}: No search term specified`,
            );
            return false;
          }
        }

        return true;
      });

      // Update verifications list if any were filtered out
      if (validVerifications.length !== verifications.length) {
        console.log(
          `[useVerification] Filtered out ${verifications.length - validVerifications.length} empty verifications`,
        );
        setVerifications(validVerifications);

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
          const url = new URL(captureSourcePath);
          const pathname = url.pathname;
          capture_filename = pathname.split('/').pop();
          console.log('[useVerification] Using specific capture:', capture_filename);
        }

        console.log('[useVerification] Submitting batch verification request');
        console.log('[useVerification] Valid verifications count:', validVerifications.length);

        const device = selectedHost?.devices?.find((d) => d.device_id === deviceId);

        const batchPayload = {
          verifications: validVerifications,
          model: device?.device_model || 'unknown',
          node_id: 'verification-editor',
          tree_id: 'verification-tree',
          capture_filename: capture_filename,
        };

        console.log('[useVerification] Batch payload:', batchPayload);

        const response = await fetch('/server/verification/execute_batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost,
            device_id: deviceId,
            ...batchPayload,
          }),
        });

        console.log(
          `[useVerification] Fetching from: /server/verification/execute_batch with host: ${selectedHost?.host_name} and device: ${deviceId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[useVerification] Batch test result:', result);

        if (result.success) {
          setTestResults(result.results || []);
          console.log('[useVerification] Test results set:', result.results);

          const passedCount = result.passed_count || 0;
          const totalCount = result.total_count || 0;
          setSuccessMessage(`Verification completed: ${passedCount}/${totalCount} passed`);
        } else {
          const passedCount = result.passed_count || 0;
          const totalCount = result.total_count || 0;
          setSuccessMessage(`Test completed: ${passedCount}/${totalCount} passed`);
        }
      } catch (error) {
        console.error('[useVerification] Error during verification test:', error);
        setError(error instanceof Error ? error.message : 'Unknown error during verification test');
      } finally {
        setLoading(false);
      }
    },
    [verifications, selectedHost, deviceId, captureSourcePath],
  );

  return {
    verificationTypes: getVerificationTypes(deviceId || undefined), // Get from context
    availableVerificationTypes: getVerificationTypes(deviceId || undefined), // Alias for compatibility
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
