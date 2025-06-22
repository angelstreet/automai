import {
  Close as CloseIcon,
  Camera as CameraIcon,
  Route as RouteIcon,
  Verified as VerifiedIcon,
  CheckCircle as CheckCircleIcon,
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
  LinearProgress,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { UINavigationNode, NodeForm } from '../../types/pages/Navigation_Types';

import { NodeGotoPanel } from './Navigation_NodeGotoPanel';

interface NodeSelectionPanelProps {
  selectedNode: UINavigationNode;
  nodes: UINavigationNode[];
  onClose: () => void;
  onDelete: () => void;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  setIsNodeDialogOpen: (open: boolean) => void;
  onReset?: (id: string) => void;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  // Device control props
  isControlActive?: boolean;
  selectedHost?: Host; // Full host object for API calls
  // Navigation props
  treeId?: string;
  currentNodeId?: string;
  // ❌ DELETED: Obsolete verification props after capture-first implementation
}

export const NodeSelectionPanel: React.FC<NodeSelectionPanelProps> = React.memo(
  ({
    selectedNode,
    nodes,
    onClose,
    onDelete,
    setNodeForm,
    setIsNodeDialogOpen,
    onReset,
    onUpdateNode,
    isControlActive = false,
    selectedHost,
    treeId = '',
    currentNodeId,
    // ❌ DELETED: Obsolete verification props removed
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

    // Add states for verification execution
    const [isRunningVerifications, setIsRunningVerifications] = useState(false);
    const [verificationResult, setVerificationResult] = useState<string | null>(null);

    // Add state for screenshot save status
    const [screenshotSaveStatus, setScreenshotSaveStatus] = useState<'idle' | 'success' | 'error'>(
      'idle',
    );

    // Clear verification results when node selection changes
    useEffect(() => {
      setVerificationResult(null);
      setScreenshotSaveStatus('idle'); // Reset screenshot status when node changes
    }, [selectedNode.id, selectedNode.data.verifications]);

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
      console.log('[@component:NodeSelectionPanel] Screenshot button clicked - DEBUG INFO:', {
        isControlActive,
        selectedHost: selectedHost
          ? { host_name: selectedHost.host_name, device_model: selectedHost.device_model }
          : null,
        selectedNodeLabel: selectedNode.data.label,
        onUpdateNode: !!onUpdateNode,
      });

      if (!isControlActive || !selectedHost) {
        console.warn(
          '[@component:NodeSelectionPanel] Cannot take screenshot - device control not active or host not available',
        );
        setShowScreenshotConfirm(false);
        return;
      }

      try {
        setScreenshotSaveStatus('idle'); // Reset status before starting

        const response = await fetch('/server/navigation/save-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            filename: selectedNode.data.label, // Use node name as filename
            device_model: selectedHost.device_model || 'android_mobile', // Add device model
          }),
        });

        const result = await response.json();

        if (result.success && result.screenshot_url) {
          // Update the node with the complete URL from backend
          if (onUpdateNode) {
            const timestamp = Date.now();
            const updatedNodeData = {
              ...selectedNode.data,
              screenshot: result.screenshot_url, // Store complete URL from backend
              screenshot_timestamp: timestamp, // Add timestamp to force image refresh
            };
            onUpdateNode(selectedNode.id, updatedNodeData);

            // Simple but effective cache-busting: dispatch event with unique cache-buster
            const cacheBuster = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
            window.dispatchEvent(
              new CustomEvent('nodeScreenshotUpdated', {
                detail: {
                  nodeId: selectedNode.id,
                  screenshot: result.screenshot_url,
                  cacheBuster: cacheBuster,
                },
              }),
            );
          } else {
            console.warn(
              '[@component:NodeSelectionPanel] onUpdateNode callback not provided - screenshot URL not saved to node',
            );
          }

          // Set success status and auto-hide after 3 seconds
          setScreenshotSaveStatus('success');
          setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
        } else {
          console.error(
            '[@component:NodeSelectionPanel] Screenshot failed:',
            result.error || 'Unknown error',
          );
          setScreenshotSaveStatus('error');
          setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
        }
      } catch (error) {
        console.error('[@component:NodeSelectionPanel] Screenshot request failed:', error);
        setScreenshotSaveStatus('error');
        setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
      }

      setShowScreenshotConfirm(false);
    };

    // ❌ REMOVED: updateVerificationResults - confidence tracking moved to database

    // Execute all node verifications with direct API call
    const handleRunVerifications = async () => {
      if (!selectedNode.data.verifications || selectedNode.data.verifications.length === 0) {
        return;
      }

      if (!selectedHost) {
        setVerificationResult('❌ No host device selected');
        return;
      }

      setIsRunningVerifications(true);
      setVerificationResult(null);

      try {
        // Step 1: Take screenshot
        console.log('[@component:NodeSelectionPanel] Taking screenshot for verification...');

        const screenshotResponse = await fetch('/server/av/take-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: selectedHost }),
        });

        const screenshotResult = await screenshotResponse.json();

        if (!screenshotResult.success || !screenshotResult.screenshot_url) {
          setVerificationResult('❌ Failed to capture screenshot for verification');
          return;
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

          console.log('[@component:NodeSelectionPanel] Extracted filename from URL:', {
            screenshotUrl,
            pathname,
            capture_filename,
          });
        } catch (urlError) {
          // Fallback: extract filename directly from URL string
          capture_filename = screenshotUrl.split('/').pop()?.split('?')[0];
          console.log(
            '[@component:NodeSelectionPanel] Fallback filename extraction:',
            capture_filename,
          );
        }

        if (!capture_filename) {
          setVerificationResult('❌ Failed to extract filename from screenshot URL');
          return;
        }

        console.log('[@component:NodeSelectionPanel] Using capture filename:', capture_filename);

        // Step 2: Prepare verifications exactly like the editor
        const verifications = selectedNode.data.verifications.map((verification) => ({
          ...verification,
          verification_type: verification.verification_type || 'text',
        }));

        // Step 3: Execute verifications using the same pattern as the editor
        const verificationResponse = await fetch('/server/verification/batch/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost, // Send full host object (same as editor)
            verifications: verifications, // Send verifications directly (same as editor)
            source_filename: capture_filename, // Use extracted filename (same as editor)
          }),
        });

        const verificationResult = await verificationResponse.json();

        console.log(
          '[@component:NodeSelectionPanel] Verification batch result:',
          verificationResult,
        );
        console.log(
          '[@component:NodeSelectionPanel] Verification result keys:',
          Object.keys(verificationResult),
        );
        console.log(
          '[@component:NodeSelectionPanel] Verification results:',
          verificationResult.results,
        );

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

          setVerificationResult([summaryMessage, '', ...results].join('\n'));
        } else if (verificationResult.success === false && verificationResult.error) {
          // Only treat as error if there's an actual error and no results (same as editor)
          const errorMessage =
            verificationResult.message || verificationResult.error || 'Unknown error occurred';
          console.log(
            '[@component:NodeSelectionPanel] Batch execution failed with error:',
            errorMessage,
          );
          setVerificationResult(`❌ Verification failed: ${errorMessage}`);
        } else {
          // Fallback case - no results and no clear error (same as editor)
          console.log('[@component:NodeSelectionPanel] No results received from batch execution');
          setVerificationResult('❌ No verification results received');
        }
      } catch (err: any) {
        console.error('[@component:NodeSelectionPanel] Error executing verifications:', err);
        setVerificationResult(`❌ Error running verifications: ${err.message}`);
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

    // DEBUG: Log button visibility state
    console.log('[@component:NodeSelectionPanel] Button visibility state:', {
      isControlActive,
      selectedHost: !!selectedHost,
      showSaveScreenshotButton,
      selectedNodeLabel: selectedNode.data.label,
    });

    // Check if Go To button should be displayed
    // Show for all nodes when device is under control
    const showGoToButton = isControlActive && selectedHost && treeId;

    // Check if verification button should be displayed
    const hasNodeVerifications =
      selectedNode.data.verifications && selectedNode.data.verifications.length > 0;

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

    // ❌ REMOVED: Confidence calculation moved to database
    // TODO: Replace with database query in Step 2
    const confidenceInfo = { score: null, text: 'unknown' };

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
                  disabled={!isControlActive || !selectedHost}
                  title={
                    !isControlActive || !selectedHost ? 'Device control required to edit nodes' : ''
                  }
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                    onClick={() => {
                      console.log('[@component:NodeSelectionPanel] Screenshot button clicked!');
                      setShowScreenshotConfirm(true);
                    }}
                    startIcon={<CameraIcon fontSize="small" />}
                  >
                    Screenshot
                  </Button>
                  {/* Success indicator */}
                  {screenshotSaveStatus === 'success' && (
                    <CheckCircleIcon
                      fontSize="small"
                      sx={{
                        color: 'success.main',
                        animation: 'fadeIn 0.3s ease-in',
                      }}
                    />
                  )}
                </Box>
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
      </>
    );
  },
);
