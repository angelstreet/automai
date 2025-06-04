'use client';

import { 
  Box, 
  LinearProgress, 
  Typography, 
  Paper, 
  Fade, 
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
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
          Validating Navigation Tree... ({progressPercentage}%)
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
              Testing node: {progress.currentNodeName || progress.currentNode}
            </Typography>
            
            <Typography variant="caption" color="textSecondary" display="block" mb={1}>
              Step {progress.currentStep} of {progress.totalSteps}
            </Typography>

            {progress && progress.completedNodes && progress.completedNodes.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" fontWeight="medium" display="block" mb={1}>
                  Results ({progress.completedNodes.length} completed):
                </Typography>
                
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <List dense sx={{ py: 0 }}>
                    {progress.completedNodes.slice().reverse().map((node, index) => (
                      <ListItem key={`${node.nodeId}-${index}`} sx={{ py: 0.5, px: 0 }}>
                        <Box display="flex" alignItems="center" width="100%">
                          {node.isValid ? (
                            <CheckCircleIcon color="success" sx={{ fontSize: 16, mr: 1 }} />
                          ) : (
                            <ErrorIcon color="error" sx={{ fontSize: 16, mr: 1 }} />
                          )}
                          
                          <Box flexGrow={1} minWidth={0}>
                            <Typography variant="caption" noWrap>
                              {node.nodeName}
                            </Typography>
                            {node.errors.length > 0 && (
                              <Typography variant="caption" color="error" display="block" noWrap>
                                {node.errors[0]}
                              </Typography>
                            )}
                          </Box>
                          
                          <Chip 
                            label={node.isValid ? 'Pass' : 'Fail'}
                            color={node.isValid ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                            sx={{ ml: 1, fontSize: '0.6rem', height: 18 }}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </>
            )}
          </>
        )}
      </Paper>
    </Fade>
  );
} 