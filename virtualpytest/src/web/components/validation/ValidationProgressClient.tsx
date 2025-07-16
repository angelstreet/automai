import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import React from 'react';

import { useValidation } from '../../hooks/validation';

interface ValidationProgressClientProps {
  treeId: string;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  onUpdateEdge?: (edgeId: string, updatedData: any) => void;
}

const ValidationProgressClient: React.FC<ValidationProgressClientProps> = ({ treeId }) => {
  const validation = useValidation(treeId);

  // Only show progress dialog when validation is running
  if (!validation.isValidating) {
    return null;
  }

  return (
    <Dialog open={validation.isValidating} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={24} />
          <Typography variant="h6">Running Validation</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" gutterBottom>
            Testing all navigation paths...
          </Typography>
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This may take a few moments depending on the number of edges in your navigation tree.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationProgressClient;
