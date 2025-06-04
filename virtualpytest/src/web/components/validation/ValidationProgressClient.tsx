'use client';

import { Box, LinearProgress, Typography, Paper, Fade } from '@mui/material';
import { useValidation } from '../hooks/useValidation';

interface ValidationProgressClientProps {
  treeId: string;
}

export default function ValidationProgressClient({ treeId }: ValidationProgressClientProps) {
  const { isValidating } = useValidation(treeId);

  return (
    <Fade in={isValidating}>
      <Paper 
        elevation={4} 
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20, 
          p: 2, 
          minWidth: 300,
          bgcolor: 'background.paper',
          borderRadius: 2,
          zIndex: 1300,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography variant="body2" gutterBottom fontWeight="medium">
          Validating Navigation Tree...
        </Typography>
        
        <LinearProgress 
          sx={{ 
            height: 6, 
            borderRadius: 3,
            bgcolor: 'action.hover'
          }} 
        />
        
        <Typography variant="caption" color="textSecondary" mt={1} display="block">
          Testing pathfinding and node reachability
        </Typography>
      </Paper>
    </Fade>
  );
} 