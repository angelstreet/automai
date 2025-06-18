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
import { Host } from '../../types/common/Host_Types';
import { VerificationActions, NodeEditDialogProps } from '../../types/pages/Navigation_Types';

import { NodeVerificationsList } from './Navigation_NodeVerificationsList';

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  isOpen,
  nodeForm,
  nodes,
  setNodeForm,
  onSubmit,
  onClose,
  onResetNode,
  verificationControllerTypes: _verificationControllerTypes = [],
  isVerificationActive = false,
  selectedHostDevice: selectedHost,
  isControlActive = false,
  model,
}) => {
  // Early return if nodeForm is null or undefined - MUST be before any hooks
  if (!nodeForm) {
    return null;
  }

  // Type the selectedHost properly
  const typedSelectedHost = selectedHost as Host | undefined;

  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isRunningVerifications, setIsRunningVerifications] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [gotoResult, setGotoResult] = useState<string | null>(null);

  // Utility function to update last run results (keeps last 10 results)
  const updateLastRunResults = (results: boolean[], newResult: boolean): boolean[] => {
    const updatedResults = [newResult, ...results];
    return updatedResults.slice(0, 10); // Keep only last 10 results
  };

  // Calculate confidence score from last run results (0-1 scale)
  const calculateConfidenceScore = (results?: boolean[]): number => {
    if (!results || results.length === 0) return 0.5; // Default confidence for new verifications
    const successCount = results.filter((result) => result).length;
    return successCount / results.length;
  };

  // Use same logic as EdgeEditDialog
  const canRunVerifications =
    isControlActive &&
    typedSelectedHost &&
    nodeForm?.verifications &&
    nodeForm.verifications.length > 0 &&
    !isRunningVerifications;

  // Can run goto if we have control and device, and not already running goto
  const canRunGoto =
    isControlActive && typedSelectedHost && !isRunningGoto && !isRunningVerifications;

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
      setVerificationResult(null);
      setGotoResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && typedSelectedHost?.available_verification_types) {
      console.log(`[@component:NodeEditDialog] Loading verification actions from host data`);
      setVerificationActions(typedSelectedHost.available_verification_types);
      setLoadingVerifications(false);
      setVerificationError(null);
    } else if (isOpen && typedSelectedHost && !typedSelectedHost.available_verification_types) {
      console.log(`[@component:NodeEditDialog] No verification types available from host`);
      setVerificationActions({});
      setLoadingVerifications(false);
      setVerificationError('No verification types available from host');
    }
  }, [isOpen, typedSelectedHost]);

  const isFormValid = () => {
    const basicFormValid = nodeForm?.label?.trim();
    const verificationsValid =
      !nodeForm?.verifications ||
      nodeForm.verifications.every((verification) => {
        // Skip verifications that don't have an id (not configured yet)
        if (!verification.id) return true;

        if (verification.controller_type === 'image') {
          // Image verifications need a reference image
          const hasImagePath = verification.params?.image_path;
          return Boolean(hasImagePath);
        } else if (verification.controller_type === 'text') {
          // Text verifications need text to search for
          const hasText = verification.params?.text;
          return Boolean(hasText);
        }

        return true;
      });
    return basicFormValid && verificationsValid;
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleRunVerifications = async () => {
    if (!nodeForm?.verifications || nodeForm.verifications.length === 0) return;

    console.log('[@component:NodeEditDialog] === VERIFICATION TEST DEBUG ===');
    console.log(
      '[@component:NodeEditDialog] Number of verifications before filtering:',
      nodeForm.verifications.length,
    );

    // Filter out empty/invalid verifications before testing
    const validVerifications = nodeForm.verifications.filter((verification, index) => {
      // Check if verification has an id (is configured)
      if (!verification.id || verification.id.trim() === '') {
        console.log(
          `[@component:NodeEditDialog] Removing verification ${index}: No verification type selected`,
        );
        return false;
      }

      // Check if verification has required input based on controller type
      if (verification.controller_type === 'image') {
        // Image verifications need a reference image
        const hasImagePath = verification.params?.image_path;
        if (!hasImagePath) {
          console.log(
            `[@component:NodeEditDialog] Removing verification ${index}: No image reference specified`,
          );
          return false;
        }
      } else if (verification.controller_type === 'text') {
        // Text verifications need text to search for
        const hasText = verification.params?.text;
        if (!hasText) {
          console.log(
            `[@component:NodeEditDialog] Removing verification ${index}: No text specified`,
          );
          return false;
        }
      }

      return true;
    });

    // Update verifications list if any were filtered out
    if (validVerifications.length !== nodeForm.verifications.length) {
      console.log(
        `[@component:NodeEditDialog] Filtered out ${nodeForm.verifications.length - validVerifications.length} empty verifications`,
      );
      setNodeForm({
        ...nodeForm,
        verifications: validVerifications,
      });

      // Show message about removed verifications
      if (validVerifications.length === 0) {
        setVerificationResult(
          'All verifications were empty and have been removed. Please add valid verifications.',
        );
        return;
      }
    }

    console.log(
      '[@component:NodeEditDialog] Number of valid verifications:',
      validVerifications.length,
    );

    setIsRunningVerifications(true);
    setVerificationResult(null);

    try {
      let results: string[] = [];
      const updatedVerifications = [...validVerifications]; // Use filtered verifications
      let executionStopped = false;

      // Show message about removed verifications if any
      if (validVerifications.length !== nodeForm.verifications.length) {
        results.push(
          `ℹ️ Removed ${nodeForm.verifications.length - validVerifications.length} empty verification(s)`,
        );
        results.push('');
      }

      for (let i = 0; i < validVerifications.length; i++) {
        const verification = validVerifications[i];

        console.log(
          `[@component:NodeEditDialog] Executing verification ${i + 1}/${validVerifications.length}: ${verification.label}`,
        );

        const verificationToExecute = {
          ...verification,
          params: { ...verification.params },
        };

        let verificationSuccess = false;

        try {
          if (!typedSelectedHost) {
            results.push(`❌ Verification ${i + 1}: No host device selected`);
            verificationSuccess = false;
          } else {
            // Use server route instead of controller proxy
            const response = await fetch(`/server/verification/execution/execute-batch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                host_name: typedSelectedHost.host_name,
                verifications: [verificationToExecute],
                model: typedSelectedHost.device_model || 'android_mobile',
                node_id: nodeForm?.id || 'unknown',
                source_filename: 'verification_screenshot.jpg',
              }),
            });

            const result = await response.json();

            if (result.success) {
              results.push(`✅ Verification ${i + 1}: ${result.message || 'Success'}`);
              verificationSuccess = true;
            } else {
              results.push(`❌ Verification ${i + 1}: ${result.error || 'Failed'}`);
              verificationSuccess = false;
            }
          }
        } catch (err: any) {
          results.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
          verificationSuccess = false;
        }

        // Update verification with result and confidence info
        const updatedLastRunResults = updateLastRunResults(
          verification.last_run_result || [],
          verificationSuccess,
        );
        const confidenceScore = calculateConfidenceScore(updatedLastRunResults);

        updatedVerifications[i] = {
          ...verification,
          last_run_result: updatedLastRunResults,
        };

        // Add confidence info to results
        results.push(
          `   📊 Confidence: ${(confidenceScore * 100).toFixed(1)}% (${updatedLastRunResults.length} runs)`,
        );

        console.log(
          `[@component:NodeEditDialog] Verification ${i + 1} completed. Success: ${verificationSuccess}, New confidence: ${confidenceScore.toFixed(3)}`,
        );

        // Stop execution if verification failed
        if (!verificationSuccess) {
          results.push(`⏹️ Execution stopped due to failed verification ${i + 1}`);
          executionStopped = true;
          break;
        }

        // Small delay between verifications
        await delay(1000);
      }

      // Update the node form with the updated verifications
      setNodeForm({
        ...nodeForm,
        verifications: updatedVerifications,
      });

      setVerificationResult(results.join('\n'));

      if (executionStopped) {
        console.log(`[@component:NodeEditDialog] Verification execution stopped due to failure`);
      } else {
        console.log(`[@component:NodeEditDialog] All verifications completed successfully`);
      }
    } catch (err: any) {
      console.error('[@component:NodeEditDialog] Error executing verifications:', err);
      setVerificationResult(`❌ ${err.message}`);
    } finally {
      setIsRunningVerifications(false);
    }
  };

  const handleRunGoto = async () => {
    setIsRunningGoto(true);
    setGotoResult(null);
    setVerificationResult(null);

    try {
      let gotoResults: string[] = [];
      let navigationSuccess = false;

      // Step 1: Execute Navigation Steps
      gotoResults.push('🚀 Starting navigation to node...');
      console.log(
        `[@component:NodeEditDialog] Starting goto navigation for node: ${nodeForm?.label || 'unknown'}`,
      );

      try {
        // Execute navigation to this node using server route
        if (!typedSelectedHost) {
          gotoResults.push(`❌ Navigation: No host device selected`);
          console.error(`[@component:NodeEditDialog] No host device selected for navigation`);
        } else {
          // Use server route instead of navigation controller proxy
          const response = await fetch(`/server/navigation/goto-node`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host_name: typedSelectedHost.host_name,
              node_label: nodeForm?.label || '',
              model: typedSelectedHost.device_model || 'android_mobile',
            }),
          });

          const navigationResult = await response.json();

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
      }

      // Step 2: Execute Verifications (only if navigation succeeded)
      let verificationSuccess = true;

      if (navigationSuccess && nodeForm?.verifications && nodeForm.verifications.length > 0) {
        gotoResults.push('\n🔍 Running node verifications...');
        console.log(
          `[@component:NodeEditDialog] Starting verifications after successful navigation`,
        );

        const updatedVerifications = [...nodeForm.verifications];

        // Small delay before verifications
        await delay(1500);

        for (let i = 0; i < nodeForm.verifications.length; i++) {
          const verification = nodeForm.verifications[i];

          if (!verification.id) {
            gotoResults.push(`❌ Verification ${i + 1}: No verification selected`);
            verificationSuccess = false;
            // Update verification with failed result
            updatedVerifications[i] = {
              ...verification,
              last_run_result: updateLastRunResults(verification.last_run_result || [], false),
            };
            continue;
          }

          console.log(
            `[@component:NodeEditDialog] Executing verification ${i + 1}/${nodeForm.verifications.length}: ${verification.label}`,
          );

          const verificationToExecute = {
            ...verification,
            params: { ...verification.params },
          };

          let individualVerificationSuccess = false;

          try {
            if (!typedSelectedHost) {
              gotoResults.push(`❌ Verification ${i + 1}: No host device selected`);
              verificationSuccess = false;
              individualVerificationSuccess = false;
            } else {
              // Use server route instead of controller proxy
              const response = await fetch(`/server/verification/execution/execute-batch`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  host_name: typedSelectedHost.host_name,
                  verifications: [verificationToExecute],
                  model: typedSelectedHost.device_model || 'android_mobile',
                  node_id: nodeForm?.id || 'unknown',
                  source_filename: 'verification_screenshot.jpg',
                }),
              });

              const result = await response.json();

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
          }

          // Update verification with result and confidence info
          const updatedLastRunResults = updateLastRunResults(
            verification.last_run_result || [],
            individualVerificationSuccess,
          );
          const confidenceScore = calculateConfidenceScore(updatedLastRunResults);

          updatedVerifications[i] = {
            ...verification,
            last_run_result: updatedLastRunResults,
          };

          // Add confidence info to goto results
          gotoResults.push(
            `   📊 Confidence: ${(confidenceScore * 100).toFixed(1)}% (${updatedLastRunResults.length} runs)`,
          );

          console.log(
            `[@component:NodeEditDialog] Goto verification ${i + 1} completed. Success: ${individualVerificationSuccess}, New confidence: ${confidenceScore.toFixed(3)}`,
          );

          // Small delay between verifications
          await delay(1000);
        }

        // Update the node form with the updated verifications after goto
        setNodeForm({
          ...nodeForm,
          verifications: updatedVerifications,
        });
      } else if (
        navigationSuccess &&
        (!nodeForm?.verifications || nodeForm.verifications.length === 0)
      ) {
        gotoResults.push('ℹ️ No verifications configured for this node');
      }

      // Step 3: Final Result Summary
      const overallSuccess = navigationSuccess && verificationSuccess;
      gotoResults.push('');

      if (overallSuccess) {
        gotoResults.push('🎉 Goto operation completed successfully!');
        gotoResults.push(`✅ Navigation: Success`);
        gotoResults.push(`✅ Verifications: ${nodeForm?.verifications?.length || 0} passed`);
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

          {/* Verification Section - now available for all node types including entry */}
          {isVerificationActive && (
            <NodeVerificationsList
              verifications={nodeForm?.verifications || []}
              availableActions={verificationActions}
              onVerificationsChange={(verifications) => setNodeForm({ ...nodeForm, verifications })}
              loading={loadingVerifications}
              error={verificationError}
              model={typedSelectedHost?.device_model || model}
            />
          )}

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

          {verificationResult && (
            <Box
              sx={{
                p: 2,
                bgcolor: verificationResult.includes('❌') ? 'error.light' : 'success.light',
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {verificationResult}
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
        <Button onClick={onSubmit} variant="contained" disabled={!isFormValid()}>
          Save
        </Button>
        <Button
          onClick={handleRunVerifications}
          variant="contained"
          disabled={!canRunVerifications}
          sx={{ opacity: !canRunVerifications ? 0.5 : 1 }}
        >
          {isRunningVerifications ? 'Running...' : 'Run'}
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
