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
import { useUserInterface } from '../hooks/pages/useUserInterface';

const ModelReports: React.FC = () => {
  const { getAllExecutionResults } = useExecutionResults();
  const { getAllUserInterfaces } = useUserInterface();
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treeToInterfaceMap, setTreeToInterfaceMap] = useState<Record<string, string>>({});

  // Load execution results and user interfaces on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load both execution results and user interfaces in parallel
        const [results, userInterfaces] = await Promise.all([
          getAllExecutionResults(),
          getAllUserInterfaces(),
        ]);

        // Create mapping from tree_id to userinterface_name
        const treeMap: Record<string, string> = {};
        userInterfaces.forEach((ui) => {
          if (ui.root_tree?.id) {
            treeMap[ui.root_tree.id] = ui.name;
          }
        });

        setTreeToInterfaceMap(treeMap);
        setExecutionResults(results);
      } catch (err) {
        console.error('[@component:ModelReports] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getAllExecutionResults, getAllUserInterfaces]);

  // Calculate stats
  const totalExecutions = executionResults.length;
  const passedExecutions = executionResults.filter((result) => result.success).length;
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
      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
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

      {/* Quick Stats */}
      <Box sx={{ mb: 2 }}>
        <Card>
          <CardContent sx={{ py: 1.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <ModelIcon color="primary" />
                <Typography variant="h6">Execution Stats</Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Total Executions</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalExecutions}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">This Week</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {thisWeekExecutions}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Success Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {successRate}%
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Avg Duration</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {avgDuration}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Actions</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {actionExecutions.length}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Verifications</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {verificationExecutions.length}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Execution Results */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Execution Results
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ '& .MuiTableRow-root': { height: '40px' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Type</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Tree Name</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Element Name</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Duration</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Executed</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : executionResults.length === 0 ? (
                  <EmptyState />
                ) : (
                  executionResults.map((result) => (
                    <TableRow
                      key={result.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                        },
                      }}
                    >
                      <TableCell sx={{ py: 0.5 }}>
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
                      <TableCell sx={{ py: 0.5 }}>
                        {treeToInterfaceMap[result.tree_id] || result.tree_name}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>{result.element_name}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Chip
                          icon={result.success ? <PassIcon /> : <FailIcon />}
                          label={result.success ? 'PASS' : 'FAIL'}
                          color={result.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        {formatDuration(result.execution_time_ms)}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>{formatDate(result.executed_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ModelReports;
