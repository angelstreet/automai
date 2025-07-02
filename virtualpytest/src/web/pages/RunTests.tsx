import {
  PlayArrow as RunIcon,
  Schedule as ScheduleIcon,
  Stop as StopIcon,
  Terminal as ScriptIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React, { useState } from 'react';

import { useScript, useHostManager } from '../hooks';

const RunTests: React.FC = () => {
  const { executeScript, isExecuting, lastResult, error } = useScript();
  const { hosts, devices, isLoading: isLoadingHosts } = useHostManager();

  const [selectedHost, setSelectedHost] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedScript, setSelectedScript] = useState<string>('helloworld');

  // Get available devices for selected host
  const availableDevices = selectedHost ? devices[selectedHost] || [] : [];

  const handleExecuteScript = async () => {
    if (!selectedHost || !selectedDevice || !selectedScript) {
      alert('Please select host, device, and script');
      return;
    }

    try {
      await executeScript(selectedScript, selectedHost, selectedDevice);
    } catch (err) {
      console.error('Script execution failed:', err);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Script Runner
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Execute scripts on host devices and monitor their progress in real-time.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Script Execution */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Execute Script</Typography>
                <Chip
                  label={isExecuting ? 'Executing' : 'Ready'}
                  color={isExecuting ? 'warning' : 'success'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="textSecondary" mb={3}>
                Select a script and host device to execute immediately.
              </Typography>

              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Script</InputLabel>
                    <Select
                      value={selectedScript}
                      label="Script"
                      onChange={(e) => setSelectedScript(e.target.value)}
                    >
                      <MenuItem value="helloworld">Hello World</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Host</InputLabel>
                    <Select
                      value={selectedHost}
                      label="Host"
                      onChange={(e) => {
                        setSelectedHost(e.target.value);
                        setSelectedDevice(''); // Reset device when host changes
                      }}
                      disabled={isLoadingHosts}
                    >
                      {hosts.map((host) => (
                        <MenuItem key={host.host_name} value={host.host_name}>
                          {host.host_name} ({host.ip})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Device</InputLabel>
                    <Select
                      value={selectedDevice}
                      label="Device"
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      disabled={!selectedHost || availableDevices.length === 0}
                    >
                      {availableDevices.map((device) => (
                        <MenuItem key={device.device_id} value={device.device_id}>
                          {device.device_id} ({device.device_type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  startIcon={isExecuting ? <CircularProgress size={20} /> : <ScriptIcon />}
                  onClick={handleExecuteScript}
                  disabled={isExecuting || !selectedHost || !selectedDevice}
                >
                  {isExecuting ? 'Executing...' : 'Execute Script'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status & Results */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Execution Status</Typography>
                <Chip
                  label={error ? 'Error' : lastResult ? 'Completed' : 'Idle'}
                  color={error ? 'error' : lastResult ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Latest script execution status and output.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {lastResult && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Exit Code:</strong> {lastResult.exit_code}
                  </Typography>
                  {lastResult.stdout && (
                    <Accordion size="small">
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2">
                          <SuccessIcon sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                          Output
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}
                        >
                          {lastResult.stdout}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}
                  {lastResult.stderr && (
                    <Accordion size="small">
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2">
                          <ErrorIcon sx={{ fontSize: 16, mr: 1, color: 'error.main' }} />
                          Errors
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}
                        >
                          {lastResult.stderr}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Scripts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6">Currently Executing</Typography>
                <Chip
                  label={isExecuting ? '1 Running' : '0 Running'}
                  color={isExecuting ? 'warning' : 'default'}
                  size="small"
                />
              </Box>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Currently executing scripts and their status.
              </Typography>

              {isExecuting ? (
                <Box
                  sx={{
                    p: 3,
                    border: '1px dashed',
                    borderColor: 'warning.main',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CircularProgress size={24} />
                  <Box>
                    <Typography variant="body2">
                      <strong>{selectedScript}</strong> executing on{' '}
                      <strong>
                        {selectedHost}:{selectedDevice}
                      </strong>
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Please wait...
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderRadius: 1,
                    backgroundColor: 'background.default',
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    No scripts currently executing
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RunTests;
