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
  Divider,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useValidation } from '../hooks/useValidation';

interface ValidationPreviewClientProps {
  treeId: string;
}

export default function ValidationPreviewClient({ treeId }: ValidationPreviewClientProps) {
  const { showPreview, previewData, lastResult, closePreview, runValidation, viewLastResult } = useValidation(treeId);
  const [showDetails, setShowDetails] = useState(false);

  if (!showPreview) return null;

  return (
    <Dialog 
      open={showPreview} 
      onClose={closePreview} 
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
        }
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ bgcolor: 'background.paper', pb: 0 }}>
        Validation Preview
      </DialogTitle>
      
      <Divider />
      
      {/* Content */}
      <DialogContent sx={{ bgcolor: 'background.paper', p: 3 }}>
        {!previewData ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Loading preview...</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>Test Scope</Typography>
            
            <Grid container spacing={3} mb={3}>
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
            
            {/* Details Section */}
            <Box mt={2}>
              <Button
                onClick={() => setShowDetails(!showDetails)}
                startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                variant="outlined"
                size="small"
                sx={{ mb: 1 }}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              
              <Collapse in={showDetails}>
                <Box mt={2}>
                  {/* Reachable Edges List */}
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Navigation Paths ({previewData.totalEdges})
                  </Typography>
                  <List dense>
                    {previewData.reachableEdges?.map((edge, index) => (
                      <ListItem key={`${edge.from}-${edge.to}-${index}`} sx={{ py: 0, px: 1 }}>
                        <ListItemText
                          primary={`${edge.fromName || edge.from} → ${edge.toName || edge.to}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    )) || (
                      <ListItem sx={{ py: 0, px: 1 }}>
                        <ListItemText
                          primary="Edge details not available"
                          primaryTypographyProps={{ variant: 'body2', style: { fontStyle: 'italic' } }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </DialogContent>
      
      <Divider />
      
      {/* Footer */}
      <DialogActions sx={{ bgcolor: 'background.paper', p: 2 }}>
        <Button onClick={closePreview} color="inherit">
          Cancel
        </Button>
        
        {/* Last Result Button - Show if there's a cached result */}
        {lastResult && (
          <Button 
            variant="outlined" 
            onClick={viewLastResult}
            startIcon={<HistoryIcon />}
            color="info"
            sx={{ mr: 1 }}
          >
            Last Result
          </Button>
        )}
        
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