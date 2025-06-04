'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  IconButton,
} from '@mui/material';
import { 
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon 
} from '@mui/icons-material';
import { useValidation } from '../hooks/useValidation';

interface ValidationResultsClientProps {
  treeId: string;
}

export default function ValidationResultsClient({ treeId }: ValidationResultsClientProps) {
  const { showResults, results, closeResults } = useValidation(treeId);

  if (!showResults || !results) return null;

  const healthColor = results.summary.overallHealth === 'excellent' ? 'success' :
                     results.summary.overallHealth === 'poor' ? 'error' : 
                     results.summary.overallHealth === 'fair' ? 'warning' : 'info';

  const successRate = results.summary.totalNodes > 0 
    ? (results.summary.validNodes / results.summary.totalNodes) * 100 
    : 0;

  return (
    <Dialog 
      open={showResults} 
      onClose={closeResults} 
      maxWidth="lg" 
      fullWidth
      disableEscapeKeyDown
      sx={{ zIndex: 1400 }}
    >
      <DialogTitle sx={{ bgcolor: 'background.paper' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">Validation Results</Typography>
            <Chip 
              label={results.summary.overallHealth.toUpperCase()}
              color={healthColor}
              size="small"
            />
          </Box>
          <IconButton onClick={closeResults} size="small" sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: 'background.default', p: 3 }}>
        {/* Summary Section */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>Summary</Typography>
          
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <LinearProgress 
              variant="determinate" 
              value={successRate}
              sx={{ 
                flexGrow: 1, 
                height: 10, 
                borderRadius: 5,
                bgcolor: 'action.hover'
              }}
              color={healthColor}
            />
            <Typography variant="body2" fontWeight="bold" minWidth="50px">
              {Math.round(successRate)}%
            </Typography>
          </Box>
          
          <Typography variant="body2" color="textSecondary" mb={1}>
            {results.summary.validNodes} of {results.summary.totalNodes} nodes validated successfully
          </Typography>
          
          <Typography variant="body2" color="textSecondary">
            Execution time: {results.summary.executionTime} seconds
          </Typography>
        </Box>

        {/* Node Results Table */}
        <Typography variant="h6" gutterBottom>Node Details</Typography>
        
        <TableContainer 
          component={Paper} 
          variant="outlined" 
          sx={{ 
            bgcolor: 'background.paper',
            maxHeight: 400,
            '& .MuiTableHead-root': {
              '& .MuiTableCell-root': {
                bgcolor: 'action.hover',
                fontWeight: 'bold'
              }
            }
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Node Name</TableCell>
                <TableCell align="center">Path Length</TableCell>
                <TableCell>Errors</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.nodeResults.map((node) => (
                <TableRow 
                  key={node.nodeId}
                  sx={{
                    '&:nth-of-type(odd)': {
                      bgcolor: 'action.hover',
                    },
                    '&:hover': {
                      bgcolor: 'inherit',
                    },
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {node.isValid ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <ErrorIcon color="error" fontSize="small" />
                      )}
                      <Chip 
                        label={node.isValid ? 'Valid' : 'Error'}
                        color={node.isValid ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {node.nodeName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {node.nodeId}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {node.pathLength} {node.pathLength === 1 ? 'step' : 'steps'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {node.errors.length > 0 ? (
                      <Box>
                        {node.errors.map((error, index) => (
                          <Typography 
                            key={index} 
                            variant="caption" 
                            color="error" 
                            display="block"
                          >
                            {error}
                          </Typography>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No errors
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ bgcolor: 'background.paper', p: 2, gap: 1 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={closeResults} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
} 