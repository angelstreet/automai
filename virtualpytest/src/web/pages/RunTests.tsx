import { Terminal as ScriptIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import React, { useState } from 'react';

import { useScript } from '../hooks/script/useScript';
import { useHostManager } from '../hooks/useHostManager';
import { useToast } from '../hooks/useToast';

// Simple execution record interface
interface ExecutionRecord {
  id: string;
  scriptName: string;
  hostName: string;
  deviceId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
}

const RunTests: React.FC = () => {
  const { executeScript, isExecuting, lastResult, error } = useScript();
  const { showInfo, showSuccess, showError } = useToast();

  const [selectedHost, setSelectedHost] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedScript, setSelectedScript] = useState<string>('helloworld');
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);

  // Only fetch host data when wizard is shown
  const { getAllHosts, getDevicesFromHost } = useHostManager();

  // Get hosts and devices only when needed
  const hosts = showWizard ? getAllHosts() : [];
  const availableDevices = showWizard && selectedHost ? getDevicesFromHost(selectedHost) : [];

  const handleExecuteScript = async () => {
    if (!selectedHost || !selectedDevice || !selectedScript) {
      showError('Please select host, device, and script');
      return;
    }

    // Create execution record
    const executionId = `exec_${Date.now()}`;
    const newExecution: ExecutionRecord = {
      id: executionId,
      scriptName: selectedScript,
      hostName: selectedHost,
      deviceId: selectedDevice,
      startTime: new Date().toLocaleTimeString(),
      status: 'running',
    };

    setExecutions((prev) => [newExecution, ...prev]);
    showInfo(`Script "${selectedScript}" started on ${selectedHost}:${selectedDevice}`);

    try {
      const result = await executeScript(selectedScript, selectedHost, selectedDevice);

      // Update execution record on completion
      setExecutions((prev) =>
        prev.map((exec) =>
          exec.id === executionId
            ? {
                ...exec,
                endTime: new Date().toLocaleTimeString(),
                status: result?.success === false ? 'failed' : 'completed',
              }
            : exec,
        ),
      );

      if (result?.success === false) {
        showError(`Script "${selectedScript}" failed`);
      } else {
        showSuccess(`Script "${selectedScript}" completed successfully`);
      }
    } catch (err) {
      // Update execution record on error
      setExecutions((prev) =>
        prev.map((exec) =>
          exec.id === executionId
            ? {
                ...exec,
                endTime: new Date().toLocaleTimeString(),
                status: 'failed',
              }
            : exec,
        ),
      );
      showError(`Script execution failed: ${err}`);
    }
  };

  const getStatusChip = (status: ExecutionRecord['status']) => {
    switch (status) {
      case 'running':
        return <Chip label="Running" color="warning" size="small" />;
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'failed':
        return <Chip label="Failed" color="error" size="small" />;
      default:
        return <Chip label="Unknown" color="default" size="small" />;
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Execute Script
              </Typography>

              {!showWizard ? (
                // Show launch button when wizard is not active
                <Box display="flex" justifyContent="center" py={4}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ScriptIcon />}
                    onClick={() => setShowWizard(true)}
                  >
                    Launch Script
                  </Button>
                </Box>
              ) : (
                // Show wizard form when active
                <>
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
                        >
                          {hosts.map((host) => (
                            <MenuItem key={host.host_name} value={host.host_name}>
                              {host.host_name}
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
                              {device.device_id}
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
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowWizard(false);
                        setSelectedHost('');
                        setSelectedDevice('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Execution History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Execution History
              </Typography>

              {executions.length === 0 ? (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderRadius: 1,
                    backgroundColor: 'background.default',
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    No script executions yet
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Script</TableCell>
                        <TableCell>Host</TableCell>
                        <TableCell>Device</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {executions.map((execution) => (
                        <TableRow key={execution.id}>
                          <TableCell>{execution.scriptName}</TableCell>
                          <TableCell>{execution.hostName}</TableCell>
                          <TableCell>{execution.deviceId}</TableCell>
                          <TableCell>{execution.startTime}</TableCell>
                          <TableCell>{execution.endTime || '-'}</TableCell>
                          <TableCell>{getStatusChip(execution.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RunTests;
