import { useState, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';
import { NodeForm } from '../../types/pages/Navigation_Types';
import { Verification } from '../../types/verification/VerificationTypes';

interface UseNodeOperationsProps {
  selectedHost?: Host;
  isControlActive?: boolean;
  nodeForm?: NodeForm;
  selectedDeviceId?: string;
}

interface ExecutionRecord {
  execution_category: string;
  execution_type: string;
  initiator_type: string;
  initiator_id: string;
  initiator_name: string;
  host_name: string;
  device_model: string;
  command: string;
  parameters: any;
  execution_order: number;
  success: boolean;
  execution_time_ms?: number;
  message: string;
  error_details?: any;
  image_source_url?: string;
  source_filename?: string; // Backward compatibility
  confidence_score?: number;
}

export const useNodeOperations = ({
  selectedHost,
  isControlActive,
  nodeForm,
  selectedDeviceId,
}: UseNodeOperationsProps) => {
  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [gotoResult, setGotoResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Utility function for delays
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper to get device model from host and selected device
  const getDeviceModel = useCallback(() => {
    if (!selectedHost) return 'unknown';

    // This hook should receive selectedDeviceId from context - no fallbacks allowed
    if (!selectedHost.devices || selectedHost.devices.length === 0) {
      throw new Error('No devices available in selected host');
    }

    // Find the specific device by device_id - no fallbacks
    const selectedDevice = selectedHost.devices.find(
      (device) => device.device_id === selectedDeviceId,
    );

    if (!selectedDevice) {
      throw new Error(`Device ${selectedDeviceId} not found in host ${selectedHost.host_name}`);
    }

    return selectedDevice.device_model || 'unknown';
  }, [selectedHost, selectedDeviceId]);

  // Handle successful save
  const handleSaveSuccess = useCallback(() => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }, []);

  // Run goto operation for a node
  const runGoto = useCallback(
    async (verifications: Verification[] = []) => {
      if (!isControlActive || !selectedHost || !nodeForm) {
        return { success: false, message: 'Device control not active or host not selected' };
      }

      setIsRunningGoto(true);
      setGotoResult(null);

      try {
        let gotoResults: string[] = [];
        let navigationSuccess = false;

        const executionRecords: ExecutionRecord[] = [];
        let executionOrder = 1;

        // Get device model
        const deviceModel = getDeviceModel();

        // Step 1: Execute Navigation Steps
        gotoResults.push('🚀 Starting navigation to node...');
        console.log(
          `[@hook:useNodeOperations] Starting goto navigation for node: ${nodeForm?.label || 'unknown'}`,
        );

        try {
          // Execute navigation to this node using server route
          if (!selectedHost) {
            gotoResults.push(`❌ Navigation: No host device selected`);
            console.error(`[@hook:useNodeOperations] No host device selected for navigation`);
          } else {
            // Use server route instead of navigation controller proxy
            const startTime = Date.now();

            const response = await fetch(`/server/navigation/goto-node`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                host_name: selectedHost.host_name,
                device_id: selectedDeviceId, // Server extracts device_model from this
                node_label: nodeForm?.label || '',
              }),
            });

            const navigationResult = await response.json();
            const navigationTime = Date.now() - startTime;

            // Record navigation execution to database
            const navigationRecord: ExecutionRecord = {
              execution_category: 'navigation',
              execution_type: 'goto_navigation',
              initiator_type: 'node',
              initiator_id: nodeForm?.id || 'unknown',
              initiator_name: nodeForm?.label || 'Unknown Node',
              host_name: selectedHost.host_name,
              device_model: deviceModel,
              command: `goto ${nodeForm?.label || 'unknown'}`,
              parameters: {
                host_name: selectedHost.host_name,
                node_label: nodeForm?.label,
                model: deviceModel,
              },
              execution_order: executionOrder++,
              success: navigationResult.success,
              execution_time_ms: navigationTime,
              message: navigationResult.success
                ? 'Navigation completed'
                : navigationResult.error || 'Navigation failed',
              error_details: navigationResult.success
                ? undefined
                : { error: navigationResult.error },
            };

            executionRecords.push(navigationRecord);

            if (navigationResult.success) {
              gotoResults.push(
                `✅ Navigation: Successfully reached ${nodeForm?.label || 'unknown'}`,
              );
              navigationSuccess = true;
              console.log(`[@hook:useNodeOperations] Navigation successful`);
            } else {
              gotoResults.push(
                `❌ Navigation: ${navigationResult.error || 'Failed to reach node'}`,
              );
              console.error(`[@hook:useNodeOperations] Navigation failed:`, navigationResult.error);
            }
          }
        } catch (err: any) {
          gotoResults.push(`❌ Navigation: ${err.message || 'Network error'}`);
          console.error('[@hook:useNodeOperations] Navigation error:', err);

          // Record failed navigation
          const failedNavigationRecord: ExecutionRecord = {
            execution_category: 'navigation',
            execution_type: 'goto_navigation',
            initiator_type: 'node',
            initiator_id: nodeForm?.id || 'unknown',
            initiator_name: nodeForm?.label || 'Unknown Node',
            host_name: selectedHost?.host_name || 'unknown',
            device_model: deviceModel,
            command: `goto ${nodeForm?.label || 'unknown'}`,
            parameters: {
              host_name: selectedHost?.host_name,
              node_label: nodeForm?.label,
              model: deviceModel,
            },
            execution_order: executionOrder++,
            success: false,
            message: err.message || 'Network error',
            error_details: { error: err.message },
          };

          executionRecords.push(failedNavigationRecord);
        }

        // Step 2: Execute Verifications (only if navigation succeeded)
        let verificationSuccess = true;

        if (navigationSuccess && verifications && verifications.length > 0) {
          gotoResults.push('\n🔍 Running node verifications...');
          console.log(
            `[@hook:useNodeOperations] Starting verifications after successful navigation`,
          );

          // Small delay before verifications
          await delay(1500);

          for (let i = 0; i < verifications.length; i++) {
            const verificationItem = verifications[i];

            if (!verificationItem.command) {
              gotoResults.push(`❌ Verification ${i + 1}: No verification selected`);
              verificationSuccess = false;

              // Record failed verification
              const failedVerificationRecord: ExecutionRecord = {
                execution_category: 'verification',
                execution_type:
                  verificationItem.verification_type === 'adb'
                    ? 'adb_verification'
                    : `${verificationItem.verification_type || 'image'}_verification`,
                initiator_type: 'node',
                initiator_id: nodeForm?.id || 'unknown',
                initiator_name: nodeForm?.label || 'Unknown Node',
                host_name: selectedHost?.host_name || 'unknown',
                device_model: deviceModel,
                command: 'No verification selected',
                parameters: verificationItem.params || {},
                execution_order: executionOrder++,
                success: false,
                message: 'No verification selected',
                error_details: { error: 'No verification command configured' },
              };

              executionRecords.push(failedVerificationRecord);
              continue;
            }

            console.log(
              `[@hook:useNodeOperations] Executing verification ${i + 1}/${verifications.length}: ${verificationItem.command}`,
            );

            const verificationToExecute = {
              ...verificationItem,
              params: { ...verificationItem.params },
            };

            let individualVerificationSuccess = false;
            let capture_filename = null; // Declare in proper scope
            const startTime = Date.now(); // Declare in proper scope

            try {
              if (!selectedHost) {
                gotoResults.push(`❌ Verification ${i + 1}: No host device selected`);
                verificationSuccess = false;
                individualVerificationSuccess = false;
              } else {
                // Step 1: Take screenshot first (same as NodeSelectionPanel and editor pattern)
                console.log('[@hook:useNodeOperations] Taking screenshot for verification...');

                const screenshotResponse = await fetch('/server/av/take-screenshot', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ host: selectedHost }),
                });

                const screenshotResult = await screenshotResponse.json();

                if (!screenshotResult.success || !screenshotResult.screenshot_url) {
                  gotoResults.push(`❌ Verification ${i + 1}: Failed to capture screenshot`);
                  verificationSuccess = false;
                  individualVerificationSuccess = false;
                  continue;
                }

                // Extract filename from screenshot URL exactly like the editor does
                const screenshotUrl = screenshotResult.screenshot_url;

                try {
                  // Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
                  // or "https://host/captures/tmp/screenshot.jpg"
                  const url = new URL(screenshotUrl);
                  const pathname = url.pathname;
                  const filename = pathname.split('/').pop()?.split('?')[0]; // Get filename without query params
                  capture_filename = filename;

                  console.log('[@hook:useNodeOperations] Extracted filename from URL:', {
                    screenshotUrl,
                    pathname,
                    capture_filename,
                  });
                } catch {
                  // Fallback: extract filename directly from URL string
                  capture_filename = screenshotUrl.split('/').pop()?.split('?')[0];
                  console.log(
                    '[@hook:useNodeOperations] Fallback filename extraction:',
                    capture_filename,
                  );
                }

                if (!capture_filename) {
                  gotoResults.push(
                    `❌ Verification ${i + 1}: Failed to extract filename from screenshot URL`,
                  );
                  verificationSuccess = false;
                  individualVerificationSuccess = false;
                  continue;
                }

                console.log('[@hook:useNodeOperations] Using capture filename:', capture_filename);

                // Step 2: Execute verification using the same pattern as the editor
                const response = await fetch(`/server/verification/batch/execute`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    host: selectedHost, // Use full host object (same as editor)
                    verifications: [verificationToExecute], // Send verifications directly (same as editor)
                    image_source_url: capture_filename, // Use extracted filename (same as editor)
                    source_filename: capture_filename, // Backward compatibility
                  }),
                });

                const result = await response.json();
                const verificationTime = Date.now() - startTime;

                console.log('[@hook:useNodeOperations] Verification batch result:', result);
                console.log(
                  '[@hook:useNodeOperations] Verification result keys:',
                  Object.keys(result),
                );
                console.log('[@hook:useNodeOperations] Verification results:', result.results);

                // Process results exactly like the editor does
                if (result.results && result.results.length > 0) {
                  const verificationResult = result.results[0]; // We sent only one verification

                  // Record verification execution to database
                  const verificationRecord: ExecutionRecord = {
                    execution_category: 'verification',
                    execution_type:
                      verificationItem.verification_type === 'adb'
                        ? 'adb_verification'
                        : `${verificationItem.verification_type || 'image'}_verification`,
                    initiator_type: 'node',
                    initiator_id: nodeForm?.id || 'unknown',
                    initiator_name: nodeForm?.label || 'Unknown Node',
                    host_name: selectedHost.host_name,
                    device_model: deviceModel,
                    command: verificationItem.command,
                    parameters: verificationItem.params || {},
                    image_source_url: capture_filename,
                    source_filename: capture_filename, // Backward compatibility
                    execution_order: executionOrder++,
                    success: verificationResult.success,
                    execution_time_ms: verificationTime,
                    message: verificationResult.message || verificationResult.error,
                    error_details: verificationResult.success
                      ? undefined
                      : { error: verificationResult.error },
                    confidence_score:
                      verificationResult.confidence_score || verificationResult.threshold,
                  };

                  executionRecords.push(verificationRecord);

                  if (verificationResult.success) {
                    gotoResults.push(
                      `✅ Verification ${i + 1}: ${verificationResult.message || 'Success'}`,
                    );
                    individualVerificationSuccess = true;
                  } else {
                    gotoResults.push(
                      `❌ Verification ${i + 1}: ${verificationResult.error || verificationResult.message || 'Failed'}`,
                    );
                    verificationSuccess = false;
                    individualVerificationSuccess = false;
                  }
                } else if (result.success === false && result.error) {
                  // Only treat as error if there's an actual error and no results (same as editor)
                  const errorMessage = result.message || result.error || 'Unknown error occurred';
                  console.log(
                    '[@hook:useNodeOperations] Batch execution failed with error:',
                    errorMessage,
                  );
                  gotoResults.push(`❌ Verification ${i + 1}: ${errorMessage}`);
                  verificationSuccess = false;
                  individualVerificationSuccess = false;

                  // Record failed verification
                  const failedVerificationRecord: ExecutionRecord = {
                    execution_category: 'verification',
                    execution_type:
                      verificationItem.verification_type === 'adb'
                        ? 'adb_verification'
                        : `${verificationItem.verification_type || 'image'}_verification`,
                    initiator_type: 'node',
                    initiator_id: nodeForm?.id || 'unknown',
                    initiator_name: nodeForm?.label || 'Unknown Node',
                    host_name: selectedHost.host_name,
                    device_model: deviceModel,
                    command: verificationItem.command,
                    parameters: verificationItem.params || {},
                    image_source_url: capture_filename,
                    source_filename: capture_filename, // Backward compatibility
                    execution_order: executionOrder++,
                    success: false,
                    execution_time_ms: verificationTime,
                    message: errorMessage,
                    error_details: { error: errorMessage },
                  };

                  executionRecords.push(failedVerificationRecord);
                } else {
                  // Fallback case - no results and no clear error (same as editor)
                  console.log('[@hook:useNodeOperations] No results received from batch execution');
                  gotoResults.push(`❌ Verification ${i + 1}: No verification results received`);
                  verificationSuccess = false;
                  individualVerificationSuccess = false;

                  // Record failed verification
                  const failedVerificationRecord: ExecutionRecord = {
                    execution_category: 'verification',
                    execution_type:
                      verificationItem.verification_type === 'adb'
                        ? 'adb_verification'
                        : `${verificationItem.verification_type || 'image'}_verification`,
                    initiator_type: 'node',
                    initiator_id: nodeForm?.id || 'unknown',
                    initiator_name: nodeForm?.label || 'Unknown Node',
                    host_name: selectedHost.host_name,
                    device_model: deviceModel,
                    command: verificationItem.command,
                    parameters: verificationItem.params || {},
                    image_source_url: capture_filename,
                    source_filename: capture_filename, // Backward compatibility
                    execution_order: executionOrder++,
                    success: false,
                    execution_time_ms: verificationTime,
                    message: 'No verification results received',
                    error_details: { error: 'No verification results received' },
                  };

                  executionRecords.push(failedVerificationRecord);
                }
              }
            } catch (err: any) {
              console.error('[@hook:useNodeOperations] Error executing verification:', err);
              gotoResults.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
              verificationSuccess = false;
              individualVerificationSuccess = false;

              // Record failed verification
              const failedVerificationRecord: ExecutionRecord = {
                execution_category: 'verification',
                execution_type:
                  verificationItem.verification_type === 'adb'
                    ? 'adb_verification'
                    : `${verificationItem.verification_type || 'image'}_verification`,
                initiator_type: 'node',
                initiator_id: nodeForm?.id || 'unknown',
                initiator_name: nodeForm?.label || 'Unknown Node',
                host_name: selectedHost?.host_name || 'unknown',
                device_model: deviceModel,
                command: verificationItem.command,
                parameters: verificationItem.params || {},
                image_source_url: capture_filename || 'unknown',
                source_filename: capture_filename || 'unknown', // Backward compatibility
                execution_order: executionOrder++,
                success: false,
                execution_time_ms: Date.now() - startTime,
                message: err.message || 'Network error',
                error_details: { error: err.message },
              };

              executionRecords.push(failedVerificationRecord);
            }

            console.log(
              `[@hook:useNodeOperations] Goto verification ${i + 1} completed. Success: ${individualVerificationSuccess}`,
            );

            // Small delay between verifications
            await delay(1000);
          }
        } else if (navigationSuccess && (!verifications || verifications.length === 0)) {
          gotoResults.push('ℹ️ No verifications configured for this node');
        }

        // Record all executions to database via API
        if (executionRecords.length > 0) {
          console.log(
            '[@hook:useNodeOperations] Recording',
            executionRecords.length,
            'executions to database',
          );
          try {
            const response = await fetch('/server/execution-results/record-batch', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                executions: executionRecords,
              }),
            });

            const dbResult = await response.json();
            if (!dbResult.success) {
              console.error(
                '[@hook:useNodeOperations] Failed to record executions:',
                dbResult.error,
              );
              gotoResults.push(`⚠️ Database recording failed: ${dbResult.error}`);
            } else {
              console.log('[@hook:useNodeOperations] Successfully recorded executions to database');
            }
          } catch (error) {
            console.error('[@hook:useNodeOperations] Error calling execution results API:', error);
            gotoResults.push(`⚠️ Database recording failed: ${error}`);
          }
        }

        // Step 3: Final Result Summary
        const overallSuccess = navigationSuccess && verificationSuccess;
        gotoResults.push('');

        if (overallSuccess) {
          gotoResults.push('🎉 Goto operation completed successfully!');
          gotoResults.push(`✅ Navigation: Success`);
          gotoResults.push(`✅ Verifications: ${verifications?.length || 0} passed`);
        } else {
          gotoResults.push('⚠️ Goto operation completed with issues:');
          gotoResults.push(
            `${navigationSuccess ? '✅' : '❌'} Navigation: ${navigationSuccess ? 'Success' : 'Failed'}`,
          );
          gotoResults.push(
            `${verificationSuccess ? '✅' : '❌'} Verifications: ${verificationSuccess ? 'Passed' : 'Failed'}`,
          );
        }

        setGotoResult(gotoResults.join('\n'));
        console.log(
          `[@hook:useNodeOperations] Goto operation completed. Overall success: ${overallSuccess}`,
        );

        return {
          success: overallSuccess,
          message: gotoResults.join('\n'),
          navigationSuccess,
          verificationSuccess,
        };
      } catch (err: any) {
        console.error('[@hook:useNodeOperations] Error during goto operation:', err);
        const errorMessage = `❌ Goto operation failed: ${err.message}`;
        setGotoResult(errorMessage);
        return {
          success: false,
          message: errorMessage,
          navigationSuccess: false,
          verificationSuccess: false,
        };
      } finally {
        setIsRunningGoto(false);
      }
    },
    [selectedHost, isControlActive, nodeForm, selectedDeviceId, getDeviceModel],
  );

  // Run verifications for a node
  const runVerifications = useCallback(
    async (verifications: Verification[], _nodeId?: string) => {
      if (!selectedHost || !isControlActive || !verifications || verifications.length === 0) {
        return { success: false, message: 'Cannot run verifications - missing required data' };
      }

      try {
        // Step 1: Take screenshot
        console.log('[@hook:useNodeOperations] Taking screenshot for verification...');

        const screenshotResponse = await fetch('/server/av/take-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: selectedHost }),
        });

        const screenshotResult = await screenshotResponse.json();

        if (!screenshotResult.success || !screenshotResult.screenshot_url) {
          return {
            success: false,
            message: '❌ Failed to capture screenshot for verification',
          };
        }

        // Extract filename from screenshot URL exactly like the editor does
        const screenshotUrl = screenshotResult.screenshot_url;
        let capture_filename = null;

        try {
          // Extract filename from URL like "http://localhost:5009/images/screenshot/android_mobile.jpg?t=1749217510777"
          // or "https://host/captures/tmp/screenshot.jpg"
          const url = new URL(screenshotUrl);
          const pathname = url.pathname;
          const filename = pathname.split('/').pop()?.split('?')[0]; // Get filename without query params
          capture_filename = filename;

          console.log('[@hook:useNodeOperations] Extracted filename from URL:', {
            screenshotUrl,
            pathname,
            capture_filename,
          });
        } catch {
          // Fallback: extract filename directly from URL string
          capture_filename = screenshotUrl.split('/').pop()?.split('?')[0];
          console.log('[@hook:useNodeOperations] Fallback filename extraction:', capture_filename);
        }

        if (!capture_filename) {
          return {
            success: false,
            message: '❌ Failed to extract filename from screenshot URL',
          };
        }

        console.log('[@hook:useNodeOperations] Using capture filename:', capture_filename);

        // Step 2: Prepare verifications exactly like the editor
        const verificationsToExecute = verifications.map((verification) => ({
          ...verification,
          verification_type: verification.verification_type || 'text',
        }));

        // Step 3: Execute verifications using the same pattern as the editor
        const verificationResponse = await fetch('/server/verification/batch/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost, // Send full host object (same as editor)
            verifications: verificationsToExecute, // Send verifications directly (same as editor)
            image_source_url: capture_filename, // Use extracted filename (same as editor)
            source_filename: capture_filename, // Backward compatibility
          }),
        });

        const verificationResult = await verificationResponse.json();

        console.log('[@hook:useNodeOperations] Verification batch result:', verificationResult);
        console.log(
          '[@hook:useNodeOperations] Verification result keys:',
          Object.keys(verificationResult),
        );
        console.log('[@hook:useNodeOperations] Verification results:', verificationResult.results);

        // Step 4: Process results exactly like the editor does
        if (verificationResult.results && verificationResult.results.length > 0) {
          const results = verificationResult.results.map((result: any, index: number) => {
            if (result.success) {
              return `✅ Verification ${index + 1}: ${result.message || 'Success'}`;
            } else {
              return `❌ Verification ${index + 1}: ${result.error || result.message || 'Failed'}`;
            }
          });

          // Show success message with pass/fail count like the editor
          const passedCount = verificationResult.passed_count || 0;
          const totalCount = verificationResult.total_count || verificationResult.results.length;
          const summaryMessage = `Verification completed: ${passedCount}/${totalCount} passed`;

          const fullMessage = [summaryMessage, '', ...results].join('\n');
          return {
            success: passedCount === totalCount,
            message: fullMessage,
            results: verificationResult.results,
            passedCount,
            totalCount,
          };
        } else if (verificationResult.success === false && verificationResult.error) {
          // Only treat as error if there's an actual error and no results (same as editor)
          const errorMessage =
            verificationResult.message || verificationResult.error || 'Unknown error occurred';
          console.log('[@hook:useNodeOperations] Batch execution failed with error:', errorMessage);
          return {
            success: false,
            message: `❌ Verification failed: ${errorMessage}`,
          };
        } else {
          // Fallback case - no results and no clear error (same as editor)
          console.log('[@hook:useNodeOperations] No results received from batch execution');
          return {
            success: false,
            message: '❌ No verification results received',
          };
        }
      } catch (err: any) {
        console.error('[@hook:useNodeOperations] Error executing verifications:', err);
        return {
          success: false,
          message: `❌ Error running verifications: ${err.message}`,
        };
      }
    },
    [selectedHost, isControlActive],
  );

  // Take a screenshot and save it to the node
  const takeAndSaveScreenshot = useCallback(
    async (
      nodeName: string,
      nodeId: string,
      onUpdateNode?: (nodeId: string, updatedData: any) => void,
    ) => {
      if (!isControlActive || !selectedHost) {
        console.warn(
          '[@hook:useNodeOperations] Cannot take screenshot - device control not active or host not available',
        );
        return { success: false, message: 'Device control not active or host not available' };
      }

      // Device model will be extracted by server from device_id

      try {
        const response = await fetch('/server/navigation/save-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            device_id: selectedDeviceId, // Server extracts device_model from this
            filename: nodeName, // Use node name as filename
          }),
        });

        const result = await response.json();

        if (result.success && result.screenshot_url) {
          // Update the node with the complete URL from backend
          if (onUpdateNode) {
            const timestamp = Date.now();
            const updatedNodeData = {
              screenshot: result.screenshot_url, // Store complete URL from backend
              screenshot_timestamp: timestamp, // Add timestamp to force image refresh
            };
            onUpdateNode(nodeId, updatedNodeData);

            // Simple but effective cache-busting: dispatch event with unique cache-buster
            const cacheBuster = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
            window.dispatchEvent(
              new CustomEvent('nodeScreenshotUpdated', {
                detail: {
                  nodeId: nodeId,
                  screenshot: result.screenshot_url,
                  cacheBuster: cacheBuster,
                },
              }),
            );
          } else {
            console.warn(
              '[@hook:useNodeOperations] onUpdateNode callback not provided - screenshot URL not saved to node',
            );
          }

          return {
            success: true,
            message: 'Screenshot saved successfully',
            screenshot_url: result.screenshot_url,
          };
        } else {
          console.error(
            '[@hook:useNodeOperations] Screenshot failed:',
            result.error || 'Unknown error',
          );
          return {
            success: false,
            message: result.error || 'Failed to save screenshot',
          };
        }
      } catch (error) {
        console.error('[@hook:useNodeOperations] Screenshot request failed:', error);
        return {
          success: false,
          message: 'Screenshot request failed',
        };
      }
    },
    [isControlActive, selectedHost, selectedDeviceId],
  );

  return {
    isRunningGoto,
    gotoResult,
    saveSuccess,
    handleSaveSuccess,
    runGoto,
    runVerifications,
    takeAndSaveScreenshot,
    canRunGoto: isControlActive && selectedHost && !isRunningGoto,
  };
};
