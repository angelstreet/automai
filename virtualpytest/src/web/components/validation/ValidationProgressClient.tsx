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

import { useValidationUI } from '../../hooks/validation';

interface ValidationProgressClientProps {
  treeId: string;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  onUpdateEdge?: (edgeId: string, updatedData: any) => void;
}

const ValidationProgressClient: React.FC<ValidationProgressClientProps> = ({ treeId }) => {
  const validation = useValidationUI(treeId);

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
            Executing navigation paths and testing edges...
          </Typography>

          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This may take a few minutes depending on the number of edges to test.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationProgressClient;
