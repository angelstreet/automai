'use client';

import { 
  Box, 
  LinearProgress, 
  Typography, 
  Paper, 
  Fade,
  Chip
} from '@mui/material';
import { useEffect } from 'react';
import { useValidation } from '../hooks/useValidation';
import { useValidationStore } from '../store/validationStore';
import { useValidationColors } from '../../hooks/useValidationColors';
import { getValidationStatusFromConfidence } from '../../../config/validationColors';

interface ValidationProgressClientProps {
  treeId: string;
}

export default function ValidationProgressClient({ treeId }: ValidationProgressClientProps) {
  const { isValidating, progress, showProgress } = useValidation(treeId);
  const { 
    setCurrentTestingNode, 
    setCurrentTestingEdge,
    setNodeValidationStatus,
    setEdgeValidationStatus
  } = useValidationStore();
  
  // Import the reset function from useValidationColors
  const { resetForNewValidation } = useValidationColors(treeId);

  // Update current testing indicators based on progress
  useEffect(() => {
    if (progress && isValidating) {
      console.log('[@component:ValidationProgressClient] Updating testing indicators', {
        currentEdgeFrom: progress.currentEdgeFrom,
        currentEdgeTo: progress.currentEdgeTo,
        currentNodeName: progress.currentNodeName
      });

      // Set current testing node
      if (progress.currentEdgeTo) {
        setCurrentTestingNode(progress.currentEdgeTo);
      }

      // Set current testing edge
      if (progress.currentEdgeFrom && progress.currentEdgeTo) {
        const edgeId = `${progress.currentEdgeFrom}-${progress.currentEdgeTo}`;
        setCurrentTestingEdge(edgeId);
      }

      // Update validation status based on edge status
      if (progress.currentEdgeStatus && progress.currentEdgeStatus !== 'testing') {
        const edgeId = `${progress.currentEdgeFrom}-${progress.currentEdgeTo}`;
        
        // Determine validation status from edge status
        let validationStatus: 'high' | 'medium' | 'low' | 'untested' = 'untested';
        let confidence = 0;

        switch (progress.currentEdgeStatus) {
          case 'success':
            // For successful edges, we'll assume high confidence unless we have actual data
            validationStatus = 'high';
            confidence = 0.8;
            break;
          case 'failed':
            validationStatus = 'low';
            confidence = 0;
            break;
          case 'skipped':
            validationStatus = 'untested';
            confidence = 0;
            break;
          case 'completed':
            // Use medium confidence for completed without explicit success/failure
            validationStatus = 'medium';
            confidence = 0.6;
            break;
        }

        if (progress.currentEdgeFrom && progress.currentEdgeTo) {
          // Update edge status
          setEdgeValidationStatus(edgeId, {
            status: validationStatus,
            confidence,
            lastTested: new Date()
          });

          // Update target node status
          setNodeValidationStatus(progress.currentEdgeTo, {
            status: validationStatus,
            confidence,
            lastTested: new Date()
          });

          console.log('[@component:ValidationProgressClient] Updated validation status', {
            edgeId,
            nodeId: progress.currentEdgeTo,
            status: validationStatus,
            confidence
          });
        }
      }
    }
  }, [progress, isValidating, setCurrentTestingNode, setCurrentTestingEdge, setNodeValidationStatus, setEdgeValidationStatus]);

  // Clear testing indicators when validation stops
  useEffect(() => {
    if (!isValidating) {
      console.log('[@component:ValidationProgressClient] Clearing testing indicators');
      setCurrentTestingNode(null);
      setCurrentTestingEdge(null);
    }
  }, [isValidating, setCurrentTestingNode, setCurrentTestingEdge]);

  // Reset all colors when validation starts
  useEffect(() => {
    if (isValidating && progress?.currentStep === 1) {
      console.log('[@component:ValidationProgressClient] Validation starting - resetting all colors to grey');
      resetForNewValidation();
    }
  }, [isValidating, progress?.currentStep, resetForNewValidation]);

  // Also reset when validation first becomes true (backup detection)
  useEffect(() => {
    if (isValidating && !progress) {
      console.log('[@component:ValidationProgressClient] Validation started (no progress yet) - resetting all colors to grey');
      resetForNewValidation();
    }
  }, [isValidating, progress, resetForNewValidation]);

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
              {progress.currentEdgeFrom && progress.currentEdgeTo 
                ? `${progress.currentEdgeFromName || progress.currentEdgeFrom} → ${progress.currentEdgeToName || progress.currentEdgeTo}` 
                : progress.currentNodeName || 'Preparing...'}
            </Typography>
            
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="textSecondary">
                {progress.currentStep} of {progress.totalSteps}
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

           
          </>
        )}
      </Paper>
    </Fade>
  );
} 