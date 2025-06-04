'use client';

import { 
  Box, 
  LinearProgress, 
  Typography, 
  Paper, 
  Fade
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
                ? `${progress.currentEdgeFrom} → ${progress.currentEdgeTo}` 
                : progress.currentNodeName || 'Preparing...'}
            </Typography>
            
            <Typography variant="caption" color="textSecondary" display="block" mb={1}>
              Edge {progress.currentStep} of {progress.totalSteps}
            </Typography>

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