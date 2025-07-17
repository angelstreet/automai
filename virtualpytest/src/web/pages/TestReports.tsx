import {
  Assessment as ReportsIcon,
  CheckCircle as PassIcon,
  Error as FailIcon,
  Link as LinkIcon,
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
  Checkbox,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useScriptResults, ScriptResult } from '../hooks/pages/useScriptResults';

const TestReports: React.FC = () => {
  const { getAllScriptResults } = useScriptResults();
  const [scriptResults, setScriptResults] = useState<ScriptResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load script results on component mount
  useEffect(() => {
    const loadScriptResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const results = await getAllScriptResults();
        setScriptResults(results);
      } catch (err) {
        console.error('[@component:TestReports] Error loading script results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load script results');
      } finally {
        setLoading(false);
      }
    };

    loadScriptResults();
  }, [getAllScriptResults]);

  // Calculate stats
  const totalReports = scriptResults.length;
  const passedReports = scriptResults.filter((result) => result.success).length;
  const successRate = totalReports > 0 ? ((passedReports / totalReports) * 100).toFixed(1) : 'N/A';

  // Calculate this week's reports (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekReports = scriptResults.filter(
    (result) => new Date(result.created_at) >= oneWeekAgo,
  ).length;

  // Calculate average duration
  const validDurations = scriptResults.filter((result) => result.execution_time_ms !== null);
  const avgDuration =
    validDurations.length > 0
      ? formatDuration(
          validDurations.reduce((sum, result) => sum + (result.execution_time_ms || 0), 0) /
            validDurations.length,
        )
      : 'N/A';

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

  // Handle discard toggle
  const handleDiscardToggle = async (resultId: string, discardValue: boolean) => {
    try {
      // TODO: Implement API call to update discard status
      console.log(`Toggling discard for result ${resultId} to ${discardValue}`);

      // Update local state immediately for better UX
      setScriptResults((prev) =>
        prev.map((result) =>
          result.id === resultId ? { ...result, discard: discardValue } : result,
        ),
      );
    } catch (error) {
      console.error('Error toggling discard status:', error);
      setError('Failed to update discard status');
    }
  };

  // Loading state component
  const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress />
    </Box>
  );

  // Empty state component
  const EmptyState = () => (
    <TableRow>
      <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="textSecondary">
          No script results available yet
        </Typography>
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" gutterBottom>
          Test Reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Box sx={{ mb: 0.5 }}>
        <Card>
          <CardContent sx={{ py: 0.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <ReportsIcon color="primary" />
                <Typography variant="h6">Quick Stats</Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Total Reports</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalReports}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">This Week</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {thisWeekReports}
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
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Test Reports */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Test Reports
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small" sx={{ '& .MuiTableRow-root': { height: '40px' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Script Name</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>UI Name</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Host</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Device</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Duration</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Started</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Report</strong>
                  </TableCell>
                  <TableCell sx={{ py: 1 }}>
                    <strong>Discard</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : scriptResults.length === 0 ? (
                  <EmptyState />
                ) : (
                  scriptResults.map((result) => (
                    <TableRow
                      key={result.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                        },
                        opacity: result.discard ? 0.5 : 1,
                      }}
                    >
                      <TableCell sx={{ py: 0.5 }}>{result.script_name}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>{result.userinterface_name || 'N/A'}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>{result.host_name}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>{result.device_name}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Chip
                          icon={result.success ? <PassIcon /> : <FailIcon />}
                          label={result.success ? 'PASS' : 'FAIL'}
                          color={result.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        {result.execution_time_ms
                          ? formatDuration(result.execution_time_ms)
                          : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>{formatDate(result.started_at)}</TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        {result.html_report_r2_url ? (
                          <Chip
                            icon={<LinkIcon />}
                            label="View Report"
                            size="small"
                            clickable
                            onClick={() => window.open(result.html_report_r2_url!, '_blank')}
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Chip label="No Report" size="small" variant="outlined" disabled />
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Checkbox
                          size="small"
                          checked={result.discard || false}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleDiscardToggle(result.id, e.target.checked)
                          }
                          title={result.discard ? 'Discarded' : 'Not discarded'}
                        />
                      </TableCell>
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

export default TestReports;
