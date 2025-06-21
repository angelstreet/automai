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
import React, { useState, useEffect } from 'react';

// Import proper types from navigationTypes
import { NodeEditDialogProps } from '../../types/pages/Navigation_Types';
import { VerificationsList } from '../verification/VerificationsList';
import { Host } from '../../types/common/Host_Types';
import { UINavigationNode, NodeForm } from '../../types/pages/Navigation_Types';
import { useVerification } from '../../hooks/verification/useVerification';
import { useVerificationReferences } from '../../hooks/verification/useVerificationReferences';

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

  const { getModelReferences, referencesLoading } = useVerificationReferences(
    0, // No save counter needed since we don't create references
    selectedHost,
  );

  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [gotoResult, setGotoResult] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize verifications from nodeForm when dialog opens
  useEffect(() => {
    if (isOpen && nodeForm?.verifications) {
      // Only initialize if verifications are actually different to avoid clearing test results
      const currentVerifications = verification.verifications;
      const nodeVerifications = nodeForm.verifications;

      // Deep comparison to check if verifications are actually different
      const areVerificationsDifferent =
        currentVerifications.length !== nodeVerifications.length ||
        currentVerifications.some((current, index) => {
          const node = nodeVerifications[index];
          return (
            !node ||
            current.command !== node.command ||
            current.verification_type !== node.verification_type ||
            JSON.stringify(current.params) !== JSON.stringify(node.params)
          );
        });

      if (areVerificationsDifferent) {
        console.log(
          `[@component:NodeEditDialog] Initializing verifications from nodeForm:`,
          nodeForm.verifications,
        );
        verification.handleVerificationsChange(nodeForm.verifications);
      } else {
        console.log(
          `[@component:NodeEditDialog] Skipping verification initialization - no changes detected`,
        );
      }
    }
  }, [isOpen, nodeForm?.verifications]);

  // Update nodeForm when verifications change
  useEffect(() => {
    if (verification.verifications !== nodeForm?.verifications) {
      console.log(
        `[@component:NodeEditDialog] Updating nodeForm with new verifications:`,
        verification.verifications,
      );
      setNodeForm({
        ...nodeForm,
        verifications: verification.verifications,
      });
    }
  }, [verification.verifications]);

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

          try {
            if (!selectedHost) {
              gotoResults.push(`❌ Verification ${i + 1}: No host device selected`);
              verificationSuccess = false;
              individualVerificationSuccess = false;
            } else {
              const startTime = Date.now();

              // Use server route for node verification (this is correct for node context)
              const response = await fetch(`/server/verification/batch/execute`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  host: selectedHost, // Use full host object (like VerificationEditor)
                  verifications: [verificationToExecute],
                  source_filename: 'verification_screenshot.jpg', // TODO: This should also use capture-first but it's in goto flow
                }),
              });

              const result = await response.json();
              const verificationTime = Date.now() - startTime;

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
                source_filename: 'verification_screenshot.jpg',
                execution_order: executionOrder++,
                success: result.success,
                execution_time_ms: verificationTime,
                message: result.message || result.error,
                error_details: result.success ? undefined : { error: result.error },
                confidence_score: result.confidence_score,
              };

              executionRecords.push(verificationRecord);

              if (result.success) {
                gotoResults.push(`✅ Verification ${i + 1}: ${result.message || 'Success'}`);
                individualVerificationSuccess = true;
              } else {
                gotoResults.push(`❌ Verification ${i + 1}: ${result.error || 'Failed'}`);
                verificationSuccess = false;
                individualVerificationSuccess = false;
              }
            }
          } catch (err: any) {
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
              execution_order: executionOrder++,
              success: false,
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
            onVerificationsChange={verification.handleVerificationsChange}
            loading={verification.loading}
            error={verification.error}
            model={verification.selectedHost?.device_model || model}
            selectedHost={verification.selectedHost}
            onTest={verification.handleTest}
            testResults={verification.testResults}
            reloadTrigger={0}
            onReferenceSelected={handleReferenceSelected}
            modelReferences={getModelReferences(
              verification.selectedHost?.device_model || model || '',
            )}
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
