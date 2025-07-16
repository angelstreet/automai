'use client';

import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
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
  Divider,
  IconButton,
} from '@mui/material';
import React from 'react';

import { useValidation } from '../../hooks/validation';

interface ValidationResultsClientProps {
  treeId: string;
}

const ValidationResultsClient: React.FC<ValidationResultsClientProps> = ({ treeId }) => {
  const validation = useValidation(treeId);

  const handleClose = () => {
    validation.setShowResults(false);
  };

  if (!validation.showResults || !validation.validationResults) {
    return null;
  }

  const { summary, edgeResults } = validation.validationResults;

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'success';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent':
      case 'good':
        return <CheckCircleIcon />;
      case 'fair':
        return <WarningIcon />;
      case 'poor':
        return <ErrorIcon />;
      default:
        return <CheckCircleIcon />;
    }
  };

  return (
    <Dialog open={validation.showResults} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Validation Results</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip
              icon={getHealthIcon(summary.overallHealth)}
              label={`Overall Health: ${summary.overallHealth.toUpperCase()}`}
              color={getHealthColor(summary.overallHealth)}
              variant="outlined"
            />
            <Chip
              icon={<CheckCircleIcon />}
              label={`${summary.validNodes} Successful`}
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<ErrorIcon />}
              label={`${summary.errorNodes} Failed`}
              color="error"
              variant="outlined"
            />
            <Chip
              icon={<WarningIcon />}
              label={`${summary.skippedEdges} Skipped`}
              color="warning"
              variant="outlined"
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            Total execution time: {summary.executionTime.toFixed(1)}s
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Edge Results */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Edge Test Results ({edgeResults.length})
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Actions</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {edgeResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip
                        icon={result.success ? <CheckCircleIcon /> : <ErrorIcon />}
                        label={result.success ? 'SUCCESS' : 'FAILED'}
                        color={result.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{result.fromName}</TableCell>
                    <TableCell>{result.toName}</TableCell>
                    <TableCell>
                      {result.actionsExecuted || 0}/{result.totalActions || 0}
                    </TableCell>
                    <TableCell>
                      {result.executionTime ? `${result.executionTime.toFixed(1)}s` : '-'}
                    </TableCell>
                    <TableCell>
                      {result.errors && result.errors.length > 0 ? (
                        <Typography variant="body2" color="error.main" sx={{ fontSize: '0.75rem' }}>
                          {result.errors[0]}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Additional Info */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Each edge was validated using NavigationExecutor with automatic node verification.
            Results include both navigation execution and target node verification outcomes.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ValidationResultsClient;
