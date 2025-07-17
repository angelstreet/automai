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
import React, { useState, useEffect } from 'react';

import { StreamViewer } from '../components/controller/av/StreamViewer';
import { useStream } from '../hooks/controller/useStream';
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
  const { executeScript, isExecuting } = useScript();
  const { showInfo, showSuccess, showError } = useToast();

  const [selectedHost, setSelectedHost] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [availableScripts, setAvailableScripts] = useState<string[]>([]);
  const [loadingScripts, setLoadingScripts] = useState<boolean>(false);
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);

  // Only fetch host data when wizard is shown
  const { getAllHosts, getDevicesFromHost } = useHostManager();

  // Get hosts and devices only when needed
  const hosts = showWizard ? getAllHosts() : [];
  const availableDevices = showWizard && selectedHost ? getDevicesFromHost(selectedHost) : [];

  // Get the selected host object for stream
  const selectedHostObject = hosts.find((host) => host.host_name === selectedHost);

  // Use stream hook to get device stream
  const { streamUrl, isLoadingUrl, urlError } = useStream({
    host: selectedHostObject!,
    device_id: selectedDevice || 'device1',
  });

  // Get the selected device object for model information
  const selectedDeviceObject = availableDevices.find(
    (device) => device.device_id === selectedDevice,
  );
  const deviceModel = selectedDeviceObject?.device_model || 'unknown';

  // Load available scripts from virtualpytest/scripts folder
  useEffect(() => {
    const loadScripts = async () => {
      setLoadingScripts(true);
      try {
        const response = await fetch('/server/script/list');
        const data = await response.json();

        if (data.success && data.scripts) {
          setAvailableScripts(data.scripts);

          // Set default selection to first script if available
          if (data.scripts.length > 0 && !selectedScript) {
            setSelectedScript(data.scripts[0]);
          }
        } else {
          showError('Failed to load available scripts');
        }
      } catch (error) {
        showError('Failed to load available scripts');
        console.error('Error loading scripts:', error);
      } finally {
        setLoadingScripts(false);
      }
    };

    loadScripts();
  }, [selectedScript, showError]);

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

  // Check if device is mobile model for proper aspect ratio
  const isMobileModel = !!(deviceModel && deviceModel.toLowerCase().includes('mobile'));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Script Runner
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Script Execution */}
        <Grid item xs={12} md={showWizard && selectedHost && selectedDevice ? 6 : 12}>
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
                          disabled={loadingScripts}
                        >
                          {loadingScripts ? (
                            <MenuItem value="">
                              <CircularProgress size={20} />
                            </MenuItem>
                          ) : availableScripts.length === 0 ? (
                            <MenuItem value="">No scripts available</MenuItem>
                          ) : (
                            availableScripts.map((script) => (
                              <MenuItem key={script} value={script}>
                                {script}
                              </MenuItem>
                            ))
                          )}
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
                      disabled={
                        isExecuting ||
                        !selectedHost ||
                        !selectedDevice ||
                        !selectedScript ||
                        loadingScripts
                      }
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

        {/* Device Stream Viewer - Only show when host and device are selected */}
        {showWizard && selectedHost && selectedDevice && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Device Preview - {selectedHost}:{selectedDevice}
                </Typography>

                <Box
                  sx={{
                    height: 400,
                    backgroundColor: 'black',
                    borderRadius: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {streamUrl && selectedHostObject ? (
                    <StreamViewer
                      streamUrl={streamUrl}
                      isStreamActive={true}
                      isCapturing={isExecuting}
                      model={deviceModel}
                      layoutConfig={{
                        minHeight: '300px',
                        aspectRatio: isMobileModel ? '9/16' : '16/9',
                        objectFit: 'contain',
                        isMobileModel,
                      }}
                      isExpanded={false}
                      sx={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        textAlign: 'center',
                      }}
                    >
                      {isLoadingUrl ? (
                        <>
                          <CircularProgress sx={{ color: 'white', mb: 2 }} />
                          <Typography>Loading device stream...</Typography>
                        </>
                      ) : urlError ? (
                        <>
                          <Typography color="error" sx={{ mb: 1 }}>
                            Stream Error
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {urlError}
                          </Typography>
                        </>
                      ) : (
                        <Typography>No stream available</Typography>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Device info */}
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`Model: ${deviceModel}`} size="small" variant="outlined" />
                  {streamUrl && <Chip label="Stream Active" size="small" color="success" />}
                  {isExecuting && <Chip label="Script Running" size="small" color="warning" />}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

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
