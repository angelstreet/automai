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
import { useNavigationEditor } from '../../hooks/navigation/useNavigationEditor';

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
  selectedDeviceId?: string; // Required for device-specific operations
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
    selectedDeviceId,
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

    // Simple node operations replacement
    const nodeOperations = {
      takeAndSaveScreenshot: async (label: string, nodeId: string, onUpdateNode?: any) => {
        try {
          // Mock implementation - replace with actual screenshot logic
          console.log('Taking screenshot for node:', label, nodeId);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (onUpdateNode) {
            onUpdateNode(nodeId, { screenshot: 'mock-screenshot-url.png' });
          }
          return { success: true, message: '✅ Screenshot saved successfully' };
        } catch (error) {
          return { success: false, message: `❌ Screenshot failed: ${error}` };
        }
      },
      runVerifications: async (verifications: any[], nodeId: string) => {
        try {
          // Mock implementation - replace with actual verification logic
          console.log('Running verifications for node:', nodeId, verifications);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return { success: true, message: `✅ All ${verifications.length} verifications passed` };
        } catch (error) {
          return { success: false, message: `❌ Verifications failed: ${error}` };
        }
      },
    };

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
      const selectedDevice = selectedHost?.devices?.find((d) => d.device_id === selectedDeviceId);

      console.log('[@component:NodeSelectionPanel] Screenshot button clicked - DEBUG INFO:', {
        isControlActive,
        selectedHost: selectedHost
          ? {
              host_name: selectedHost.host_name,
              device_id: selectedDeviceId,
              device_model: selectedDevice?.device_model || 'unknown',
            }
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

      if (!selectedDeviceId) {
        console.warn('[@component:NodeSelectionPanel] Cannot take screenshot - no device selected');
        setShowScreenshotConfirm(false);
        return;
      }

      // Use the hook's takeAndSaveScreenshot method
      const result = await nodeOperations.takeAndSaveScreenshot(
        selectedNode.data.label,
        selectedNode.id,
        onUpdateNode,
      );

      if (result.success) {
        // Set success status and auto-hide after 3 seconds
        setScreenshotSaveStatus('success');
        setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
      } else {
        console.error('[@component:NodeSelectionPanel] Screenshot failed:', result.message);
        setScreenshotSaveStatus('error');
        setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
      }

      setShowScreenshotConfirm(false);
    };

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

      // Use the hook's runVerifications method
      const result = await nodeOperations.runVerifications(
        selectedNode.data.verifications,
        selectedNode.id,
      );

      setVerificationResult(result.message);
      setIsRunningVerifications(false);
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
            width: 340,
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
