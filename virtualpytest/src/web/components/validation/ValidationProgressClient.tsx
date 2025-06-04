'use client';

import { 
  Box, 
  LinearProgress, 
  Typography, 
  Paper, 
  Fade,
  Chip
} from '@mui/material';
import { useValidation } from '../hooks/useValidation';

interface ValidationProgressClientProps {
  treeId: string;
}

export default function ValidationProgressClient({ treeId }: ValidationProgressClientProps) {
  const { isValidating, progress, showProgress } = useValidation(treeId);

  if (!showProgress || !isValidating) return null;

  const progressPercentage = progress 
    ? Math.round((progress.currentStep / progress.totalSteps) * 100)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'skipped': return 'default';
      case 'testing': return 'primary';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success': return 'SUCCESS';
      case 'failed': return 'FAILED';
      case 'skipped': return 'SKIPPED';
      case 'testing': return 'TESTING';
      case 'completed': return 'COMPLETED';
      default: return status.toUpperCase();
    }
  };

  return (
    <Fade in={isValidating && showProgress}>
      <Paper 
        elevation={4} 
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20, 
          p: 2, 
          width: 400,
          maxHeight: 500,
          bgcolor: 'background.paper',
          borderRadius: 2,
          zIndex: 1300,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden'
        }}
      >
        <Typography variant="body2" gutterBottom fontWeight="medium">
          Validating Navigation Edges... ({progressPercentage}%)
        </Typography>
        
        <LinearProgress 
          variant="determinate"
          value={progressPercentage}
          sx={{ 
            height: 6, 
            borderRadius: 3,
            bgcolor: 'action.hover',
            mb: 1
          }} 
        />
        
        {progress && (
          <>
            <Typography variant="caption" color="textSecondary" display="block" mb={1}>
              Testing edge: {progress.currentEdgeFrom && progress.currentEdgeTo 
                ? `${progress.currentEdgeFromName || progress.currentEdgeFrom} → ${progress.currentEdgeToName || progress.currentEdgeTo}` 
                : progress.currentNodeName || 'Preparing...'}
            </Typography>
            
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="textSecondary">
                Edge {progress.currentStep} of {progress.totalSteps}
              </Typography>
              
              {progress.currentEdgeStatus && progress.currentEdgeStatus !== 'completed' && (
                <Chip 
                  label={getStatusLabel(progress.currentEdgeStatus)}
                  color={getStatusColor(progress.currentEdgeStatus)}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>

            {progress.retryAttempt && progress.retryAttempt > 0 && (
              <Typography variant="caption" color="info.main" display="block" mb={1}>
                Retry attempt {progress.retryAttempt}
              </Typography>
            )}
          </>
        )}
      </Paper>
    </Fade>
  );
} 