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
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useValidation } from '../hooks/useValidation';

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
  const { showPreview, previewData, lastResult, closePreview, runValidation, viewLastResult } = useValidation(treeId);
  const [showDetails, setShowDetails] = useState(false);
  const [optimalPath, setOptimalPath] = useState<OptimalPathData | null>(null);
  const [loadingOptimalPath, setLoadingOptimalPath] = useState(false);
  const [selectedEdges, setSelectedEdges] = useState<Set<number>>(new Set());
  const [depthFilter, setDepthFilter] = useState<'all' | '1' | '2'>('all');

  // Load optimal path when preview opens
  useEffect(() => {
    if (showPreview && treeId && !optimalPath) {
      loadOptimalPath();
    }
  }, [showPreview, treeId]);

  const loadOptimalPath = async () => {
    setLoadingOptimalPath(true);
    try {
      const response = await fetch(`http://localhost:5009/api/validation/optimal-path/${treeId}`);
      const data = await response.json();
      
      if (data.success) {
        setOptimalPath(data.optimal_path);
        // Select all edges by default
        const allEdgeSteps = data.optimal_path.sequence
          .filter((step: OptimalPathStep) => step.validation_type === 'edge')
          .map((step: OptimalPathStep) => step.step_number);
        setSelectedEdges(new Set(allEdgeSteps));
      }
    } catch (error) {
      console.error('Failed to load optimal path:', error);
    } finally {
      setLoadingOptimalPath(false);
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
    const allEdgeSteps = optimalPath?.sequence
      .filter((step: OptimalPathStep) => step.validation_type === 'edge')
      .map((step: OptimalPathStep) => step.step_number) || [];
    setSelectedEdges(new Set(allEdgeSteps));
  };

  const handleDeselectAll = () => {
    setSelectedEdges(new Set());
  };

  const getFilteredSteps = () => {
    if (!optimalPath) return [];
    
    return optimalPath.sequence.filter((step: OptimalPathStep) => {
      if (depthFilter === 'all') return true;
      const stepDepth = step.from_node_label === 'ENTRY' || step.from_node_label === 'home' ? 1 : 2;
      return depthFilter === '1' ? stepDepth === 1 : stepDepth === 2;
    });
  };

  const handleRunValidation = () => {
    const skippedEdges = optimalPath?.sequence
      .filter((step: OptimalPathStep) => step.validation_type === 'edge' && !selectedEdges.has(step.step_number))
      .map((step: OptimalPathStep) => ({ from: step.from_node_id, to: step.to_node_id })) || [];
    
    runValidation(skippedEdges);
  };

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
                  {/* Optimal Path Table */}
                  {loadingOptimalPath ? (
                    <Box display="flex" justifyContent="center" alignItems="center" p={2}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body2">Loading optimal path...</Typography>
                    </Box>
                  ) : optimalPath ? (
                    <>
                      {/* Selection and Filter Controls */}
                      <Box mb={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
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
                          Selected: {selectedEdges.size} edges
                        </Typography>
                      </Box>

                      {/* Optimal Path Table */}
                      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  indeterminate={selectedEdges.size > 0 && selectedEdges.size < optimalPath.sequence.filter(s => s.validation_type === 'edge').length}
                                  checked={selectedEdges.size === optimalPath.sequence.filter(s => s.validation_type === 'edge').length}
                                  onChange={selectedEdges.size === optimalPath.sequence.filter(s => s.validation_type === 'edge').length ? handleDeselectAll : handleSelectAll}
                                />
                              </TableCell>
                              <TableCell>Step</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Path</TableCell>
                              <TableCell>Actions</TableCell>
                              <TableCell>Time</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {getFilteredSteps().map((step) => (
                              <TableRow key={step.step_number}>
                                <TableCell padding="checkbox">
                                  {step.validation_type === 'edge' && (
                                    <Checkbox
                                      checked={selectedEdges.has(step.step_number)}
                                      onChange={() => handleEdgeToggle(step.step_number)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell>{step.step_number}</TableCell>
                                <TableCell>{step.validation_type}</TableCell>
                                <TableCell>
                                  {step.from_node_label} → {step.to_node_label}
                                </TableCell>
                                <TableCell>{step.actions.length}</TableCell>
                                <TableCell>{step.estimated_time}s</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  ) : (
                    <Typography variant="body2" color="error" sx={{ textAlign: 'center', py: 2 }}>
                      Failed to load optimal path. Please check if the backend server is running.
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
          onClick={handleRunValidation}
          disabled={!previewData}
          startIcon={<PlayArrowIcon />}
          color="primary"
        >
          Run Validation{optimalPath && selectedEdges.size < optimalPath.sequence.filter(s => s.validation_type === 'edge').length ? ` (${selectedEdges.size} selected)` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 