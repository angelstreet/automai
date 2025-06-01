import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
} from '@mui/material';

interface NodeForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu' | 'entry';
  description: string;
  screenshot?: string;
  depth?: number;
  parent?: string[];
}

interface UINavigationNode {
  id: string;
  data: {
    label: string;
  };
}

interface NodeEditDialogProps {
  isOpen: boolean;
  nodeForm: NodeForm;
  nodes: UINavigationNode[];
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  onSubmit: () => void;
  onClose: () => void;
  onResetNode?: () => void;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  isOpen,
  nodeForm,
  nodes,
  setNodeForm,
  onSubmit,
  onClose,
  onResetNode,
}) => {
  // Helper function to get parent names from IDs
  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None'; // Safety check for undefined nodes
    
    const parentNames = parentIds.map(id => {
      const parentNode = nodes.find(node => node.id === id);
      return parentNode ? parentNode.data.label : id; // Fallback to ID if node not found
    });
    
    return parentNames.join(' > ');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Node</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Node Name"
            value={nodeForm.label}
            onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
            fullWidth
            required
            error={!nodeForm.label.trim()}
            helperText={!nodeForm.label.trim() ? "Node name is required" : ""}
          />
          
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={nodeForm.type}
              label="Type"
              onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value as any })}
            >
              <MenuItem value="screen">Screen</MenuItem>
              <MenuItem value="dialog">Dialog</MenuItem>
              <MenuItem value="popup">Popup</MenuItem>
              <MenuItem value="overlay">Overlay</MenuItem>
              <MenuItem value="menu">Menu</MenuItem>
              <MenuItem value="entry">Entry Point</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Description"
            value={nodeForm.description}
            onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
            multiline
            rows={3}
            fullWidth
          />
          
          {/* Screenshot URL Field - only show for non-entry nodes */}
          {nodeForm.type !== 'entry' && (
            <TextField
              label="Screenshot URL"
              value={nodeForm.screenshot || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
              fullWidth
              placeholder="Enter screenshot URL or path"
              helperText="URL or file path to the screenshot image"
            />
          )}
          
          {/* Parent and Depth Info (Read-only) */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Depth"
              value={nodeForm.depth || 0}
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              size="small"
            />
            <TextField
              label="Parent"
              value={getParentNames(nodeForm.parent || [])}
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              size="small"
            />
          </Box>
          
          {/* Entry node note */}
          {nodeForm.type === 'entry' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              Entry points are automatically positioned. Edit the connecting edge to change entry method and details.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {onResetNode && (
          <Button 
            onClick={onResetNode}
            variant="outlined"
            color="warning"
            sx={{ mr: 'auto' }}
          >
            Reset Node
          </Button>
        )}
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={!nodeForm.label.trim()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 