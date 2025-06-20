import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from '@mui/material';
import React from 'react';

import { UseVerificationEditorType } from '../../../hooks/verification/useVerificationEditor';

interface VerificationResultModalProps {
  verification: UseVerificationEditorType;
}

export const VerificationResultModal: React.FC<VerificationResultModalProps> = ({
  verification,
}) => {
  const {
    showConfirmDialog,
    handleConfirmOverwrite,
    handleCancelOverwrite,
    referenceName,
    referenceType,
  } = verification;

  return (
    <Dialog
      open={showConfirmDialog}
      onClose={handleCancelOverwrite}
      PaperProps={{
        sx: {
          backgroundColor: '#2E2E2E',
          color: '#ffffff',
        },
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>
        Warning: Overwrite Reference
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
          A {referenceType} reference named "{referenceName}" already exists.
          <br />
          Do you want to overwrite it?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ gap: 1, p: 2 }}>
        <Button
          onClick={handleCancelOverwrite}
          variant="outlined"
          size="small"
          sx={{
            borderColor: '#666',
            color: '#ffffff',
            fontSize: '0.75rem',
            '&:hover': {
              borderColor: '#888',
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmOverwrite}
          variant="contained"
          size="small"
          sx={{
            bgcolor: '#f44336',
            fontSize: '0.75rem',
            '&:hover': {
              bgcolor: '#d32f2f',
            },
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VerificationResultModal;
