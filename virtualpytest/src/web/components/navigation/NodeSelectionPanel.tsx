import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Close as CloseIcon,
  Camera as CameraIcon,
  Route as RouteIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { UINavigationNode, NodeForm } from '../../types/navigationTypes';
import { NodeGotoPanel } from './NodeGotoPanel';

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
  // Device control props
  isControlActive?: boolean;
  selectedDevice?: string | null;
  onTakeScreenshot?: () => void;
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
  isControlActive = false,
  selectedDevice = null,
  onTakeScreenshot,
  treeId = '',
  currentNodeId,
  onVerification,
  isVerificationActive = false,
  verificationControllerStatus,
}) => {
  // Don't render the panel for entry nodes
  if ((selectedNode.data.type as string) === 'entry') {
    return null;
  }

  // Add state to control showing/hiding the NodeGotoPanel
  const [showGotoPanel, setShowGotoPanel] = useState(false);
  
  // Add states for confirmation dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showScreenshotConfirm, setShowScreenshotConfirm] = useState(false);
  const [showVerificationConfirm, setShowVerificationConfirm] = useState(false);

  const handleEdit = () => {
    setNodeForm({
      label: selectedNode.data.label,
      type: selectedNode.data.type,
      description: selectedNode.data.description || '',
      screenshot: selectedNode.data.screenshot,
      depth: selectedNode.data.depth || 0,
      parent: selectedNode.data.parent || [],
      menu_type: selectedNode.data.menu_type,
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

  const handleScreenshotConfirm = () => {
    if (onTakeScreenshot) {
      onTakeScreenshot();
    }
    setShowScreenshotConfirm(false);
  };

  const handleVerificationConfirm = () => {
    if (onVerification && selectedNode.data.verifications) {
      onVerification(selectedNode.id, selectedNode.data.verifications);
    }
    setShowVerificationConfirm(false);
  };

  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';
    
    const parentNames = parentIds.map(id => {
      const parentNode = nodes.find(node => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });
    
    return parentNames.join(' > ');
  };

  // Check if screenshot button should be displayed
  const showScreenshotButton = isControlActive && selectedDevice && onTakeScreenshot;
  
  // Check if Go To button should be displayed
  // Show for all nodes when device is under control
  const showGoToButton = isControlActive && selectedDevice && treeId;

  // Check if verification button should be displayed
  const hasNodeVerifications = selectedNode.data.verifications && 
                             selectedNode.data.verifications.length > 0;
  const hasAvailableControllers = verificationControllerStatus?.image_controller_available || 
                                verificationControllerStatus?.text_controller_available;
  const showVerificationButton = isVerificationActive && 
                               hasAvailableControllers && 
                               hasNodeVerifications &&
                               onVerification;

  // Check if node can be deleted (protect entry points and home nodes)
  const isProtectedNode = selectedNode.data.is_root || 
                         selectedNode.data.type === 'entry' ||
                         selectedNode.id === 'entry-node' ||
                         selectedNode.data.label?.toLowerCase() === 'home' ||
                         selectedNode.id?.toLowerCase().includes('entry') ||
                         selectedNode.id?.toLowerCase().includes('home');

  return (
    <>
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 200,
          p: 1.5,
          zIndex: 1000,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
              {selectedNode.data.label}
            </Typography>
            <IconButton
              size="small"
              onClick={onClose}
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
            {/* Show verification count if available */}
            {hasNodeVerifications && (
              <Typography variant="caption" display="block">
                <strong>Verifications:</strong> {selectedNode.data.verifications?.length || 0}
              </Typography>
            )}
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

            {/* Screenshot button - only shown when device is under control */}
            {showScreenshotButton && (
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
          <Typography>
            Are you sure you want to reset this node ?
          </Typography>
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
      <Dialog open={showVerificationConfirm} onClose={() => setShowVerificationConfirm(false)} maxWidth="sm" fullWidth>
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
                            color={verification.controller_type === 'image' ? 'primary' : 'secondary'}
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
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" display="block" color="text.secondary">
              Controller Status:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip 
                label="Image" 
                size="small" 
                color={verificationControllerStatus?.image_controller_available ? 'success' : 'default'}
                variant={verificationControllerStatus?.image_controller_available ? 'filled' : 'outlined'}
              />
              <Chip 
                label="Text" 
                size="small" 
                color={verificationControllerStatus?.text_controller_available ? 'success' : 'default'}
                variant={verificationControllerStatus?.text_controller_available ? 'filled' : 'outlined'}
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