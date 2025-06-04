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

  // Calculate success rate based on edge results (excluding skipped)
  const totalEdges = results.edgeResults?.length || 0;
  const successfulEdges = results.edgeResults?.filter(edge => edge.success).length || 0;
  const skippedEdges = results.edgeResults?.filter(edge => edge.skipped).length || 0;
  const executedEdges = totalEdges - skippedEdges;
  const edgeSuccessRate = executedEdges > 0 ? (successfulEdges / executedEdges) * 100 : 0;

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

      <DialogContent sx={{ bgcolor: 'background.default', p: 1  }}>
        {/* Summary Section */}
        <Box mb={1}>
          <Typography variant="h6" gutterBottom>Summary</Typography>
          
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <LinearProgress 
              variant="determinate" 
              value={edgeSuccessRate}
              sx={{ 
                flexGrow: 1, 
                height: 10, 
                borderRadius: 5,
                bgcolor: 'action.hover'
              }}
              color={healthColor}
            />
            <Typography variant="body2" fontWeight="bold" minWidth="50px">
              {Math.round(edgeSuccessRate)}%
            </Typography>
          </Box>
          
          <Typography variant="body2" color="textSecondary" mb={1}>
            {successfulEdges} of {executedEdges} navigation edges validated successfully
          </Typography>
          
          {results.summary.skippedEdges > 0 && (
            <Typography variant="body2" color="textSecondary" mb={1}>
              {results.summary.skippedEdges} edges skipped due to unreachable dependencies
            </Typography>
          )}
          
          <Typography variant="body2" color="textSecondary">
            Execution time: {results.summary.executionTime} seconds
          </Typography>
        </Box>

        {/* Edge Results Table */}
        <Typography variant="h6" gutterBottom>Edge Validation Results</Typography>
        
        <TableContainer 
          component={Paper} 
          variant="outlined" 
          sx={{ 
            bgcolor: 'background.paper',
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
                <TableCell>From → To</TableCell>
                <TableCell>Errors</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.edgeResults?.map((edge, index) => (
                <TableRow 
                  key={`${edge.from}-${edge.to}-${index}`}
                  sx={{
                    '&:nth-of-type(odd)': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {edge.success ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : edge.skipped ? (
                        <ErrorIcon color="disabled" fontSize="small" />
                      ) : (
                        <ErrorIcon color="error" fontSize="small" />
                      )}
                      <Chip 
                        label={edge.success ? 'Success' : edge.skipped ? 'Skipped' : 'Failed'}
                        color={edge.success ? 'success' : edge.skipped ? 'default' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      <strong>{edge.fromName || edge.from}</strong>
                      {' → '}
                      <strong>{edge.toName || edge.to}</strong>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {edge.errors.length > 0 ? (
                      <Box>
                        {edge.errors.map((error, errorIndex) => (
                          <Typography 
                            key={errorIndex} 
                            variant="caption" 
                            color="error" 
                            display="block"
                          >
                            {error}
                          </Typography>
                        ))}
                      </Box>
                    ) : edge.skipped ? (
                      <Typography variant="body2" color="textSecondary">
                        Skipped due to parent edge failure
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No errors
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              )) || (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No edge results available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ bgcolor: 'background.paper', p: 0.5, gap: 0 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={closeResults} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
} 