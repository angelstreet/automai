import {
  Close as CloseIcon,
  Camera as CameraIcon,
  Route as RouteIcon,
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
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
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

    // Get device data context to access loaded verifications
    const { getVerifications } = useDeviceData();

    // Add state to control showing/hiding the NodeGotoPanel
    const [showGotoPanel, setShowGotoPanel] = useState(false);

    // Real screenshot implementation using existing working routes
    const takeAndSaveScreenshot = async (label: string, nodeId: string, onUpdateNode?: any) => {
      if (!selectedHost || !selectedDeviceId) {
        console.error(
          '[@component:NodeSelectionPanel] Cannot take screenshot - host or device not available',
        );
        return { success: false, message: 'Host or device not available' };
      }

      try {
        console.log(
          `[@component:NodeSelectionPanel] Taking screenshot for node: ${nodeId} (${label})`,
        );

        // Use the existing screenshot endpoint
        const response = await fetch('/server/navigation/takeNodeScreenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            device_id: selectedDeviceId,
            node_id: nodeId,
            label: label,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(
            `[@component:NodeSelectionPanel] Screenshot saved successfully: ${result.screenshot_url}`,
          );

          // Update the node with the new screenshot URL
          if (onUpdateNode) {
            onUpdateNode(nodeId, { screenshot: result.screenshot_url });
          }

          return { success: true, screenshot_url: result.screenshot_url };
        } else {
          console.error(`[@component:NodeSelectionPanel] Screenshot failed: ${result.message}`);
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('[@component:NodeSelectionPanel] Screenshot error:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    // Clear the goto panel when the component unmounts or when a new node is selected
    useEffect(() => {
      // Close the goto panel when the selected node changes
      setShowGotoPanel(false);
    }, [selectedNode.id]);

    // Add states for confirmation dialogs
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showScreenshotConfirm, setShowScreenshotConfirm] = useState(false);

    // Add state for screenshot save status
    const [screenshotSaveStatus, setScreenshotSaveStatus] = useState<'idle' | 'success' | 'error'>(
      'idle',
    );

    // Clear screenshot status when node selection changes
    useEffect(() => {
      setScreenshotSaveStatus('idle');
    }, [selectedNode.id]);

    const handleEdit = () => {
      // Get loaded verifications from device context
      const allVerifications = getVerifications();

      // Match verification_ids with actual verification objects
      const nodeVerifications = [];
      if (selectedNode.data.verification_ids && selectedNode.data.verification_ids.length > 0) {
        for (const verificationId of selectedNode.data.verification_ids) {
          const verification = allVerifications.find((v) => v.verification_id === verificationId);
          if (verification) {
            nodeVerifications.push(verification);
          }
        }
      }

      console.log(
        `[@component:NodeSelectionPanel] Found ${nodeVerifications.length} verifications for node ${selectedNode.data.label}`,
      );

      setNodeForm({
        label: selectedNode.data.label,
        type: selectedNode.data.type,
        description: selectedNode.data.description || '',
        screenshot: selectedNode.data.screenshot,
        depth: selectedNode.data.depth || 0,
        parent: selectedNode.data.parent || [],
        menu_type: selectedNode.data.menu_type,
        verifications: nodeVerifications, // Use matched verifications from device context
        verification_ids: selectedNode.data.verification_ids || [],
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

      // Use the real takeAndSaveScreenshot function
      const result = await takeAndSaveScreenshot(
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

    // Verification functionality removed - use VerificationEditor component instead

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
                <strong>Parent:</strong> {getParentNames(selectedNode.data.parent || [])} -{' '}
                <strong>Depth:</strong> {selectedNode.data.depth || 0}
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
