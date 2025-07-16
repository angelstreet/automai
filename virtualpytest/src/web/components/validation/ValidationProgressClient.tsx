import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Chip,
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
    hasProgress: !!validation.progress,
    shouldShow: validation.isValidating,
    timestamp: new Date().toISOString(),
    hookInstance: 'SHARED_STATE',
  });

  // Only show progress dialog when validation is running
  if (!validation.isValidating || !validation.progress) {
    console.log(
      '[@ValidationProgressClient] Not showing - isValidating:',
      validation.isValidating,
      'hasProgress:',
      !!validation.progress,
    );
    return null;
  }

  console.log('[@ValidationProgressClient] Showing progress dialog (SHARED)');

  const { progress } = validation;
  const { currentStep, totalSteps, steps, isRunning } = progress;

  // Get the current step being executed
  const currentStepData = steps.find((step) => step.status === 'running') || steps[currentStep - 1];

  // Calculate progress percentage
  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  // Get status icon and color for current step
  const getStatusDisplay = () => {
    if (!currentStepData) return { icon: <PlayArrowIcon />, color: 'primary' };

    switch (currentStepData.status) {
      case 'success':
        return { icon: <CheckCircleIcon />, color: 'success' };
      case 'failed':
        return { icon: <ErrorIcon />, color: 'error' };
      case 'running':
        return { icon: <CircularProgress size={20} />, color: 'primary' };
      default:
        return { icon: <PlayArrowIcon />, color: 'primary' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Dialog open={validation.isValidating} disableEscapeKeyDown maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Running Validation</Typography>
          <Chip
            label={`${currentStep}/${totalSteps}`}
            color="primary"
            size="small"
            variant="outlined"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 1 }}>
          {/* Current Step Display */}
          <Box sx={{ mb: 1 }}>

            {/* Current Step Details */}
            {currentStepData && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.200',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {statusDisplay.icon}
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {currentStepData.fromName} → {currentStepData.toName}
                  </Typography>
                  <Chip
                    label={currentStepData.status.toUpperCase()}
                    size="small"
                    color={statusDisplay.color as any}
                    variant="outlined"
                  />
                </Box>

                {/* Error message if failed */}
                {currentStepData.error && (
                  <Typography variant="body2" color="error.main" sx={{ fontSize: '0.875rem' }}>
                    Error: {currentStepData.error}
                  </Typography>
                )}

                {/* Execution time if completed */}
                {currentStepData.executionTime && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    Execution time: {currentStepData.executionTime.toFixed(1)}s
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {progressPercentage.toFixed(1)}% complete
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationProgressClient;
