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
import { UINavigationEdge, EdgeForm } from '../../types/navigationTypes';

interface EdgeSelectionPanelProps {
  selectedEdge: UINavigationEdge;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  setIsEdgeDialogOpen: (open: boolean) => void;
}

export const EdgeSelectionPanel: React.FC<EdgeSelectionPanelProps> = ({
  selectedEdge,
  onClose,
  onEdit,
  onDelete,
  setEdgeForm,
  setIsEdgeDialogOpen,
}) => {
  const handleEdit = () => {
    setEdgeForm({
      action: selectedEdge.data?.action || '',
      go: selectedEdge.data?.go || '',
      comeback: selectedEdge.data?.comeback || '',
      description: selectedEdge.data?.description || '',
    });
    setIsEdgeDialogOpen(true);
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
            Edge Selection
          </Typography>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ p: 0.25 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Show Edge Type */}
        {selectedEdge.data?.edgeType && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            Type: {selectedEdge.data.edgeType === 'top' ? 'Top (Blue)' : selectedEdge.data.edgeType === 'bottom' ? 'Bottom (Red)' : 'Default'}
          </Typography>
        )}
        
        {/* Show From/To information */}
        {selectedEdge.data?.from && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            From: {selectedEdge.data.from}
          </Typography>
        )}
        {selectedEdge.data?.to && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            To: {selectedEdge.data.to}
          </Typography>
        )}
        
        {selectedEdge.data?.action && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            Action: {selectedEdge.data.action}
          </Typography>
        )}
        
        {selectedEdge.data?.go && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            Go Action: {selectedEdge.data.go}
          </Typography>
        )}
        
        {selectedEdge.data?.comeback && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            Return Action: {selectedEdge.data.comeback}
          </Typography>
        )}
        
        {selectedEdge.data?.description && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            Description: {selectedEdge.data.description}
          </Typography>
        )}
        
        <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.75rem', px: 1 }}
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            sx={{ fontSize: '0.75rem', px: 1 }}
            onClick={onDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}; 