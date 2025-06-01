import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Camera as CameraIcon,
  Route as RouteIcon,
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
}) => {
  // Add state to control showing/hiding the NodeGotoPanel
  const [showGotoPanel, setShowGotoPanel] = useState(false);

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
  // Only show for non-root nodes when device is under control
  const isRootNode = !selectedNode.data.parent || selectedNode.data.parent.length === 0;
  const showGoToButton = isControlActive && selectedDevice && treeId && !isRootNode;

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
                onClick={() => onReset(selectedNode.id)}
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
                onClick={onTakeScreenshot}
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
    </>
  );
}; 