import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

// Import proper types from navigationTypes
import { NodeEditDialogProps } from '../../types/pages/Navigation_Types';
import { VerificationsList } from '../verification/VerificationsList';
import { Host } from '../../types/common/Host_Types';
import { UINavigationNode, NodeForm } from '../../types/pages/Navigation_Types';
import { Verification } from '../../types/verification/VerificationTypes';
import { useVerification } from '../../hooks/verification/useVerification';
export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  isOpen,
  nodeForm,
  nodes,
  setNodeForm,
  onSubmit,
  onClose,
  onResetNode,
  selectedHost,
  isControlActive = false,
  model,
  modelReferences,
  referencesLoading,
}) => {
  // Early return if nodeForm is null or undefined - MUST be before any hooks
  if (!nodeForm) {
    return null;
  }

  // Early return if selectedHost is invalid - MUST be before verification hook
  if (!selectedHost || !selectedHost.device_model || selectedHost.device_model.trim() === '') {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Node</DialogTitle>
        <DialogContent>
          <Typography color="error">
            No valid host device selected. Please select a host device first.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Use the same verification hooks as VerificationEditor - now safe to call
  const verification = useVerification({
    selectedHost: selectedHost,
    captureSourcePath: undefined, // NodeEditDialog doesn't capture images
  });

  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [gotoResult, setGotoResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize verifications from nodeForm when dialog opens - ONLY ONCE
  useEffect(() => {
    if (isOpen && nodeForm?.verifications) {
      console.log(
        `[@component:NodeEditDialog] Initializing verifications from nodeForm:`,
        nodeForm.verifications,
      );
      verification.handleVerificationsChange(nodeForm.verifications);
    }
  }, [isOpen, verification.handleVerificationsChange]); // Add verification handler to prevent stale closures

  // Handle verification changes by creating a custom handler that updates nodeForm
  const handleVerificationsChange = useCallback(
    (newVerifications: Verification[]) => {
      console.log(
        `[@component:NodeEditDialog] Updating nodeForm with new verifications:`,
        newVerifications,
      );

      // Update both the verification hook and the nodeForm
      verification.handleVerificationsChange(newVerifications);
      setNodeForm({
        ...nodeForm,
        verifications: newVerifications,
      });
    },
    [nodeForm, verification.handleVerificationsChange, setNodeForm],
  );

  // Handle reference selection
  const handleReferenceSelected = (referenceName: string, referenceData: any) => {
    console.log('[@component:NodeEditDialog] Reference selected:', referenceName, referenceData);
    // Reference selection is handled internally by VerificationsList
  };

  // Can run goto if we have control and device, and not already running goto
  const canRunGoto = isControlActive && selectedHost && !isRunningGoto && !verification.loading;

  // Helper function to get parent names from IDs
  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';

    const parentNames = parentIds.map((id) => {
      const parentNode = nodes.find((node) => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });

    return parentNames.join(' > ');
  };

  useEffect(() => {
    if (!isOpen) {
      setGotoResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    onSubmit();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const isFormValid = () => {
    const basicFormValid = nodeForm?.label?.trim();
    const verificationsValid =
      !verification.verifications ||
      verification.verifications.every((verificationItem) => {
        // Skip verifications that don't have a command (not configured yet)
        if (!verificationItem.command) return true;

        if (verificationItem.verification_type === 'image') {
          // Image verifications need a reference image
          const hasImagePath = verificationItem.params?.image_path;
          return Boolean(hasImagePath);
        } else if (verificationItem.verification_type === 'text') {
          // Text verifications need text to search for
          const hasText = verificationItem.params?.text;
          return Boolean(hasText);
        }

        return true;
      });
    return basicFormValid && verificationsValid;
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleRunGoto = async () => {
    setIsRunningGoto(true);
    setGotoResult(null);

    try {
      let gotoResults: string[] = [];
      let navigationSuccess = false;

      const executionRecords: any[] = [];
      let executionOrder = 1;

      // Step 1: Execute Navigation Steps
      gotoResults.push('🚀 Starting navigation to node...');
      console.log(
        `[@component:NodeEditDialog] Starting goto navigation for node: ${nodeForm?.label || 'unknown'}`,
      );

      try {
        // Execute navigation to this node using server route
        if (!selectedHost) {
          gotoResults.push(`❌ Navigation: No host device selected`);
          console.error(`[@component:NodeEditDialog] No host device selected for navigation`);
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
              node_label: nodeForm?.label || '',
              model: selectedHost.device_model || 'android_mobile',
            }),
          });

          const navigationResult = await response.json();
          const navigationTime = Date.now() - startTime;

          // Record navigation execution to database
          const navigationRecord = {
            execution_category: 'navigation',
            execution_type: 'goto_navigation',
            initiator_type: 'node',
            initiator_id: nodeForm?.id || 'unknown',
            initiator_name: nodeForm?.label || 'Unknown Node',
            host_name: selectedHost.host_name,
            device_model: selectedHost.device_model,
            command: `goto ${nodeForm?.label || 'unknown'}`,
            parameters: {
              host_name: selectedHost.host_name,
              node_label: nodeForm?.label,
              model: selectedHost.device_model || 'android_mobile',
            },
            execution_order: executionOrder++,
            success: navigationResult.success,
            execution_time_ms: navigationTime,
            message: navigationResult.success
              ? 'Navigation completed'
              : navigationResult.error || 'Navigation failed',
            error_details: navigationResult.success ? undefined : { error: navigationResult.error },
          };

          executionRecords.push(navigationRecord);

          if (navigationResult.success) {
            gotoResults.push(`✅ Navigation: Successfully reached ${nodeForm?.label || 'unknown'}`);
            navigationSuccess = true;
            console.log(`[@component:NodeEditDialog] Navigation successful`);
          } else {
            gotoResults.push(`❌ Navigation: ${navigationResult.error || 'Failed to reach node'}`);
            console.error(`[@component:NodeEditDialog] Navigation failed:`, navigationResult.error);
          }
        }
      } catch (err: any) {
        gotoResults.push(`❌ Navigation: ${err.message || 'Network error'}`);
        console.error('[@component:NodeEditDialog] Navigation error:', err);

        // Record failed navigation
        const failedNavigationRecord = {
          execution_category: 'navigation',
          execution_type: 'goto_navigation',
          initiator_type: 'node',
          initiator_id: nodeForm?.id || 'unknown',
          initiator_name: nodeForm?.label || 'Unknown Node',
          host_name: selectedHost?.host_name || 'unknown',
          device_model: selectedHost?.device_model,
          command: `goto ${nodeForm?.label || 'unknown'}`,
          parameters: {
            host_name: selectedHost?.host_name,
            node_label: nodeForm?.label,
            model: selectedHost?.device_model || 'android_mobile',
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

      if (
        navigationSuccess &&
        verification.verifications &&
        verification.verifications.length > 0
      ) {
        gotoResults.push('\n🔍 Running node verifications...');
        console.log(
          `[@component:NodeEditDialog] Starting verifications after successful navigation`,
        );

        // Small delay before verifications
        await delay(1500);

        for (let i = 0; i < verification.verifications.length; i++) {
          const verificationItem = verification.verifications[i];

          if (!verificationItem.command) {
            gotoResults.push(`❌ Verification ${i + 1}: No verification selected`);
            verificationSuccess = false;

            // Record failed verification
            const failedVerificationRecord = {
              execution_category: 'verification',
              execution_type:
                verificationItem.verification_type === 'adb'
                  ? 'adb_verification'
                  : `${verificationItem.verification_type || 'image'}_verification`,
              initiator_type: 'node',
              initiator_id: nodeForm?.id || 'unknown',
              initiator_name: nodeForm?.label || 'Unknown Node',
              host_name: selectedHost?.host_name || 'unknown',
              device_model: selectedHost?.device_model,
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
            `[@component:NodeEditDialog] Executing verification ${i + 1}/${verification.verifications.length}: ${verificationItem.command}`,
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
              console.log('[@component:NodeEditDialog] Taking screenshot for verification...');

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

                console.log('[@component:NodeEditDialog] Extracted filename from URL:', {
                  screenshotUrl,
                  pathname,
                  capture_filename,
                });
              } catch (urlError) {
                // Fallback: extract filename directly from URL string
                capture_filename = screenshotUrl.split('/').pop()?.split('?')[0];
                console.log(
                  '[@component:NodeEditDialog] Fallback filename extraction:',
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

              console.log('[@component:NodeEditDialog] Using capture filename:', capture_filename);

              // Step 2: Execute verification using the same pattern as the editor
              const response = await fetch(`/server/verification/batch/execute`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  host: selectedHost, // Use full host object (same as editor)
                  verifications: [verificationToExecute], // Send verifications directly (same as editor)
                  source_filename: capture_filename, // Use extracted filename (same as editor)
                }),
              });

              const result = await response.json();
              const verificationTime = Date.now() - startTime;

              console.log('[@component:NodeEditDialog] Verification batch result:', result);
              console.log(
                '[@component:NodeEditDialog] Verification result keys:',
                Object.keys(result),
              );
              console.log('[@component:NodeEditDialog] Verification results:', result.results);

              // Process results exactly like the editor does
              if (result.results && result.results.length > 0) {
                const verificationResult = result.results[0]; // We sent only one verification

                // Record verification execution to database
                const verificationRecord = {
                  execution_category: 'verification',
                  execution_type:
                    verificationItem.verification_type === 'adb'
                      ? 'adb_verification'
                      : `${verificationItem.verification_type || 'image'}_verification`,
                  initiator_type: 'node',
                  initiator_id: nodeForm?.id || 'unknown',
                  initiator_name: nodeForm?.label || 'Unknown Node',
                  host_name: selectedHost.host_name,
                  device_model: selectedHost.device_model,
                  command: verificationItem.command,
                  parameters: verificationItem.params || {},
                  source_filename: capture_filename,
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
                  '[@component:NodeEditDialog] Batch execution failed with error:',
                  errorMessage,
                );
                gotoResults.push(`❌ Verification ${i + 1}: ${errorMessage}`);
                verificationSuccess = false;
                individualVerificationSuccess = false;

                // Record failed verification
                const failedVerificationRecord = {
                  execution_category: 'verification',
                  execution_type:
                    verificationItem.verification_type === 'adb'
                      ? 'adb_verification'
                      : `${verificationItem.verification_type || 'image'}_verification`,
                  initiator_type: 'node',
                  initiator_id: nodeForm?.id || 'unknown',
                  initiator_name: nodeForm?.label || 'Unknown Node',
                  host_name: selectedHost.host_name,
                  device_model: selectedHost.device_model,
                  command: verificationItem.command,
                  parameters: verificationItem.params || {},
                  source_filename: capture_filename,
                  execution_order: executionOrder++,
                  success: false,
                  execution_time_ms: verificationTime,
                  message: errorMessage,
                  error_details: { error: errorMessage },
                };

                executionRecords.push(failedVerificationRecord);
              } else {
                // Fallback case - no results and no clear error (same as editor)
                console.log('[@component:NodeEditDialog] No results received from batch execution');
                gotoResults.push(`❌ Verification ${i + 1}: No verification results received`);
                verificationSuccess = false;
                individualVerificationSuccess = false;

                // Record failed verification
                const failedVerificationRecord = {
                  execution_category: 'verification',
                  execution_type:
                    verificationItem.verification_type === 'adb'
                      ? 'adb_verification'
                      : `${verificationItem.verification_type || 'image'}_verification`,
                  initiator_type: 'node',
                  initiator_id: nodeForm?.id || 'unknown',
                  initiator_name: nodeForm?.label || 'Unknown Node',
                  host_name: selectedHost.host_name,
                  device_model: selectedHost.device_model,
                  command: verificationItem.command,
                  parameters: verificationItem.params || {},
                  source_filename: capture_filename,
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
            console.error('[@component:NodeEditDialog] Error executing verification:', err);
            gotoResults.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
            verificationSuccess = false;
            individualVerificationSuccess = false;

            // Record failed verification
            const failedVerificationRecord = {
              execution_category: 'verification',
              execution_type:
                verificationItem.verification_type === 'adb'
                  ? 'adb_verification'
                  : `${verificationItem.verification_type || 'image'}_verification`,
              initiator_type: 'node',
              initiator_id: nodeForm?.id || 'unknown',
              initiator_name: nodeForm?.label || 'Unknown Node',
              host_name: selectedHost?.host_name || 'unknown',
              device_model: selectedHost?.device_model,
              command: verificationItem.command,
              parameters: verificationItem.params || {},
              source_filename: capture_filename || 'unknown',
              execution_order: executionOrder++,
              success: false,
              execution_time_ms: Date.now() - startTime,
              message: err.message || 'Network error',
              error_details: { error: err.message },
            };

            executionRecords.push(failedVerificationRecord);
          }

          console.log(
            `[@component:NodeEditDialog] Goto verification ${i + 1} completed. Success: ${individualVerificationSuccess}`,
          );

          // Small delay between verifications
          await delay(1000);
        }
      } else if (
        navigationSuccess &&
        (!verification.verifications || verification.verifications.length === 0)
      ) {
        gotoResults.push('ℹ️ No verifications configured for this node');
      }

      // Record all executions to database via API
      if (executionRecords.length > 0) {
        console.log(
          '[@component:NodeEditDialog] Recording',
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
              '[@component:NodeEditDialog] Failed to record executions:',
              dbResult.error,
            );
            gotoResults.push(`⚠️ Database recording failed: ${dbResult.error}`);
          } else {
            console.log('[@component:NodeEditDialog] Successfully recorded executions to database');
            gotoResults.push(`📊 Execution results recorded to database`);
          }
        } catch (error) {
          console.error('[@component:NodeEditDialog] Error calling execution results API:', error);
          gotoResults.push(`⚠️ Database recording failed: ${error}`);
        }
      }

      // Step 3: Final Result Summary
      const overallSuccess = navigationSuccess && verificationSuccess;
      gotoResults.push('');

      if (overallSuccess) {
        gotoResults.push('🎉 Goto operation completed successfully!');
        gotoResults.push(`✅ Navigation: Success`);
        gotoResults.push(`✅ Verifications: ${verification.verifications?.length || 0} passed`);
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
        `[@component:NodeEditDialog] Goto operation completed. Overall success: ${overallSuccess}`,
      );
    } catch (err: any) {
      console.error('[@component:NodeEditDialog] Error during goto operation:', err);
      setGotoResult(`❌ Goto operation failed: ${err.message}`);
    } finally {
      setIsRunningGoto(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Node
          <IconButton size="small" onClick={onClose} sx={{ p: 0.25 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Node Name and Type in columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Node Name"
              value={nodeForm?.label || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
              fullWidth
              required
              error={!nodeForm?.label?.trim()}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={nodeForm?.type || 'screen'}
                label="Type"
                onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value as any })}
              >
                <MenuItem value="menu">Menu</MenuItem>
                <MenuItem value="screen">Screen</MenuItem>
                <MenuItem value="action">Action</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Depth and Parent below in columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Depth"
              value={nodeForm?.depth || 0}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
            <TextField
              label="Parent"
              value={getParentNames(nodeForm?.parent || [])}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Single line description */}
          <TextField
            label="Description"
            value={nodeForm?.description || ''}
            onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
            fullWidth
            size="small"
          />

          {/* Screenshot URL Field - only show for non-entry nodes */}
          {nodeForm?.type !== 'entry' && (
            <TextField
              label="Screenshot URL"
              value={nodeForm?.screenshot || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
              fullWidth
              size="small"
            />
          )}

          {/* Verification Section - using same hooks as VerificationEditor */}
          <VerificationsList
            verifications={verification.verifications}
            availableVerifications={verification.availableVerificationTypes}
            onVerificationsChange={handleVerificationsChange}
            loading={verification.loading}
            error={verification.error}
            model={verification.selectedHost?.device_model || model}
            selectedHost={verification.selectedHost}
            onTest={verification.handleTest}
            testResults={verification.testResults}
            reloadTrigger={0}
            onReferenceSelected={handleReferenceSelected}
            modelReferences={modelReferences}
            referencesLoading={referencesLoading}
          />

          {gotoResult && (
            <Box
              sx={{
                p: 2,
                bgcolor:
                  gotoResult.includes('❌') || gotoResult.includes('⚠️')
                    ? 'error.light'
                    : 'success.light',
                borderRadius: 1,
                maxHeight: 300,
                overflow: 'auto',
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {gotoResult}
              </Typography>
            </Box>
          )}

          {/* Entry node note */}
          {nodeForm?.type === 'entry' && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Entry points are automatically positioned. Edit the connecting edge to change entry
              method and details.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {onResetNode && (
          <Button onClick={() => onResetNode()} variant="outlined" color="warning">
            Reset Node
          </Button>
        )}
        <Button onClick={handleSave} variant="contained" disabled={!isFormValid()}>
          {saveSuccess ? '✓' : 'Save'}
        </Button>
        <Button
          onClick={verification.handleTest}
          variant="contained"
          disabled={
            !isControlActive ||
            !selectedHost ||
            verification.verifications.length === 0 ||
            verification.loading
          }
          sx={{
            opacity:
              !isControlActive ||
              !selectedHost ||
              verification.verifications.length === 0 ||
              verification.loading
                ? 0.5
                : 1,
          }}
        >
          {verification.loading ? 'Running...' : 'Run'}
        </Button>
        <Button
          onClick={handleRunGoto}
          variant="contained"
          color="primary"
          disabled={!canRunGoto}
          sx={{
            opacity: !canRunGoto ? 0.5 : 1,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          {isRunningGoto ? 'Going...' : 'Go To'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
