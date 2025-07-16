import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import React, { useEffect } from 'react';

import { useValidation } from '../../hooks/validation';

interface ValidationProgressClientProps {
  treeId: string;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
  onUpdateEdge?: (edgeId: string, updatedData: any) => void;
}

const ValidationProgressClient: React.FC<ValidationProgressClientProps> = ({ treeId }) => {
  const validation = useValidation(treeId);

  // Log component lifecycle
  useEffect(() => {
    console.log('[@ValidationProgressClient] Component mounted for treeId:', treeId);
    return () => {
      console.log('[@ValidationProgressClient] Component unmounting for treeId:', treeId);
    };
  }, [treeId]);

  // Debug logging with shared state info
  console.log('[@ValidationProgressClient] Render state (SHARED):', {
    treeId,
    isValidating: validation.isValidating,
    shouldShow: validation.isValidating,
    timestamp: new Date().toISOString(),
    hookInstance: 'SHARED_STATE',
  });

  // Only show progress dialog when validation is running
  if (!validation.isValidating) {
    console.log('[@ValidationProgressClient] Not showing - isValidating is false (SHARED)');
    return null;
  }

  console.log('[@ValidationProgressClient] Showing progress dialog (SHARED)');

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
