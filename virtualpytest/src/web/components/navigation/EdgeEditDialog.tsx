import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

interface EdgeForm {     
  go?: string;          // Forward action
  comeback?: string;    // Return action  
  description: string;
}

interface EdgeEditDialogProps {
  isOpen: boolean;
  edgeForm: EdgeForm;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  onSubmit: () => void;
  onClose: () => void;
}

export const EdgeEditDialog: React.FC<EdgeEditDialogProps> = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  onSubmit,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Navigation</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Navigation Action"
            value={edgeForm.action || ''}
            onChange={(e) => setEdgeForm({ ...edgeForm, action: e.target.value })}
            placeholder="e.g., RIGHT, ENTER, OK, BACK, ESC"
            fullWidth
            helperText="Action to navigate between screens"
          />
          
          <TextField
            label="Description"
            value={edgeForm.description}
            onChange={(e) => setEdgeForm({ ...edgeForm, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
            helperText="Optional description for this navigation"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={!edgeForm.action}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 