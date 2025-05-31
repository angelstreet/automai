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
  type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu';
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
          
          {/* Screenshot Display Section */}
          {nodeForm.screenshot && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Current Screenshot:
              </Typography>
              <Box sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: '4px', 
                p: 1,
                backgroundColor: '#f5f5f5',
                textAlign: 'center'
              }}>
                <img 
                  src={nodeForm.screenshot} 
                  alt="Node Screenshot" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '200px', 
                    objectFit: 'contain',
                    borderRadius: '4px'
                  }}
                  onError={(e) => {
                    console.error('[@component:NodeEditDialog] Failed to load screenshot:', nodeForm.screenshot);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  Screenshot taken during navigation
                </Typography>
              </Box>
            </Box>
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