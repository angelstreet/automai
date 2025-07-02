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
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useNode } from '../../hooks/navigation/useNode';
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
}

// Custom comparison function for React.memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps: NodeSelectionPanelProps, nextProps: NodeSelectionPanelProps) => {
  // Compare primitive values
  if (
    prevProps.isControlActive !== nextProps.isControlActive ||
    prevProps.selectedDeviceId !== nextProps.selectedDeviceId ||
    prevProps.treeId !== nextProps.treeId ||
    prevProps.currentNodeId !== nextProps.currentNodeId
  ) {
    return false;
  }

  // Compare selectedNode (most likely to change)
  if (
    prevProps.selectedNode.id !== nextProps.selectedNode.id ||
    prevProps.selectedNode.data.label !== nextProps.selectedNode.data.label ||
    prevProps.selectedNode.data.screenshot !== nextProps.selectedNode.data.screenshot
  ) {
    return false;
  }

  // Compare selectedHost by reference and key properties
  if (prevProps.selectedHost !== nextProps.selectedHost) {
    if (!prevProps.selectedHost || !nextProps.selectedHost) {
      return false;
    }
    if (
      prevProps.selectedHost.host_name !== nextProps.selectedHost.host_name ||
      prevProps.selectedHost.devices?.length !== nextProps.selectedHost.devices?.length
    ) {
      return false;
    }
  }

  // Only compare nodes array length (full comparison would be too expensive)
  if (prevProps.nodes.length !== nextProps.nodes.length) {
    return false;
  }

  return true;
};

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
  }) => {
    // Don't render the panel for entry nodes - MUST be before any hooks
    if ((selectedNode.data.type as string) === 'entry') {
      return null;
    }

    // Memoize hook props to prevent unnecessary hook re-executions
    const nodeHookProps = useMemo(
      () => ({
        selectedHost,
        selectedDeviceId,
        isControlActive,
        treeId,
        currentNodeId,
      }),
      [selectedHost, selectedDeviceId, isControlActive, treeId, currentNodeId],
    );

    // Use the consolidated node hook
    const nodeHook = useNode(nodeHookProps);

    // Add state to control showing/hiding the NodeGotoPanel
    const [showGotoPanel, setShowGotoPanel] = useState(false);

    // Add states for confirmation dialogs
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showScreenshotConfirm, setShowScreenshotConfirm] = useState(false);

    // Clear the goto panel when the component unmounts or when a new node is selected
    useEffect(() => {
      // Close the goto panel when the selected node changes
      setShowGotoPanel(false);
    }, [selectedNode.id]);

    // Memoize handlers to prevent unnecessary re-renders of child components
    const handleEdit = useCallback(() => {
      const nodeForm = nodeHook.getNodeFormWithVerifications(selectedNode);
      setNodeForm(nodeForm);
      setIsNodeDialogOpen(true);
    }, [nodeHook, selectedNode, setNodeForm, setIsNodeDialogOpen]);

    // Confirmation handlers
    const handleResetConfirm = useCallback(() => {
      if (onReset) {
        onReset(selectedNode.id);
      }
      setShowResetConfirm(false);
    }, [onReset, selectedNode.id]);

    const handleScreenshotConfirm = useCallback(async () => {
      await nodeHook.handleScreenshotConfirm(selectedNode, onUpdateNode);
      setShowScreenshotConfirm(false);
    }, [nodeHook, selectedNode, onUpdateNode]);

    // Get memoized button visibility from hook
    const { showSaveScreenshotButton, showGoToButton } = nodeHook.getButtonVisibility();

    const isProtected = useMemo(
      () => nodeHook.isProtectedNode(selectedNode),
      [nodeHook, selectedNode],
    );

    // Memoize parent names calculation
    const parentNames = useMemo(
      () => nodeHook.getParentNames(selectedNode.data.parent || [], nodes),
      [nodeHook, selectedNode.data.parent, nodes],
    );

    // ❌ REMOVED: Confidence calculation moved to database
    // TODO: Replace with database query in Step 2
    const confidenceInfo = useMemo(() => ({ score: null, text: 'unknown' }), []);

    // Memoize event handlers to prevent unnecessary re-renders
    const handleCloseClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event from bubbling to ReactFlow pane
        onClose();
      },
      [onClose],
    );

    const handlePaperClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const handleScreenshotButtonClick = useCallback(() => {
      setShowScreenshotConfirm(true);
    }, []);

    const handleGoToButtonClick = useCallback(() => {
      setShowGotoPanel(true);
    }, []);

    const handleGotoPanelClose = useCallback(() => {
      setShowGotoPanel(false);
    }, []);

    const handleResetConfirmClose = useCallback(() => {
      setShowResetConfirm(false);
    }, []);

    const handleResetButtonClick = useCallback(() => {
      setShowResetConfirm(true);
    }, []);

    const handleScreenshotConfirmClose = useCallback(() => {
      setShowScreenshotConfirm(false);
    }, []);

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
          onClick={handlePaperClick}
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
              <IconButton size="small" onClick={handleCloseClick} sx={{ p: 0.25 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Parent and Depth Info */}
            <Box sx={{ mb: 1.5, fontSize: '0.75rem', color: 'text.secondary' }}>
              <Typography variant="caption" display="block">
                <strong>Parent:</strong> {parentNames} - <strong>Depth:</strong>{' '}
                {selectedNode.data.depth || 0}
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
                {!isProtected && (
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
                  onClick={handleResetButtonClick}
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
                    onClick={handleScreenshotButtonClick}
                    startIcon={<CameraIcon fontSize="small" />}
                  >
                    Screenshot
                  </Button>
                  {/* Success indicator */}
                  {nodeHook.screenshotSaveStatus === 'success' && (
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
                  onClick={handleGoToButtonClick}
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
            onClose={handleGotoPanelClose}
            currentNodeId={currentNodeId}
          />
        )}

        {/* Reset Node Confirmation Dialog */}
        <Dialog open={showResetConfirm} onClose={handleResetConfirmClose}>
          <DialogTitle>Reset Node</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to reset this node ?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleResetConfirmClose}>Cancel</Button>
            <Button onClick={handleResetConfirm} color="warning" variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        {/* Screenshot Confirmation Dialog */}
        <Dialog open={showScreenshotConfirm} onClose={handleScreenshotConfirmClose}>
          <DialogTitle>Take Screenshot</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to take a screenshot ?<br />
              This will overwrite the current screenshot.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleScreenshotConfirmClose}>Cancel</Button>
            <Button onClick={handleScreenshotConfirm} color="primary" variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  },
  arePropsEqual, // Use custom comparison function
);
