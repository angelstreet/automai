import {
  Memory as ModelIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  PlayArrow as ActionIcon,
  Visibility as VerificationIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useExecutionResults, ExecutionResult } from '../hooks/pages/useExecutionResults';

const ModelReports: React.FC = () => {
  const { getAllExecutionResults } = useExecutionResults();
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load execution results on component mount
  useEffect(() => {
    const loadExecutionResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await getAllExecutionResults();
        setExecutionResults(results);
      } catch (err) {
        console.error('[@component:ModelReports] Error loading execution results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load execution results');
      } finally {
        setLoading(false);
      }
    };

    loadExecutionResults();
  }, [getAllExecutionResults]);

  // Calculate stats
  const totalExecutions = executionResults.length;
  const passedExecutions = executionResults.filter((result) => result.success).length;
  const failedExecutions = totalExecutions - passedExecutions;
  const successRate =
    totalExecutions > 0 ? ((passedExecutions / totalExecutions) * 100).toFixed(1) : 'N/A';

  // Calculate this week's executions (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekExecutions = executionResults.filter(
    (result) => new Date(result.executed_at) >= oneWeekAgo,
  ).length;

  // Calculate average duration
  const avgDuration =
    totalExecutions > 0
      ? formatDuration(
          executionResults.reduce((sum, result) => sum + result.execution_time_ms, 0) /
            totalExecutions,
        )
      : 'N/A';

  // Separate by execution type
  const actionExecutions = executionResults.filter((result) => result.execution_type === 'action');
  const verificationExecutions = executionResults.filter(
    (result) => result.execution_type === 'verification',
  );

  // Format duration helper
  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  }

  // Format date helper
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  // Loading state component
  const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress />
    </Box>
  );

  // Empty state component
  const EmptyState = () => (
    <TableRow>
      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="textSecondary">
          No execution results available yet
        </Typography>
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Model Reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Recent Execution Results */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Execution Results
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Type</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Tree ID</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Element ID</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Host</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Device</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Duration</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Executed</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : executionResults.length === 0 ? (
                      <EmptyState />
                    ) : (
                      executionResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>
                            <Chip
                              icon={
                                result.execution_type === 'action' ? (
                                  <ActionIcon />
                                ) : (
                                  <VerificationIcon />
                                )
                              }
                              label={result.execution_type === 'action' ? 'Action' : 'Verification'}
                              size="small"
                              variant="outlined"
                              color={result.execution_type === 'action' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{result.tree_id}</TableCell>
                          <TableCell>
                            {result.execution_type === 'action' ? result.edge_id : result.node_id}
                          </TableCell>
                          <TableCell>{result.host_name}</TableCell>
                          <TableCell>{result.device_model}</TableCell>
                          <TableCell>
                            <Chip
                              icon={result.success ? <PassIcon /> : <FailIcon />}
                              label={result.success ? 'PASS' : 'FAIL'}
                              color={result.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatDuration(result.execution_time_ms)}</TableCell>
                          <TableCell>{formatDate(result.executed_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <ModelIcon color="primary" />
                <Typography variant="h6">Execution Stats</Typography>
              </Box>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Total Executions</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalExecutions}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">This Week</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {thisWeekExecutions}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Success Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {successRate}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body2">Avg Duration</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {avgDuration}
                  </Typography>
                </Box>

                {/* Execution Type Breakdown */}
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Execution Types
                </Typography>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Actions</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {actionExecutions.length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Verifications</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {verificationExecutions.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelReports;
