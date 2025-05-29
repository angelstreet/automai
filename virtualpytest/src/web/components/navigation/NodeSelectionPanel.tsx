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
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddChildren: () => void;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  setIsNodeDialogOpen: (open: boolean) => void;
}

export const NodeSelectionPanel: React.FC<NodeSelectionPanelProps> = ({
  selectedNode,
  onClose,
  onEdit,
  onDelete,
  onAddChildren,
  setNodeForm,
  setIsNodeDialogOpen,
}) => {
  const handleEdit = () => {
    setNodeForm({
      label: selectedNode.data.label,
      type: selectedNode.data.type,
      description: selectedNode.data.description || '',
    });
    setIsNodeDialogOpen(true);
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
        
        {/* Children indicator */}
        {selectedNode.data.hasChildren && (
          <Typography variant="body2" color="success.main" gutterBottom sx={{ mb: 1 }}>
            💡 Double-click to explore child tree
          </Typography>
        )}
        
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* First row: Edit and Delete */}
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
          
          {/* Second row: Add Children */}
          <Button
            size="small"
            variant="outlined"
            color="success"
            sx={{ fontSize: '0.75rem', px: 1 }}
            onClick={onAddChildren}
          >
            Add Children
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}; 