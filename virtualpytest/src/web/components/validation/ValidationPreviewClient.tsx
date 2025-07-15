'use client';

import {
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useHostManager } from '../../hooks/useHostManager';
import { useValidationUI, useValidationColors } from '../../hooks/validation';

interface ValidationPreviewClientProps {
  treeId: string;
}

interface OptimalPathStep {
  step_number: number;
  validation_type: string;
  from_node_id: string;
  to_node_id: string;
  from_node_label: string;
  to_node_label: string;
  actions: any[];
  retryActions?: any[];
  estimated_time: number;
}

interface OptimalPathData {
  sequence: OptimalPathStep[];
  summary: {
    total_steps: number;
    edge_validations: number;
    efficiency_ratio: number;
  };
}

export default function ValidationPreviewClient({ treeId }: ValidationPreviewClientProps) {
  const validation = useValidationUI(treeId);
  const { resetForNewValidation } = useValidationColors();
  const { selectedHost } = useHostManager();
  const [showDetails, setShowDetails] = useState(false);
  const [optimalPath, setOptimalPath] = useState<OptimalPathData | null>(null);
  const [loadingOptimalPath] = useState(false);
  const [selectedEdges, setSelectedEdges] = useState<Set<number>>(new Set());
  const [depthFilter, setDepthFilter] = useState<'all' | '1' | '2'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const [error, setError] = useState<string | null>(null);

  // Load optimal path when preview opens
  useEffect(() => {
    if (validation.showPreview && treeId && !optimalPath) {
      fetchOptimalPath();
    }
  }, [validation.showPreview, treeId]);

  // Select all edges by default when optimal path is loaded
  useEffect(() => {
    if (optimalPath && optimalPath.sequence) {
      const allSteps = new Set(optimalPath.sequence.map((step: OptimalPathStep) => step.step_number));
      setSelectedEdges(allSteps);
    }
  }, [optimalPath]);

  const fetchOptimalPath = async () => {
    setError(null);

    try {
      console.log('[@component:ValidationPreviewClient] Fetching optimal path from server...');

      // Simply check if host is selected - no need for controller proxy verification
      if (!selectedHost) {
        throw new Error('No host selected for validation');
      }

      console.log('[@component:ValidationPreviewClient] Host available, fetching optimal path');

      const response = await fetch(`/server/validation/optimal-path/${treeId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch optimal path');
      }

      const data = await response.json();

      setOptimalPath(data);
    } catch (err: any) {
      console.error('[@component:ValidationPreviewClient] Error:', err);
      setError(err.message || 'Failed to fetch validation data');
    }
  };

  const handleEdgeToggle = (stepNumber: number) => {
    const newSelected = new Set(selectedEdges);
    if (newSelected.has(stepNumber)) {
      newSelected.delete(stepNumber);
    } else {
      newSelected.add(stepNumber);
    }
    setSelectedEdges(newSelected);
  };

  const handleSelectAll = () => {
    const allSteps = optimalPath?.sequence.map((step: OptimalPathStep) => step.step_number) || [];
    setSelectedEdges(new Set(allSteps));
  };

  const handleDeselectAll = () => {
    setSelectedEdges(new Set());
  };

  const toggleRow = (stepNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedRows(newExpanded);
  };

  const getFilteredSteps = () => {
    if (!optimalPath) return [];

    return optimalPath.sequence.filter((step: OptimalPathStep) => {
      if (depthFilter === 'all') return true;

      // Determine depth based on target node
      const isDepth1 =
        step.to_node_label === 'home' ||
        (step.from_node_label === 'home' && !step.to_node_label.includes('_'));
      const isDepth2 =
        step.to_node_label.includes('_') &&
        step.to_node_label !== 'home_movies_series' &&
        step.to_node_label !== 'home_saved' &&
        step.to_node_label !== 'home_replay';

      if (depthFilter === '1')
        return (
          isDepth1 ||
          ['tvguide', 'home_movies_series', 'home_saved', 'home_replay'].includes(
            step.to_node_label,
          )
        );
      if (depthFilter === '2') return isDepth2;

      return true;
    });
  };

  const handleRunValidation = () => {
    console.log(
      '[@component:ValidationPreviewClient] Starting validation - resetting all colors to grey (untested)',
    );

    // Reset all validation colors to grey (untested) before starting validation
    resetForNewValidation();

    const skippedEdges =
      optimalPath?.sequence
        .filter((step: OptimalPathStep) => !selectedEdges.has(step.step_number))
        .map((step: OptimalPathStep) => ({ from: step.from_node_id, to: step.to_node_id })) || [];

    validation.runValidation(skippedEdges);
  };

  if (!validation.showPreview) return null;

  return (
    <Dialog
      open={validation.showPreview}
      onClose={validation.closePreview}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ bgcolor: 'background.paper', pb: 0 }}>Validation Preview</DialogTitle>

      <Divider />

      {/* Content */}
      <DialogContent sx={{ bgcolor: 'background.paper', px: 3, py: 1 }}>
        {!validation.previewData ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <CircularProgress sx={{ mr: 2 }} />
            <Typography>Loading preview...</Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3} mb={1}>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {validation.previewData.totalNodes}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total Nodes
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {validation.previewData.totalEdges}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total Edges
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {validation.previewData.reachableNodes.length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Reachable Nodes
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Details Section */}
            <Box mt={1}>
              <Button
                onClick={() => setShowDetails(!showDetails)}
                startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                variant="outlined"
                size="small"
                sx={{ mb: 0 }}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>

              <Collapse in={showDetails}>
                <Box mt={2}>
                  {/* NetworkX Optimal Path Table */}
                  {loadingOptimalPath ? (
                    <Box display="flex" justifyContent="center" alignItems="center" p={2}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body2">Loading NetworkX optimal path...</Typography>
                    </Box>
                  ) : optimalPath ? (
                    <>
                      {/* Selection and Filter Controls */}
                      <Box mb={1} display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <Button size="small" onClick={handleSelectAll} variant="outlined">
                          Select All
                        </Button>
                        <Button size="small" onClick={handleDeselectAll} variant="outlined">
                          Deselect All
                        </Button>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Filter Depth</InputLabel>
                          <Select
                            value={depthFilter}
                            onChange={(e) => setDepthFilter(e.target.value as 'all' | '1' | '2')}
                            label="Filter Depth"
                          >
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="1">Depth 1</MenuItem>
                            <MenuItem value="2">Depth 2</MenuItem>
                          </Select>
                        </FormControl>
                        <Typography variant="body2" color="textSecondary">
                          Selected: {selectedEdges.size} / {optimalPath?.sequence.length || 0} steps
                        </Typography>
                      </Box>

                      {/* NetworkX Optimal Path Table */}
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell width="40px"></TableCell>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  indeterminate={
                                    selectedEdges.size > 0 &&
                                    selectedEdges.size < optimalPath.sequence.length
                                  }
                                  checked={selectedEdges.size === optimalPath.sequence.length}
                                  onChange={
                                    selectedEdges.size === optimalPath.sequence.length
                                      ? handleDeselectAll
                                      : handleSelectAll
                                  }
                                />
                              </TableCell>
                              <TableCell>Step</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Path</TableCell>
                              <TableCell>Actions</TableCell>
                              <TableCell>Verifications</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {getFilteredSteps().map((step) => {
                              const hasExpandableContent =
                                (step.actions && step.actions.length > 0) ||
                                (step.retryActions && step.retryActions.length > 0);

                              return (
                                <React.Fragment key={`step-${step.step_number}`}>
                                  <TableRow
                                    sx={{
                                      '&:hover': {
                                        backgroundColor: 'transparent !important',
                                      },
                                      backgroundColor:
                                        step.validation_type === 'navigation'
                                          ? 'rgba(255, 193, 7, 0.1)'
                                          : 'transparent',
                                    }}
                                  >
                                    <TableCell>
                                      {hasExpandableContent && (
                                        <IconButton
                                          size="small"
                                          onClick={() => toggleRow(step.step_number)}
                                          sx={{ p: 0 }}
                                        >
                                          {expandedRows.has(step.step_number) ? (
                                            <ExpandLessIcon />
                                          ) : (
                                            <ExpandMoreIcon />
                                          )}
                                        </IconButton>
                                      )}
                                    </TableCell>
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        checked={selectedEdges.has(step.step_number)}
                                        onChange={() => handleEdgeToggle(step.step_number)}
                                      />
                                    </TableCell>
                                    <TableCell>{step.step_number}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {step.validation_type === 'edge' ? (
                                          <Typography
                                            variant="body2"
                                            sx={{ color: 'success.main', fontWeight: 'bold' }}
                                          >
                                            EDGE
                                          </Typography>
                                        ) : (
                                          <Typography
                                            variant="body2"
                                            sx={{ color: 'warning.main', fontWeight: 'bold' }}
                                          >
                                            NAV
                                          </Typography>
                                        )}
                                      </Box>
                                    </TableCell>
                                    <TableCell>
                                      {step.from_node_label} → <strong>{step.to_node_label}</strong>
                                    </TableCell>
                                    <TableCell>{step.actions.length}</TableCell>
                                    <TableCell>{step.retryActions?.length || 0}</TableCell>
                                  </TableRow>

                                  {/* Detailed Actions/Verifications Row */}
                                  {expandedRows.has(step.step_number) && hasExpandableContent && (
                                    <TableRow
                                      sx={{
                                        '&:hover': {
                                          backgroundColor: 'transparent !important',
                                        },
                                      }}
                                    >
                                      <TableCell colSpan={7} sx={{ p: 0, border: 'none' }}>
                                        <Collapse in={expandedRows.has(step.step_number)}>
                                          <Box sx={{ p: 2, bgcolor: 'transparent' }}>
                                            {/* Actions to Execute */}
                                            {step.actions && step.actions.length > 0 && (
                                              <Box mb={2}>
                                                <Typography
                                                  variant="subtitle2"
                                                  sx={{ fontWeight: 'bold', mb: 1 }}
                                                >
                                                  Actions to Execute ({step.actions.length}):
                                                </Typography>
                                                {step.actions.map((action, actionIndex) => (
                                                  <Alert
                                                    key={`action-${actionIndex}`}
                                                    severity="info"
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
                                                      sx={{ fontWeight: 'bold', mb: 0.5 }}
                                                    >
                                                      {actionIndex + 1}.{' '}
                                                      {action.label || action.command}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                      Command: <code>{action.command}</code>
                                                    </Typography>
                                                    {action.params &&
                                                      Object.keys(action.params).length > 0 && (
                                                        <Typography
                                                          variant="body2"
                                                          sx={{ mb: 0.5 }}
                                                        >
                                                          Params: {JSON.stringify(action.params)}
                                                        </Typography>
                                                      )}
                                                    {action.inputValue && (
                                                      <Typography variant="body2">
                                                        Input Value:{' '}
                                                        <strong>{action.inputValue}</strong>
                                                      </Typography>
                                                    )}
                                                  </Alert>
                                                ))}
                                              </Box>
                                            )}

                                            {/* Target Node Verifications */}
                                            {step.retryActions && step.retryActions.length > 0 && (
                                              <Box>
                                                <Typography
                                                  variant="subtitle2"
                                                  sx={{ fontWeight: 'bold', mb: 1 }}
                                                >
                                                  Target Node Verifications (
                                                  {step.retryActions.length}) for{' '}
                                                  {step.to_node_label}:
                                                </Typography>
                                                {step.retryActions.map(
                                                  (verification, verificationIndex) => (
                                                    <Alert
                                                      key={`verification-${verificationIndex}`}
                                                      severity="success"
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
                                                        sx={{ fontWeight: 'bold', mb: 0.5 }}
                                                      >
                                                        {verification.label || verification.command}
                                                      </Typography>
                                                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                                                        Command: <code>{verification.command}</code>
                                                      </Typography>
                                                      {verification.params &&
                                                        Object.keys(verification.params).length >
                                                          0 && (
                                                          <Typography
                                                            variant="body2"
                                                            sx={{ mb: 0.5 }}
                                                          >
                                                            Params:{' '}
                                                            {JSON.stringify(verification.params)}
                                                          </Typography>
                                                        )}
                                                      {verification.inputValue && (
                                                        <Typography variant="body2">
                                                          Input Value:{' '}
                                                          <strong>{verification.inputValue}</strong>
                                                        </Typography>
                                                      )}
                                                    </Alert>
                                                  ),
                                                )}
                                              </Box>
                                            )}
                                          </Box>
                                        </Collapse>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Typography variant="body2" color="error" sx={{ textAlign: 'center', py: 2 }}>
                      {error || 'Failed to load NetworkX optimal path'}
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </DialogContent>

      <Divider />

      {/* Footer */}
      <DialogActions sx={{ bgcolor: 'background.paper', p: 2 }}>
        <Button onClick={validation.closePreview} color="inherit">
          Cancel
        </Button>

        {/* Last Result Button - Show if there's a cached result */}
        {validation.lastResult && (
          <Button
            variant="outlined"
            onClick={validation.viewLastResult}
            startIcon={<HistoryIcon />}
            color="info"
            sx={{ mr: 1 }}
          >
            Last Result
          </Button>
        )}

        <Button
          variant="contained"
          onClick={handleRunValidation}
          disabled={!validation.previewData}
          startIcon={<PlayArrowIcon />}
          color="primary"
        >
          Run Validation
          {optimalPath && selectedEdges.size < optimalPath.sequence.length
            ? ` (${selectedEdges.size} selected)`
            : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
