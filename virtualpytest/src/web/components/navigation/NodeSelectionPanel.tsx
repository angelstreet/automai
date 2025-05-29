import React from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { UINavigationNode, NodeForm } from '../../types/navigationTypes';

interface NodeSelectionPanelProps {
  selectedNode: UINavigationNode;
  nodes: UINavigationNode[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChildren: () => void;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  setIsNodeDialogOpen: (open: boolean) => void;
  onReset?: () => void;
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
}) => {
  const handleEdit = () => {
    setNodeForm({
      label: selectedNode.data.label,
      type: selectedNode.data.type,
      description: selectedNode.data.description || '',
      depth: selectedNode.data.depth || 0,
      parent: selectedNode.data.parent || [],
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

  return (
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
            <Button
              size="small"
              variant="outlined"
              color="error"
              sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
              onClick={onDelete}
            >
              Delete
            </Button>
          </Box>
          
          {/* Reset button */}
          {onReset && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              sx={{ fontSize: '0.75rem', px: 1 }}
              onClick={onReset}
            >
              Reset Node
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}; 