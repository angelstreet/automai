import {
  Visibility as MonitorIcon,
  Timeline as MetricsIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import React from 'react';

const SystemMonitoring: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Monitoring
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Real-time monitoring of test execution and system performance.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Test monitoring feature is coming soon. This will provide real-time insights into test
        execution.
      </Alert>

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <MonitorIcon color="primary" />
                <Typography variant="h6">System Status</Typography>
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Test Runner</Typography>
                  <Chip label="Idle" color="default" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Device Pool</Typography>
                  <Chip label="Available" color="success" size="small" />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">API Server</Typography>
                  <Chip label="Online" color="success" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PerformanceIcon color="secondary" />
                <Typography variant="h6">Performance</Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" gutterBottom>
                  CPU Usage
                </Typography>
                <LinearProgress variant="determinate" value={25} sx={{ mb: 2 }} />
                <Typography variant="body2" gutterBottom>
                  Memory Usage
                </Typography>
                <LinearProgress variant="determinate" value={45} sx={{ mb: 2 }} />
                <Typography variant="body2" gutterBottom>
                  Network I/O
                </Typography>
                <LinearProgress variant="determinate" value={15} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Test Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <MetricsIcon color="info" />
                <Typography variant="h6">Test Metrics</Typography>
              </Box>
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Tests Run Today</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    0
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Success Rate</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    N/A
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Avg Duration</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    N/A
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Live Test Feed */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Live Test Feed
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Real-time updates from running tests and system events.
              </Typography>
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 1,
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  No active tests to monitor
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitoring;
