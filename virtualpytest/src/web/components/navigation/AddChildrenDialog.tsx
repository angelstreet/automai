import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';

interface ChildForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay';
  description: string;
  toAction: string;
  fromAction: string;
}

interface AddChildrenDialogProps {
  isOpen: boolean;
  childForm: ChildForm;
  setChildForm: React.Dispatch<React.SetStateAction<ChildForm>>;
  onSubmit: () => void;
  onClose: () => void;
}

export const AddChildrenDialog: React.FC<AddChildrenDialogProps> = ({
  isOpen,
  childForm,
  setChildForm,
  onSubmit,
  onClose,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (childForm.label.trim()) {
      onSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Children Node</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Child Node Name"
            value={childForm.label}
            onChange={(e) => setChildForm({ ...childForm, label: e.target.value })}
            fullWidth
            required
            error={!childForm.label.trim()}
            helperText={!childForm.label.trim() ? "Node name is required" : ""}
          />
          
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={childForm.type}
              label="Type"
              onChange={(e) => setChildForm({ ...childForm, type: e.target.value as any })}
            >
              <MenuItem value="screen">Screen</MenuItem>
              <MenuItem value="dialog">Dialog</MenuItem>
              <MenuItem value="popup">Popup</MenuItem>
              <MenuItem value="overlay">Overlay</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Description"
            value={childForm.description}
            onChange={(e) => setChildForm({ ...childForm, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
          
          <TextField
            label="Action to Navigate to Child"
            value={childForm.toAction}
            onChange={(e) => setChildForm({ ...childForm, toAction: e.target.value })}
            placeholder="e.g., ENTER, RIGHT, CLICK"
            fullWidth
            helperText="Action to go from parent to child"
          />
          
          <TextField
            label="Action to Return to Parent"
            value={childForm.fromAction}
            onChange={(e) => setChildForm({ ...childForm, fromAction: e.target.value })}
            placeholder="e.g., BACK, ESC, CANCEL"
            fullWidth
            helperText="Action to go from child back to parent"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!childForm.label.trim()}
        >
          Add Child
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 