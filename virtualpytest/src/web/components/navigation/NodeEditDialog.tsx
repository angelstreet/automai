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
} from '@mui/material';

interface NodeForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu';
  description: string;
}

interface NodeEditDialogProps {
  isOpen: boolean;
  nodeForm: NodeForm;
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  onSubmit: () => void;
  onClose: () => void;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  isOpen,
  nodeForm,
  setNodeForm,
  onSubmit,
  onClose,
}) => {
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
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