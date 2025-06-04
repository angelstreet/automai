'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { useValidation } from '../hooks/useValidation';

interface ValidationPreviewClientProps {
  treeId: string;
}

export default function ValidationPreviewClient({ treeId }: ValidationPreviewClientProps) {
  const { showPreview, previewData, closePreview, runValidation } = useValidation(treeId);

  if (!showPreview) return null;

  return (
    <Dialog 
      open={showPreview} 
      onClose={closePreview} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
      sx={{ zIndex: 1400 }}
    >
      <DialogTitle sx={{ bgcolor: 'background.paper' }}>
        <Typography variant="h6">Validation Preview</Typography>
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: 'background.default', p: 3 }}>
        {!previewData ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Loading preview...</Typography>
          </Box>
        ) : (
          <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Test Scope</Typography>
              
              <Grid container spacing={3} mb={2}>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {previewData.totalNodes}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total Nodes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {previewData.totalEdges}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total Edges
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary" fontWeight="bold">
                      {previewData.reachableNodes.length}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Reachable Nodes
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Box 
                mt={2} 
                p={2} 
                sx={{ 
                  bgcolor: 'action.hover', 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="body2" color="textPrimary">
                  <strong>Estimated Time:</strong> ~{previewData.estimatedTime} seconds
                </Typography>
                <Typography variant="body2" color="textSecondary" mt={0.5}>
                  This validation will test pathfinding to all reachable nodes and verify navigation paths.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </DialogContent>
      
      <DialogActions sx={{ bgcolor: 'background.paper', p: 2 }}>
        <Button onClick={closePreview} color="inherit">
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={runValidation}
          disabled={!previewData}
          startIcon={<PlayArrowIcon />}
          color="primary"
        >
          Run Validation
        </Button>
      </DialogActions>
    </Dialog>
  );
} 