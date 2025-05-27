import {
  PlayArrow as RunIcon,
  Schedule as ScheduleIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { Box, Typography, Card, CardContent, Button, Grid, Alert, Chip } from '@mui/material';
import React from 'react';

const RunTests: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Run Tests
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Execute test campaigns and monitor their progress in real-time.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Test execution feature is coming soon. This will allow you to run test campaigns and monitor
        their progress.
      </Alert>

      <Grid container spacing={3}>
        {/* Quick Run */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Quick Run</Typography>
                <Chip label="Ready" color="success" size="small" />
              </Box>
              <Typography variant="body2" color="textSecondary" mb={3}>
                Execute a single test case or campaign immediately.
              </Typography>
              <Box display="flex" gap={2}>
                <Button variant="contained" startIcon={<RunIcon />} disabled>
                  Run Test Case
                </Button>
                <Button variant="outlined" startIcon={<RunIcon />} disabled>
                  Run Campaign
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Scheduled Runs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Scheduled Runs</Typography>
                <Chip label="Idle" color="default" size="small" />
              </Box>
              <Typography variant="body2" color="textSecondary" mb={3}>
                Schedule test campaigns to run at specific times.
              </Typography>
              <Box display="flex" gap={2}>
                <Button variant="contained" startIcon={<ScheduleIcon />} color="secondary" disabled>
                  Schedule Test
                </Button>
                <Button variant="outlined" disabled>
                  View Schedule
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Tests */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                <Typography variant="h6">Active Test Runs</Typography>
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  color="error"
                  size="small"
                  disabled
                >
                  Stop All
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Currently running test campaigns and their status.
              </Typography>
              <Box
                sx={{
                  p: 3,
                  textAlign: 'center',
                  backgroundColor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  No active test runs
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RunTests;
