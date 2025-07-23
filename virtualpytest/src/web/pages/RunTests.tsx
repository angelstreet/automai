import { Terminal as ScriptIcon, Link as LinkIcon } from '@mui/icons-material';
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
  TextField,
  Autocomplete,
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
  parameters?: string;
  reportUrl?: string;
}

// Script parameter interface
interface ScriptParameter {
  name: string;
  type: 'positional' | 'optional';
  required: boolean;
  help: string;
  default?: string;
  suggestions?: {
    suggested?: string;
    confidence?: string;
  };
}

interface ScriptAnalysis {
  success: boolean;
  parameters: ScriptParameter[];
  script_name: string;
  has_parameters: boolean;
  error?: string;
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

  // Script parameters state
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysis | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [_analyzingScript, setAnalyzingScript] = useState<boolean>(false);

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

  // Analyze script parameters when script selection changes
  useEffect(() => {
    const analyzeScript = async () => {
      if (!selectedScript || !showWizard) {
        setScriptAnalysis(null);
        setParameterValues({});
        return;
      }

      setAnalyzingScript(true);
      try {
        const response = await fetch('/server/script/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script_name: selectedScript,
            device_model: deviceModel,
            device_id: selectedDevice,
          }),
        });

        const analysis: ScriptAnalysis = await response.json();

        if (analysis.success) {
          setScriptAnalysis(analysis);

          // Pre-fill parameter values with suggestions
          const newParameterValues: Record<string, string> = {};
          analysis.parameters.forEach((param) => {
            if (param.suggestions?.suggested) {
              newParameterValues[param.name] = param.suggestions.suggested;
            } else if (param.default) {
              newParameterValues[param.name] = param.default;
            } else {
              newParameterValues[param.name] = '';
            }
          });
          setParameterValues(newParameterValues);
        } else {
          setScriptAnalysis(null);
          setParameterValues({});
        }
      } catch (error) {
        console.error('Error analyzing script:', error);
        setScriptAnalysis(null);
        setParameterValues({});
      } finally {
        setAnalyzingScript(false);
      }
    };

    analyzeScript();
  }, [selectedScript, deviceModel, selectedDevice, showWizard]);

  // Update parameter suggestions when device changes
  useEffect(() => {
    if (scriptAnalysis && selectedDevice && deviceModel) {
      const newParameterValues = { ...parameterValues };

      scriptAnalysis.parameters.forEach((param) => {
        // Re-evaluate suggestions based on new device context
        if (param.name === 'userinterface_name' && deviceModel) {
          const modelLower = deviceModel.toLowerCase();
          let suggested = '';

          if (modelLower.includes('mobile') || modelLower.includes('phone')) {
            if (modelLower.includes('horizon')) {
              suggested = 'horizon_android_mobile';
            } else if (modelLower.includes('vz') || modelLower.includes('verizon')) {
              suggested = 'vz_android_mobile';
            } else {
              suggested = 'horizon_android_mobile';
            }
          } else if (modelLower.includes('tv') || modelLower.includes('android_tv')) {
            if (modelLower.includes('horizon')) {
              suggested = 'horizon_android_tv';
            } else if (modelLower.includes('vz') || modelLower.includes('verizon')) {
              suggested = 'vz_android_tv';
            } else {
              suggested = 'horizon_android_tv';
            }
          } else {
            suggested = 'horizon_android_mobile';
          }

          newParameterValues[param.name] = suggested;
        } else if (param.name === 'device' && selectedDevice) {
          newParameterValues[param.name] = selectedDevice;
        } else if (param.name === 'host' && selectedHost) {
          newParameterValues[param.name] = selectedHost;
        }
      });

      setParameterValues(newParameterValues);
    }
  }, [selectedDevice, deviceModel, selectedHost, scriptAnalysis, parameterValues]);

  const handleParameterChange = (paramName: string, value: string) => {
    setParameterValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const buildParameterString = () => {
    if (!scriptAnalysis) return '';

    const paramStrings: string[] = [];

    scriptAnalysis.parameters.forEach((param) => {
      const value = parameterValues[param.name]?.trim();
      if (value) {
        if (param.type === 'positional') {
          paramStrings.push(value);
        } else {
          paramStrings.push(`--${param.name} ${value}`);
        }
      }
    });

    return paramStrings.join(' ');
  };

  const validateParameters = () => {
    if (!scriptAnalysis) return { valid: true, errors: [] };

    const errors: string[] = [];

    scriptAnalysis.parameters.forEach((param) => {
      const value = parameterValues[param.name]?.trim();
      if (param.required && !value) {
        errors.push(`${param.name} is required`);
      }
    });

    return { valid: errors.length === 0, errors };
  };

  const handleExecuteScript = async () => {
    if (!selectedHost || !selectedDevice || !selectedScript) {
      showError('Please select host, device, and script');
      return;
    }

    // Validate parameters
    const validation = validateParameters();
    if (!validation.valid) {
      showError(`Parameter validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    const parameterString = buildParameterString();

    // Create execution record
    const executionId = `exec_${Date.now()}`;
    const newExecution: ExecutionRecord = {
      id: executionId,
      scriptName: selectedScript,
      hostName: selectedHost,
      deviceId: selectedDevice,
      startTime: new Date().toLocaleTimeString(),
      status: 'running',
      parameters: parameterString,
    };

    setExecutions((prev) => [newExecution, ...prev]);
    showInfo(
      `Script "${selectedScript}" started on ${selectedHost}:${selectedDevice}${parameterString ? ` with parameters: ${parameterString}` : ''}`,
    );

    try {
      const result = await executeScript(
        selectedScript,
        selectedHost,
        selectedDevice,
        parameterString,
      );

      // Update execution record on completion
      setExecutions((prev) =>
        prev.map((exec) =>
          exec.id === executionId
            ? {
                ...exec,
                endTime: new Date().toLocaleTimeString(),
                status: result?.success === false ? 'failed' : 'completed',
                reportUrl: result?.report_url,
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

  const renderParameterInput = (param: ScriptParameter) => {
    const value = parameterValues[param.name] || '';

    // Special handling for userinterface_name with autocomplete
    if (param.name === 'userinterface_name') {
      const options = ['horizon_android_mobile', 'horizon_android_tv'];

      return (
        <Autocomplete
          key={param.name}
          options={options}
          value={value}
          onChange={(_event, newValue) => handleParameterChange(param.name, newValue || '')}
          onInputChange={(_event, newInputValue) =>
            handleParameterChange(param.name, newInputValue)
          }
          freeSolo
          size="small"
          renderInput={(params) => (
            <TextField
              {...params}
              label={`${param.name}${param.required ? ' *' : ''}`}
              size="small"
              fullWidth
              error={param.required && !value.trim()}
            />
          )}
        />
      );
    }

    // Default text field for other parameters
    return (
      <TextField
        key={param.name}
        label={`${param.name}${param.required ? ' *' : ''}`}
        value={value}
        onChange={(e) => handleParameterChange(param.name, e.target.value)}
        size="small"
        fullWidth
        error={param.required && !value.trim()}
        placeholder={param.default || ''}
      />
    );
  };

  // Filter to only show required parameters
  const requiredParameters = scriptAnalysis?.parameters.filter((param) => param.required) || [];

  // Check if device is mobile model for proper aspect ratio
  const isMobileModel = !!(deviceModel && deviceModel.toLowerCase().includes('mobile'));

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Script Runner
      </Typography>

      <Grid container spacing={2}>
        {/* Script Execution */}
        <Grid item xs={12} md={showWizard && selectedHost && selectedDevice ? 6 : 12}>
          <Card sx={{ '& .MuiCardContent-root': { p: 2, '&:last-child': { pb: 2 } } }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Execute Script
              </Typography>

              {!showWizard ? (
                // Show launch button when wizard is not active
                <Box display="flex" justifyContent="center" py={2}>
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
                  <Grid container spacing={1} sx={{ mb: 1 }}>
                    {/* First row: Script, Host, Device */}
                    <Grid item xs={12} sm={3}>
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

                    <Grid item xs={12} sm={3}>
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

                    <Grid item xs={12} sm={3}>
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

                    {/* Parameters on the same row if there's space */}
                    {requiredParameters.length > 0 &&
                      requiredParameters.map((param) => (
                        <Grid item xs={12} sm={3} key={param.name}>
                            {renderParameterInput(param)}
                          </Grid>
                        ))}
                      </Grid>

                  <Box display="flex" gap={1}>
                    <Button
                      variant="contained"
                      startIcon={isExecuting ? <CircularProgress size={16} /> : <ScriptIcon />}
                      onClick={handleExecuteScript}
                      disabled={
                        isExecuting ||
                        !selectedHost ||
                        !selectedDevice ||
                        !selectedScript ||
                        loadingScripts ||
                        !validateParameters().valid
                      }
                      size="small"
                    >
                      {isExecuting ? 'Executing...' : 'Execute Script'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowWizard(false);
                        setSelectedHost('');
                        setSelectedDevice('');
                        setScriptAnalysis(null);
                        setParameterValues({});
                      }}
                      size="small"
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
            <Card sx={{ '& .MuiCardContent-root': { p: 1, '&:last-child': { pb: 1 } } }}>
              <CardContent>
                <Box
                  sx={{
                    height: 280,
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
                        minHeight: '260px',
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
                          <CircularProgress sx={{ color: 'white', mb: 1 }} size={24} />
                          <Typography variant="body2">Loading device stream...</Typography>
                        </>
                      ) : urlError ? (
                        <>
                          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                            Stream Error
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {urlError}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2">No stream available</Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Execution History */}
        <Grid item xs={12}>
          <Card sx={{ '& .MuiCardContent-root': { p: 2, '&:last-child': { pb: 2 } } }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Execution History
              </Typography>

              {executions.length === 0 ? (
                <Box
                  sx={{
                    p: 2,
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
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Script</TableCell>
                        <TableCell>Start Time</TableCell>
                        <TableCell>End Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Report</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {executions.map((execution) => (
                        <TableRow
                          key={execution.id}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                            },
                          }}
                        >
                          <TableCell>{execution.scriptName}</TableCell>
                          <TableCell>{execution.startTime}</TableCell>
                          <TableCell>{execution.endTime || '-'}</TableCell>
                          <TableCell>{getStatusChip(execution.status)}</TableCell>
                          <TableCell>
                            {execution.reportUrl ? (
                              <Chip
                                label="View Report"
                                component="a"
                                href={execution.reportUrl}
                                target="_blank"
                                clickable
                                size="small"
                                sx={{ cursor: 'pointer' }}
                                icon={<LinkIcon />}
                                color="primary"
                                variant="outlined"
                              />
                            ) : (
                              <Chip label="No Report" size="small" variant="outlined" disabled />
                            )}
                          </TableCell>
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
