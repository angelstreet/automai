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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
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

  const progress = validation.validationProgress;

  // Show loading state if validation is starting but no progress data yet
  if (!progress) {
    return (
      <Dialog open={validation.isValidating} disableEscapeKeyDown maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} />
            <Typography variant="h6">Starting Validation</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              Preparing validation sequence...
            </Typography>
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const progressPercentage =
    progress.totalSteps > 0 ? (progress.currentStep / progress.totalSteps) * 100 : 0;

  return (
    <Dialog open={validation.isValidating} disableEscapeKeyDown maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={24} />
          <Typography variant="h6">Running Validation</Typography>
          <Chip
            label={`${progress.currentStep}/${progress.totalSteps}`}
            color="primary"
            size="small"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* Overall Progress */}
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Overall Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {progressPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          {/* Current Edge */}
          {progress.currentEdge && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Currently Validating:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <PlayArrowIcon color="primary" />
                <Typography variant="body1" fontWeight="medium">
                  {progress.currentEdge.from_name} → {progress.currentEdge.to_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ({progress.currentEdge.from_node} → {progress.currentEdge.to_node})
                </Typography>
              </Box>
            </Box>
          )}

          {/* Completed Edges */}
          {progress.completedEdges.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Completed Edges:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                {progress.completedEdges.map((edge, index) => (
                  <ListItem key={`${edge.from_name}-${edge.to_name}-${index}`}>
                    <ListItemIcon>
                      {edge.success ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <ErrorIcon color="error" fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${edge.from_name} → ${edge.to_name}`}
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={edge.success ? 'Success' : 'Failed'}
                            color={edge.success ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                          {edge.execution_time > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              {edge.execution_time.toFixed(1)}s
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Summary */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label={`${progress.completedEdges.filter((e) => e.success).length} Successful`}
              color="success"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${progress.completedEdges.filter((e) => !e.success).length} Failed`}
              color="error"
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${progress.totalSteps - progress.currentStep} Remaining`}
              color="default"
              variant="outlined"
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Each edge is validated using NavigationExecutor with automatic node verification.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationProgressClient;
