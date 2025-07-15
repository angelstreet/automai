'use client';

import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
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
  LinearProgress,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { getValidationStatusFromConfidence } from '../../config/validationColors';
import { useHostManager } from '../../hooks/useHostManager';
import { useValidationUI, useValidationColors } from '../../hooks/validation';
import { useValidationStore } from '../store/validationStore';

interface ValidationResultsClientProps {
  treeId: string;
}

const ValidationResultsClient: React.FC<ValidationResultsClientProps> = ({ treeId }) => {
  const { selectedHost, selectedDeviceId } = useHostManager();
  const validation = useValidationUI(treeId, selectedHost, selectedDeviceId);
  const { showResults, results, closeResults } = validation;
  const {
    setNodeValidationStatus,
    setEdgeValidationStatus,
    setCurrentTestingNode,
    setCurrentTestingEdge,
  } = useValidationStore();

  // Import validation colors functions
  useValidationColors();

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Process validation results and update colors when results are available
  useEffect(() => {
    if (results?.edgeResults) {
      console.log(
        '[@component:ValidationResultsClient] Processing validation results for color updates',
      );

      // Clear testing indicators first
      setCurrentTestingNode(null);
      setCurrentTestingEdge(null);

      // Process each edge result and set final validation colors
      results.edgeResults.forEach((edge: any) => {
        const edgeId = `${edge.from}-${edge.to}`;

        // Calculate confidence based on action and verification success rates
        let confidence = 0;
        if (edge.success && !edge.skipped) {
          const actionSuccessRate =
            edge.actionResults?.length > 0
              ? edge.actionResults.filter((a: any) => a.success).length / edge.actionResults.length
              : 1;

          const verificationSuccessRate =
            edge.verificationResults?.length > 0
              ? edge.verificationResults.filter((v: any) => v.success).length /
                edge.verificationResults.length
              : 1;

          confidence = (actionSuccessRate + verificationSuccessRate) / 2;
        } else if (edge.skipped) {
          // Skipped edges remain untested (grey)
          confidence = 0;
        } else {
          // Failed edges get low confidence
          confidence = 0.1;
        }

        // Determine validation status
        const validationStatus = edge.skipped
          ? 'untested' // Skipped edges stay grey
          : edge.success
            ? getValidationStatusFromConfidence(confidence)
            : 'low'; // Failed edges are red

        console.log('[@component:ValidationResultsClient] Setting final validation status', {
          edgeId,
          nodeId: edge.to,
          status: validationStatus,
          confidence,
          success: edge.success,
          skipped: edge.skipped,
        });

        // Update edge validation status
        setEdgeValidationStatus(edgeId, {
          status: validationStatus,
          confidence,
          lastTested: new Date(),
        });

        // Update target node validation status
        setNodeValidationStatus(edge.to, {
          status: validationStatus,
          confidence,
          lastTested: new Date(),
        });
      });

      console.log(
        '[@component:ValidationResultsClient] Finished processing all validation results',
      );
    }
  }, [
    results,
    setNodeValidationStatus,
    setEdgeValidationStatus,
    setCurrentTestingNode,
    setCurrentTestingEdge,
  ]);

  // Handle dialog close
  const handleClose = () => {
    console.log('[@component:ValidationResultsClient] Closing results dialog');
    closeResults();
  };

  if (!showResults || !results) return null;

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate success rate based on edge results (excluding skipped)
  const totalEdges = results.edgeResults?.length || 0;
  const successfulEdges = results.edgeResults?.filter((edge) => edge.success).length || 0;
  const skippedEdges = results.edgeResults?.filter((edge) => edge.skipped).length || 0;
  const executedEdges = totalEdges - skippedEdges;
  const edgeSuccessRate = executedEdges > 0 ? (successfulEdges / executedEdges) * 100 : 0;

  // Improved health color calculation based on success rate percentage
  const getHealthColor = (successRate: number) => {
    if (successRate >= 70) return 'success'; // Green for 70% and above
    if (successRate >= 50) return 'warning'; // Orange/yellow for 50-69%
    return 'error'; // Red for below 50%
  };

  const healthColor = getHealthColor(edgeSuccessRate);

  // Get display color for overall health status
  const getOverallHealthColor = (health: string) => {
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

  return (
    <Dialog
      open={showResults}
      onClose={handleClose}
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
              color={getOverallHealthColor(results.summary.overallHealth)}
              size="small"
            />
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: 'background.default', p: 1 }}>
        {/* Summary Section */}
        <Box mb={1}>
          <Typography variant="h6" gutterBottom>
            Summary
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <LinearProgress
              variant="determinate"
              value={edgeSuccessRate}
              sx={{
                flexGrow: 1,
                height: 10,
                borderRadius: 5,
                bgcolor: 'action.hover',
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
        <Typography variant="h6" gutterBottom>
          Edge Validation Results
        </Typography>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            bgcolor: 'background.paper',
            '& .MuiTableHead-root': {
              '& .MuiTableCell-root': {
                bgcolor: 'action.hover',
                fontWeight: 'bold',
              },
            },
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell width="40px"></TableCell>
                <TableCell>Status</TableCell>
                <TableCell>From → To</TableCell>
                <TableCell width="100px">Duration</TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>Verifications</TableCell>
                <TableCell>Errors</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.edgeResults?.map((edge, index) => {
                // Check if edge has expandable content
                const hasExpandableContent =
                  (edge.actionResults && edge.actionResults.length > 0) ||
                  (edge.verificationResults && edge.verificationResults.length > 0);

                console.log(
                  `[@component:ValidationResultsClient] Edge ${index}: ${edge.fromName} → ${edge.toName}`,
                  {
                    hasActionResults: edge.actionResults?.length || 0,
                    hasVerificationResults: edge.verificationResults?.length || 0,
                    hasExpandableContent,
                    actionResults: edge.actionResults,
                    verificationResults: edge.verificationResults,
                  },
                );

                return (
                  <>
                    <TableRow
                      key={`${edge.from}-${edge.to}-${index}`}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'transparent !important',
                        },
                      }}
                    >
                      <TableCell>
                        {hasExpandableContent && (
                          <IconButton
                            size="small"
                            onClick={() => toggleRow(index)}
                            sx={{ p: 0.25 }}
                          >
                            {expandedRows.has(index) ? (
                              <KeyboardArrowDownIcon />
                            ) : (
                              <KeyboardArrowRightIcon />
                            )}
                          </IconButton>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {edge.success ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : edge.skipped ? (
                            <WarningIcon color="disabled" fontSize="small" />
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
                        <Typography variant="caption">
                          <strong>{edge.fromName || edge.from}</strong>
                          {' → '}
                          <strong>{edge.toName || edge.to}</strong>
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="textSecondary">
                          {edge.executionTime ? `${edge.executionTime.toFixed(2)}s` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {edge.totalActions && edge.totalActions > 0 && (
                            <Typography variant="body2">
                              {edge.actionsExecuted || 0}/{edge.totalActions}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {edge.verificationResults && edge.verificationResults.length > 0 && (
                            <Typography variant="body2">
                              {edge.verificationResults.filter((v) => v.success).length}/
                              {edge.verificationResults.length}
                            </Typography>
                          )}
                        </Box>
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
                        ) : null}
                      </TableCell>
                    </TableRow>

                    {/* Detailed Results Row */}
                    {expandedRows.has(index) && hasExpandableContent && (
                      <TableRow
                        sx={{
                          '&:hover': {
                            backgroundColor: 'transparent !important',
                          },
                        }}
                      >
                        <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                          <Collapse in={expandedRows.has(index)}>
                            <Box sx={{ p: 2, bgcolor: 'transparent' }}>
                              {/* Action Results */}
                              {edge.actionResults && edge.actionResults.length > 0 && (
                                <Box mb={1}>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: 'bold',
                                      mb: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    Actions Executed ({edge.actionResults.length}):
                                  </Typography>
                                  {edge.actionResults.map((action, actionIndex) => {
                                    // Debug logging for action data
                                    console.log(
                                      `[@component:ValidationResultsClient] Action ${actionIndex}:`,
                                      {
                                        success: action.success,
                                        inputValue: action.inputValue,
                                        actionLabel: action.actionLabel,
                                        actionCommand: action.actionCommand,
                                        error: action.error,
                                        fullActionObject: action,
                                      },
                                    );

                                    // Check for alternative input field names for actions
                                    const inputValue =
                                      action.inputValue ||
                                      (action as any).input ||
                                      (action as any).elementSelector ||
                                      (action as any).selector ||
                                      (action as any).value ||
                                      (action as any).expectedValue ||
                                      (action as any).targetElement;

                                    return (
                                      <Alert
                                        key={actionIndex}
                                        severity={action.success ? 'success' : 'error'}
                                        sx={{
                                          mb: 0,
                                          fontSize: '0.875rem',
                                          '&:hover': {
                                            backgroundColor: 'transparent !important',
                                          },
                                        }}
                                      >
                                        <Typography
                                          variant="body2"
                                          sx={{ fontWeight: 'bold', mb: 0 }}
                                        >
                                          {action.actionIndex + 1}. {action.actionLabel}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 0 }}>
                                          Command: <code>{action.actionCommand}</code>
                                        </Typography>
                                        {inputValue && (
                                          <Typography variant="body2" sx={{ mb: 0 }}>
                                            Input: <strong>{inputValue}</strong>
                                          </Typography>
                                        )}
                                        {!inputValue && !action.success && (
                                          <Typography
                                            variant="body2"
                                            sx={{ mb: 0, color: 'warning.main' }}
                                          >
                                            Input: <em>No input value provided</em>
                                          </Typography>
                                        )}
                                        {action.error && (
                                          <Typography variant="body2" color="error">
                                            Error: {action.error}
                                          </Typography>
                                        )}
                                      </Alert>
                                    );
                                  })}
                                </Box>
                              )}

                              {/* Verification Results */}
                              {edge.verificationResults && edge.verificationResults.length > 0 ? (
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      fontWeight: 'bold',
                                      mb: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                    }}
                                  >
                                    Verifications Executed ({edge.verificationResults.length}):
                                  </Typography>
                                  {edge.verificationResults.map(
                                    (verification, verificationIndex) => {
                                      // Debug logging for verification data
                                      console.log(
                                        `[@component:ValidationResultsClient] Verification ${verificationIndex}:`,
                                        {
                                          success: verification.success,
                                          inputValue: verification.inputValue,
                                          verificationLabel: verification.verificationLabel,
                                          verificationCommand: verification.verificationCommand,
                                          error: verification.error,
                                          fullVerificationObject: verification,
                                        },
                                      );

                                      // Check for alternative input field names
                                      const inputValue =
                                        verification.inputValue ||
                                        (verification as any).input ||
                                        (verification as any).elementSelector ||
                                        (verification as any).selector ||
                                        (verification as any).value ||
                                        (verification as any).expectedValue ||
                                        (verification as any).targetElement;

                                      return (
                                        <Alert
                                          key={verificationIndex}
                                          severity={verification.success ? 'success' : 'error'}
                                          sx={{
                                            mb: 1,
                                            fontSize: '0.875rem',
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                            },
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            sx={{ fontWeight: 'bold', mb: 0 }}
                                          >
                                            {verification.verificationLabel}
                                          </Typography>
                                          <Typography variant="body2" sx={{ mb: 0 }}>
                                            Command: <code>{verification.verificationCommand}</code>
                                          </Typography>
                                          {inputValue && (
                                            <Typography variant="body2" sx={{ mb: 0 }}>
                                              Input: <strong>{inputValue}</strong>
                                            </Typography>
                                          )}
                                          {!inputValue && !verification.success && (
                                            <Typography
                                              variant="body2"
                                              sx={{ mb: 0, color: 'warning.main' }}
                                            >
                                              Input: <em>No input value provided</em>
                                            </Typography>
                                          )}
                                          {verification.error && (
                                            <Typography variant="body2" color="error">
                                              Error: {verification.error}
                                            </Typography>
                                          )}
                                        </Alert>
                                      );
                                    },
                                  )}
                                </Box>
                              ) : (
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                    sx={{ fontStyle: 'italic' }}
                                  >
                                    No verifications found for {edge.toName || edge.to}.
                                  </Typography>
                                </Box>
                              )}

                              {/* Show message when no detailed results are available */}
                              {(!edge.actionResults || edge.actionResults.length === 0) &&
                                (!edge.verificationResults ||
                                  edge.verificationResults.length === 0) && (
                                  <Typography
                                    variant="body2"
                                    color="textSecondary"
                                    sx={{ fontStyle: 'italic' }}
                                  >
                                    No detailed execution results available for this edge.
                                  </Typography>
                                )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              }) || (
                <TableRow>
                  <TableCell colSpan={7} align="center">
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
        <Button onClick={handleClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ValidationResultsClient;
