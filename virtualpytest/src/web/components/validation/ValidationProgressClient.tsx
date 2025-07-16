import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
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

  // Calculate progress percentage
  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  // Get status icon for each step
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'failed':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'running':
        return <CircularProgress size={20} sx={{ color: 'primary.main' }} />;
      case 'pending':
      default:
        return <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
    }
  };

  // Get status color for step text
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success.main';
      case 'failed':
        return 'error.main';
      case 'running':
        return 'primary.main';
      case 'pending':
      default:
        return 'text.secondary';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'SUCCESS';
      case 'failed':
        return 'FAILED';
      case 'running':
        return 'RUNNING';
      case 'pending':
      default:
        return 'PENDING';
    }
  };

  return (
    <Dialog open={validation.isValidating} disableEscapeKeyDown maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isRunning ? <CircularProgress size={24} /> : <PlayArrowIcon />}
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
        <Box sx={{ py: 2 }}>
          {/* Overall Progress */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              {isRunning
                ? `Testing navigation path ${currentStep} of ${totalSteps}...`
                : `Validation completed: ${currentStep}/${totalSteps} steps`}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progressPercentage.toFixed(1)}% complete
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Step-by-step Progress */}
          <Typography variant="h6" gutterBottom>
            Validation Steps
          </Typography>

          <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
            {steps.map((step, index) => (
              <ListItem key={index} divider>
                <ListItemIcon sx={{ minWidth: 40 }}>{getStatusIcon(step.status)}</ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: step.status === 'running' ? 'bold' : 'normal',
                          color: getStatusColor(step.status),
                        }}
                      >
                        {step.stepNumber}. {step.fromName} → {step.toName}
                      </Typography>
                      <Chip
                        label={getStatusText(step.status)}
                        size="small"
                        color={
                          step.status === 'success'
                            ? 'success'
                            : step.status === 'failed'
                              ? 'error'
                              : step.status === 'running'
                                ? 'primary'
                                : 'default'
                        }
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                  }
                  secondary={
                    step.error ? (
                      <Typography variant="body2" color="error.main" sx={{ fontSize: '0.75rem' }}>
                        Error: {step.error}
                      </Typography>
                    ) : step.executionTime ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Execution time: {step.executionTime.toFixed(1)}s
                      </Typography>
                    ) : null
                  }
                />
              </ListItem>
            ))}
          </List>

          {/* Current Step Highlight */}
          {isRunning && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1, opacity: 0.1 }}>
              <Typography variant="body2" color="primary.main">
                Currently executing step {currentStep} of {totalSteps}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationProgressClient;
