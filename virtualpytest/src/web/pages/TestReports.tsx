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
  IconButton,
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
  const failedReports = totalReports - passedReports;
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
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Test Reports
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Recent Test Reports */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Recent Test Reports
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Script Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Type</strong>
                      </TableCell>
                      <TableCell>
                        <strong>UI Name</strong>
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
                        <strong>Started</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Report</strong>
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
                        <TableRow key={result.id}>
                          <TableCell>{result.script_name}</TableCell>
                          <TableCell>
                            <Chip label={result.script_type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{result.userinterface_name || 'N/A'}</TableCell>
                          <TableCell>{result.host_name}</TableCell>
                          <TableCell>{result.device_name}</TableCell>
                          <TableCell>
                            <Chip
                              icon={result.success ? <PassIcon /> : <FailIcon />}
                              label={result.success ? 'PASS' : 'FAIL'}
                              color={result.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {result.execution_time_ms
                              ? formatDuration(result.execution_time_ms)
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{formatDate(result.started_at)}</TableCell>
                          <TableCell>
                            {result.html_report_r2_url ? (
                              <IconButton
                                size="small"
                                onClick={() => window.open(result.html_report_r2_url!, '_blank')}
                                title="View Report"
                              >
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
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
                <ReportsIcon color="primary" />
                <Typography variant="h6">Quick Stats</Typography>
              </Box>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Total Reports</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalReports}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">This Week</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {thisWeekReports}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Success Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {successRate}%
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Avg Duration</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {avgDuration}
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

export default TestReports;
