import {
  Close as CloseIcon,
  Camera as CameraIcon,
  Route as RouteIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { UINavigationNode, NodeForm } from '../../types/pages/Navigation_Types';
import { calculateConfidenceScore } from '../../utils/validation/confidenceUtils';
import { buildScreenshotUrl } from '../../utils/infrastructure/cloudflareUtils';

import { NodeGotoPanel } from './Navigation_NodeGotoPanel';

interface NodeSelectionPanelProps {
  selectedNode: UINavigationNode;
  nodes: UINavigationNode[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChildren: () => void;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  setIsNodeDialogOpen: (open: boolean) => void;
  onReset?: (id: string) => void;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  // Device control props
  isControlActive?: boolean;
  selectedHost?: any; // Full host object for API calls
  onSaveScreenshot?: () => void;
  // Navigation props
  treeId?: string;
  currentNodeId?: string;
  // Verification props
  onVerification?: (nodeId: string, verifications: any[]) => void;
  isVerificationActive?: boolean;
  verificationControllerStatus?: {
    image_controller_available: boolean;
    text_controller_available: boolean;
  };
}

export const NodeSelectionPanel: React.FC<NodeSelectionPanelProps> = ({
  selectedNode,
  nodes,
  onClose,
  onEdit,
  onDelete,
  onAddChildren,
  setNodeForm,
  setIsNodeDialogOpen,
  onReset,
  onUpdateNode,
  isControlActive = false,
  selectedHost,
  onSaveScreenshot,
  treeId = '',
  currentNodeId,
  onVerification,
  isVerificationActive = false,
  verificationControllerStatus,
}) => {
  // Don't render the panel for entry nodes - MUST be before any hooks
  if ((selectedNode.data.type as string) === 'entry') {
    return null;
  }

  // Add state to control showing/hiding the NodeGotoPanel
  const [showGotoPanel, setShowGotoPanel] = useState(false);

  // Clear the goto panel when the component unmounts or when a new node is selected
  useEffect(() => {
    // Close the goto panel when the selected node changes
    setShowGotoPanel(false);
  }, [selectedNode.id]);

  // Add states for confirmation dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showScreenshotConfirm, setShowScreenshotConfirm] = useState(false);
  const [showVerificationConfirm, setShowVerificationConfirm] = useState(false);

  // Add states for verification execution
  const [isRunningVerifications, setIsRunningVerifications] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [localVerificationUpdates, setLocalVerificationUpdates] = useState<{
    [index: number]: boolean[];
  }>({});

  // Clear verification results when node selection changes
  useEffect(() => {
    setVerificationResult(null);
    setLocalVerificationUpdates({});

    // Debug: Log verification data when node changes
    console.log(`[@component:NodeSelectionPanel] Selected node changed: ${selectedNode.id}`);
    if (selectedNode.data.verifications) {
      console.log(
        `[@component:NodeSelectionPanel] Node has ${selectedNode.data.verifications.length} verifications`,
      );
      selectedNode.data.verifications.forEach((v, index) => {
        console.log(
          `[@component:NodeSelectionPanel] Verification ${index}: ${v.label}, last_run_result:`,
          v.last_run_result,
        );
      });
    } else {
      console.log(`[@component:NodeSelectionPanel] Node has no verifications`);
    }
  }, [selectedNode.id]);

  const handleEdit = () => {
    setNodeForm({
      label: selectedNode.data.label,
      type: selectedNode.data.type,
      description: selectedNode.data.description || '',
      screenshot: selectedNode.data.screenshot,
      depth: selectedNode.data.depth || 0,
      parent: selectedNode.data.parent || [],
      menu_type: selectedNode.data.menu_type,
      verifications: selectedNode.data.verifications || [],
    });
    setIsNodeDialogOpen(true);
  };

  // Confirmation handlers
  const handleResetConfirm = () => {
    if (onReset) {
      onReset(selectedNode.id);
    }
    setShowResetConfirm(false);
  };

  const handleScreenshotConfirm = async () => {
    if (!isControlActive || !selectedHost) {
      console.warn(
        '[@component:NodeSelectionPanel] Cannot take screenshot - device control not active or host not available',
      );
      setShowScreenshotConfirm(false);
      return;
    }

    try {
      console.log(`[@component:NodeSelectionPanel] Taking screenshot for node: ${selectedNode.id}`);

      const response = await fetch('/server/av/save-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHost,
          filename: selectedNode.data.label, // Use node name as filename
        }),
      });

      const result = await response.json();

      if (result.success && result.screenshot_url) {
        console.log(
          `[@component:NodeSelectionPanel] Screenshot filename received: ${result.screenshot_url}`,
        );

        // Get device model from selectedHost for URL construction
        const deviceModel = selectedHost?.device_model || 'android_mobile';

        // Use buildScreenshotUrl to construct the proper Cloudflare R2 URL
        const cloudflareUrl = buildScreenshotUrl(result.screenshot_url, deviceModel);

        console.log(`[@component:NodeSelectionPanel] Built Cloudflare URL: ${cloudflareUrl}`);

        // Update the node with the filename (not the full URL) - buildScreenshotUrl will construct it when needed
        if (onUpdateNode) {
          const updatedNodeData = {
            ...selectedNode.data,
            screenshot: result.screenshot_url, // Store just the filename
            screenshot_timestamp: Date.now(), // Add timestamp to force image refresh
          };
          onUpdateNode(selectedNode.id, updatedNodeData);
          console.log(
            `[@component:NodeSelectionPanel] Updated node ${selectedNode.id} with screenshot filename: ${result.screenshot_url}`,
          );

          // Force a refresh of the node display by dispatching a custom event
          window.dispatchEvent(
            new CustomEvent('nodeScreenshotUpdated', {
              detail: { nodeId: selectedNode.id, screenshot: result.screenshot_url },
            }),
          );
        } else {
          console.warn(
            '[@component:NodeSelectionPanel] onUpdateNode callback not provided - screenshot URL not saved to node',
          );
        }
      } else {
        console.error(
          '[@component:NodeSelectionPanel] Screenshot failed:',
          result.error || 'Unknown error',
        );
      }
    } catch (error) {
      console.error('[@component:NodeSelectionPanel] Screenshot request failed:', error);
    }

    setShowScreenshotConfirm(false);
  };

  const handleVerificationConfirm = () => {
    if (onVerification && selectedNode.data.verifications) {
      onVerification(selectedNode.id, selectedNode.data.verifications);
    }
    setShowVerificationConfirm(false);
  };

  // Update verification results in the actual node data
  const updateVerificationResults = (verificationIndex: number, success: boolean) => {
    if (!onUpdateNode) {
      console.warn(
        '[@component:NodeSelectionPanel] onUpdateNode callback not provided - verification results will not be saved!',
      );
      return;
    }

    if (!selectedNode.data.verifications) {
      console.warn('[@component:NodeSelectionPanel] No verifications found on selectedNode.data');
      return;
    }

    console.log(
      `[@component:NodeSelectionPanel] Updating verification ${verificationIndex} with result: ${success}`,
    );

    const updatedVerifications = [...selectedNode.data.verifications];
    const verification = updatedVerifications[verificationIndex];

    // Update the last_run_result array
    const currentResults = verification.last_run_result || [];
    const newResults = [success, ...currentResults].slice(0, 10); // Keep last 10 results

    console.log(`[@component:NodeSelectionPanel] Previous results:`, currentResults);
    console.log(`[@component:NodeSelectionPanel] New results:`, newResults);

    updatedVerifications[verificationIndex] = {
      ...verification,
      last_run_result: newResults,
    };

    // Update the node data
    const updatedNodeData = {
      ...selectedNode.data,
      verifications: updatedVerifications,
    };

    console.log(
      `[@component:NodeSelectionPanel] Calling onUpdateNode with updated data for node: ${selectedNode.id}`,
    );
    console.log(
      `[@component:NodeSelectionPanel] Updated verification data:`,
      updatedVerifications[verificationIndex],
    );

    // Call the parent callback to update the node
    onUpdateNode(selectedNode.id, updatedNodeData);
  };

  // Execute all node verifications
  const handleRunVerifications = async () => {
    if (!selectedNode.data.verifications || selectedNode.data.verifications.length === 0) {
      console.log('[@component:NodeSelectionPanel] No verifications to run');
      return;
    }

    setIsRunningVerifications(true);
    setVerificationResult(null);

    try {
      let results: string[] = [];
      const verifications = selectedNode.data.verifications;

      for (let i = 0; i < verifications.length; i++) {
        const verification = verifications[i];

        console.log(
          `[@component:NodeSelectionPanel] Executing verification ${i + 1}/${verifications.length}: ${verification.label}`,
        );

        let verificationSuccess = false;

        try {
          // Use server route for verification (to be implemented)
          // Note: This component currently shows verification UI but actual execution
          // should be handled through the NodeEditDialog component
          results.push(`❌ Verification ${i + 1}: Use NodeEditDialog for verification execution`);
          verificationSuccess = false;
        } catch (err: any) {
          results.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
          verificationSuccess = false;
        }

        // Update verification result in the actual node data
        updateVerificationResults(i, verificationSuccess);

        // Also store locally for immediate confidence display
        setLocalVerificationUpdates((prev) => ({
          ...prev,
          [i]: [verificationSuccess, ...(verification.last_run_result || [])].slice(0, 10),
        }));

        // Calculate and display confidence
        const currentResults = verification.last_run_result || [];
        const newResults = [verificationSuccess, ...currentResults].slice(0, 10);
        const newConfidence = calculateConfidenceScore(newResults);
        results.push(
          `   📊 Confidence: ${(newConfidence * 100).toFixed(1)}% (${newResults.length} runs)`,
        );
        console.log(
          `[@component:NodeSelectionPanel] Verification ${i + 1} completed. Success: ${verificationSuccess}, New confidence: ${newConfidence.toFixed(3)}`,
        );
      }

      setVerificationResult(results.join('\n'));
      console.log(`[@component:NodeSelectionPanel] All verifications completed`);
    } catch (err: any) {
      console.error('[@component:NodeSelectionPanel] Error executing verifications:', err);
      setVerificationResult(`❌ ${err.message}`);
    } finally {
      setIsRunningVerifications(false);
    }
  };

  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';

    const parentNames = parentIds.map((id) => {
      const parentNode = nodes.find((node) => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });

    return parentNames.join(' > ');
  };

  // Check if screenshot button should be displayed
  const showSaveScreenshotButton = isControlActive && selectedHost;

  // Check if Go To button should be displayed
  // Show for all nodes when device is under control
  const showGoToButton = isControlActive && selectedHost && treeId;

  // Check if verification button should be displayed
  const hasNodeVerifications =
    selectedNode.data.verifications && selectedNode.data.verifications.length > 0;
  const hasAvailableControllers =
    verificationControllerStatus?.image_controller_available ||
    verificationControllerStatus?.text_controller_available;
  const showVerificationButton =
    isVerificationActive && hasAvailableControllers && hasNodeVerifications && onVerification;

  // Can run verifications if we have control and device (same logic as NodeEditDialog)
  const canRunVerifications =
    isControlActive && selectedHost && hasNodeVerifications && !isRunningVerifications;

  // Check if node can be deleted (protect entry points and home nodes)
  const isProtectedNode =
    selectedNode.data.is_root ||
    selectedNode.data.type === 'entry' ||
    selectedNode.id === 'entry-node' ||
    selectedNode.data.label?.toLowerCase() === 'home' ||
    selectedNode.id?.toLowerCase().includes('entry') ||
    selectedNode.id?.toLowerCase().includes('home');

  // Calculate overall confidence for node verifications
  const getNodeConfidenceInfo = (): { score: number | null; text: string } => {
    if (!selectedNode.data.verifications || selectedNode.data.verifications.length === 0) {
      return { score: null, text: 'unknown' };
    }

    // Get all verifications with results (use local updates if available)
    const verificationsWithResults = selectedNode.data.verifications.filter((v, index) => {
      const localResults = localVerificationUpdates[index];
      const results = localResults || v.last_run_result;
      return results && results.length > 0;
    });

    if (verificationsWithResults.length === 0) {
      return { score: null, text: 'unknown' };
    }

    // Calculate average confidence across all verifications (use local updates if available)
    const confidenceScores = verificationsWithResults.map((v, index) => {
      const localResults = localVerificationUpdates[index];
      const results = localResults || v.last_run_result;
      return calculateConfidenceScore(results);
    });
    const averageConfidence =
      confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;

    return {
      score: averageConfidence,
      text: `${(averageConfidence * 100).toFixed(0)}%`,
    };
  };

  const confidenceInfo = getNodeConfidenceInfo();

  return (
    <>
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 240,
          p: 1.5,
          zIndex: 1000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
                {selectedNode.data.label}
              </Typography>
              {/* Show confidence percentage with color coding if available */}
              {confidenceInfo.score !== null && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color:
                      confidenceInfo.score >= 0.7
                        ? '#4caf50' // Green for 70%+
                        : confidenceInfo.score >= 0.5
                          ? '#ff9800' // Orange for 50-70%
                          : '#f44336', // Red for <50%
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {confidenceInfo.text}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event from bubbling to ReactFlow pane
                onClose();
              }}
              sx={{ p: 0.25 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Parent and Depth Info */}
          <Box sx={{ mb: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>
            <Typography variant="caption" display="block">
              <strong>Depth:</strong> {selectedNode.data.depth || 0}
            </Typography>
            <Typography variant="caption" display="block">
              <strong>Parent:</strong> {getParentNames(selectedNode.data.parent || [])}
            </Typography>
          </Box>

          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Edit and Delete buttons */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                onClick={handleEdit}
              >
                Edit
              </Button>
              {/* Only show delete button if not a protected node */}
              {!isProtectedNode && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                  onClick={onDelete}
                >
                  Delete
                </Button>
              )}
            </Box>

            {/* Reset button */}
            {onReset && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                sx={{ fontSize: '0.75rem', px: 1 }}
                onClick={() => setShowResetConfirm(true)}
              >
                Reset Node
              </Button>
            )}

            {/* Save Screenshot button - only shown when device is under control */}
            {showSaveScreenshotButton && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontSize: '0.75rem', px: 1 }}
                onClick={() => setShowScreenshotConfirm(true)}
                startIcon={<CameraIcon fontSize="small" />}
              >
                Screenshot
              </Button>
            )}

            {/* Go To button - only shown for non-root nodes when device is under control */}
            {showGoToButton && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontSize: '0.75rem', px: 1 }}
                onClick={() => setShowGotoPanel(true)}
                startIcon={<RouteIcon fontSize="small" />}
              >
                Go To
              </Button>
            )}

            {/* Verification button - only shown when verification controllers are available and node has verifications */}
            {showVerificationButton && (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={{ fontSize: '0.75rem', px: 1 }}
                onClick={() => setShowVerificationConfirm(true)}
                startIcon={<VerifiedIcon fontSize="small" />}
              >
                Verify ({selectedNode.data.verifications?.length || 0})
              </Button>
            )}

            {/* Direct Run Verifications button - show when verifications exist */}
            {hasNodeVerifications && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontSize: '0.75rem', px: 1 }}
                onClick={handleRunVerifications}
                disabled={!canRunVerifications}
                startIcon={<VerifiedIcon fontSize="small" />}
                title={
                  !isControlActive || !selectedHost
                    ? 'Device control required to run verifications'
                    : ''
                }
              >
                {isRunningVerifications ? 'Running...' : 'Run Verifications'}
              </Button>
            )}

            {/* Debug: Show when node has no verifications */}
            {!hasNodeVerifications && (
              <Typography
                variant="caption"
                sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' }}
              >
                No verifications configured
              </Typography>
            )}

            {/* Linear Progress - shown when running verifications */}
            {isRunningVerifications && <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />}

            {/* Verification result display */}
            {verificationResult && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 0.5,
                  bgcolor: verificationResult.includes('❌')
                    ? 'error.light'
                    : verificationResult.includes('⚠️')
                      ? 'warning.light'
                      : 'success.light',
                  borderRadius: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}
                >
                  {verificationResult}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Render the NodeGotoPanel when showGotoPanel is true */}
      {showGotoPanel && treeId && (
        <NodeGotoPanel
          selectedNode={selectedNode}
          nodes={nodes}
          treeId={treeId}
          onClose={() => setShowGotoPanel(false)}
          currentNodeId={currentNodeId}
        />
      )}

      {/* Reset Node Confirmation Dialog */}
      <Dialog open={showResetConfirm} onClose={() => setShowResetConfirm(false)}>
        <DialogTitle>Reset Node</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to reset this node ?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetConfirm(false)}>Cancel</Button>
          <Button onClick={handleResetConfirm} color="warning" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Screenshot Confirmation Dialog */}
      <Dialog open={showScreenshotConfirm} onClose={() => setShowScreenshotConfirm(false)}>
        <DialogTitle>Take Screenshot</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to take a screenshot ?<br />
            This will overwrite the current screenshot.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScreenshotConfirm(false)}>Cancel</Button>
          <Button onClick={handleScreenshotConfirm} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verification Confirmation Dialog */}
      <Dialog
        open={showVerificationConfirm}
        onClose={() => setShowVerificationConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Execute Verification</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Execute {selectedNode.data.verifications?.length || 0} verification(s) for this node?
          </Typography>

          {/* Show verification list summary */}
          {selectedNode.data.verifications && selectedNode.data.verifications.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Verifications to execute:
              </Typography>
              <List dense>
                {selectedNode.data.verifications.map((verification: any, index: number) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {verification.label || verification.id}
                          </Typography>
                          <Chip
                            label={verification.controller_type || 'unknown'}
                            size="small"
                            variant="outlined"
                            color={
                              verification.controller_type === 'image' ? 'primary' : 'secondary'
                            }
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {verification.command} - {verification.description || 'No description'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Show controller status */}
          <Box sx={{ mt: 2, p: 1, borderRadius: 1, border: '1px dashed', borderColor: 'grey.300' }}>
            <Typography variant="caption" display="block" color="text.secondary">
              Controller Status:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip
                label="Image"
                size="small"
                color={
                  verificationControllerStatus?.image_controller_available ? 'success' : 'default'
                }
                variant={
                  verificationControllerStatus?.image_controller_available ? 'filled' : 'outlined'
                }
              />
              <Chip
                label="Text"
                size="small"
                color={
                  verificationControllerStatus?.text_controller_available ? 'success' : 'default'
                }
                variant={
                  verificationControllerStatus?.text_controller_available ? 'filled' : 'outlined'
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVerificationConfirm(false)}>Cancel</Button>
          <Button onClick={handleVerificationConfirm} color="secondary" variant="contained">
            Execute Verifications
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
