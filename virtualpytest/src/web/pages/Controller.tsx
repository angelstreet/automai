import React, { useState, useEffect } from 'react';
import {
  Gamepad as ControllerIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Bluetooth as BluetoothIcon,
  Usb as UsbIcon,
  Wifi as WifiIcon,
  Error as DisconnectedIcon,
  CheckCircle as ConnectedIcon,
  PlayArrow as TestIcon,
  Memory as ProcessorIcon,
  Tv as TvIcon,
  Power as PowerIcon,
  Visibility as VerificationIcon,
  Close as CloseIcon,
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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Container,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface ControllerType {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'placeholder';
}

interface ControllerTypes {
  remote: ControllerType[];
  av: ControllerType[];
  network: ControllerType[];
  verification: ControllerType[];
  power: ControllerType[];
}

interface TestResult {
  success: boolean;
  test_results: any;
  message: string;
}

interface AndroidTVSession {
  connected: boolean;
  host_ip: string;
  device_ip: string;
}

// Centralized Android TV Remote Key Mappings - Edit these to change button functions
const ANDROID_TV_KEY_MAPPINGS = {
  POWER: 'POWER',
  VOICE: 'MENU',  // Voice button mapped to MENU - change as needed
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  SELECT: 'OK',   // Center button
  BACK: 'BACK',
  HOME: 'HOME',
  MENU: 'MENU',
  REWIND: 'REWIND',
  PLAY_PAUSE: 'PLAY_PAUSE',
  FAST_FORWARD: 'FAST_FORWARD',
  VOLUME_UP: 'VOLUME_UP',
  VOLUME_DOWN: 'VOLUME_DOWN',
  MUTE: 'VOLUME_MUTE'
};

// Comprehensive Android TV Remote Button Configuration
// Edit positions, sizes, and key mappings here to match your remote image
const REMOTE_BUTTON_CONFIG = {
  POWER: {
    key: 'POWER',
    position: { top: 34, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 26, height: 26 },
    shape: 'circle', // 'circle' or 'rectangle'
    comment: 'Power button at top center'
  },
  VOICE: {
    key: 'MENU',
    position: { top: 71, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 30, height: 30 },
    shape: 'circle',
    comment: 'Voice/Microphone button'
  },
  UP: {
    key: 'UP',
    position: { top: 120, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 22, height: 19 },
    shape: 'rectangle',
    comment: 'Navigation up'
  },
  DOWN: {
    key: 'DOWN',
    position: { top: 169, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 22, height: 19 },
    shape: 'rectangle',
    comment: 'Navigation down'
  },
  LEFT: {
    key: 'LEFT',
    position: { top: 144, left: 34 },
    size: { width: 19, height: 22 },
    shape: 'rectangle',
    comment: 'Navigation left'
  },
  RIGHT: {
    key: 'RIGHT',
    position: { top: 144, right: 34 },
    size: { width: 19, height: 22 },
    shape: 'rectangle',
    comment: 'Navigation right'
  },
  SELECT: {
    key: 'OK',
    position: { top: 133, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 34, height: 34 },
    shape: 'circle',
    comment: 'Center select button'
  },
  BACK: {
    key: 'BACK',
    position: { top: 203, left: 26 },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Back button'
  },
  HOME: {
    key: 'HOME',
    position: { top: 203, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Home button'
  },
  MENU: {
    key: 'MENU',
    position: { top: 203, right: 26 },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Menu button'
  },
  REWIND: {
    key: 'REWIND',
    position: { top: 240, left: 26 },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Rewind button'
  },
  PLAY_PAUSE: {
    key: 'PLAY_PAUSE',
    position: { top: 240, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Play/Pause button'
  },
  FAST_FORWARD: {
    key: 'FAST_FORWARD',
    position: { top: 240, right: 26 },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Fast forward button'
  },
  VOLUME_UP: {
    key: 'VOLUME_UP',
    position: { top: 285, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 38, height: 15 },
    shape: 'rectangle',
    comment: 'Volume up button'
  },
  VOLUME_DOWN: {
    key: 'VOLUME_DOWN',
    position: { top: 308, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 38, height: 15 },
    shape: 'rectangle',
    comment: 'Volume down button'
  },
  MUTE: {
    key: 'VOLUME_MUTE',
    position: { top: 334, left: '50%', transform: 'translateX(-50%)' },
    size: { width: 22, height: 22 },
    shape: 'circle',
    comment: 'Mute button'
  }
};

const Controller: React.FC = () => {
  const [controllerTypes, setControllerTypes] = useState<ControllerTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult | null>(null);

  // Form state
  const [newController, setNewController] = useState({
    name: '',
    controller_type: 'remote',
    implementation: '',
    parameters: {}
  });

  const [testController, setTestController] = useState({
    controller_type: 'remote',
    implementation: '',
    parameters: {}
  });

  // Android TV Remote Modal State
  const [androidTVModalOpen, setAndroidTVModalOpen] = useState(false);
  const [androidTVSession, setAndroidTVSession] = useState<AndroidTVSession>({
    connected: false,
    host_ip: '',
    device_ip: ''
  });
  const [connectionForm, setConnectionForm] = useState({
    host_ip: '',
    host_username: '',
    host_password: '',
    host_port: '22',
    device_ip: '',
    device_port: '5555'
  });
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Debug mode for button positioning
  const [debugMode, setDebugMode] = useState(false);

  // Load default values when modal opens
  useEffect(() => {
    if (androidTVModalOpen) {
      fetchDefaultValues();
    }
  }, [androidTVModalOpen]);

  const fetchDefaultValues = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/defaults');
      const result = await response.json();
      
      if (result.success && result.defaults) {
        setConnectionForm(prev => ({
          ...prev,
          ...result.defaults
        }));
      }
    } catch (error) {
      console.log('Could not load default values:', error);
    }
  };

  useEffect(() => {
    fetchControllerTypes();
  }, []);

  const fetchControllerTypes = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching controller types from backend...');
      
      // Use absolute URL to ensure we're hitting the correct backend
      const response = await fetch('http://localhost:5009/api/virtualpytest/controller-types');
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('✅ Controller types received:', Object.keys(data.controller_types));
      
      setControllerTypes(data.controller_types);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch controller types:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      console.log('🔍 Testing backend connection...');
      const response = await fetch('http://localhost:5009/api/health');
      console.log('📡 Health check response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connection successful:', data);
        setSnackbarMessage('Backend connection successful!');
        setSnackbarOpen(true);
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Backend connection failed:', err);
      setSnackbarMessage(`Backend connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    }
  };

  const handleCreateController = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/controllers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newController),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSnackbarMessage(`Controller "${newController.name}" created successfully!`);
      setSnackbarOpen(true);
      setCreateDialogOpen(false);
      setNewController({
        name: '',
        controller_type: 'remote',
        implementation: '',
        parameters: {}
      });
    } catch (err) {
      console.error('Failed to create controller:', err);
      setSnackbarMessage(err instanceof Error ? err.message : 'Failed to create controller');
      setSnackbarOpen(true);
    }
  };

  const handleTestController = async () => {
    try {
      setTesting(true);
      const response = await fetch('http://localhost:5009/api/virtualpytest/controllers/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testController),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTestResults(data);
      setSnackbarMessage(data.message);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to test controller:', err);
      setSnackbarMessage(err instanceof Error ? err.message : 'Failed to test controller');
      setSnackbarOpen(true);
    } finally {
      setTesting(false);
    }
  };

  const getControllerIcon = (type: string) => {
    switch (type) {
      case 'remote': return <ControllerIcon />;
      case 'av': return <TvIcon />;
      case 'network': return <WifiIcon />;
      case 'verification': return <VerificationIcon />;
      case 'power': return <PowerIcon />;
      default: return <ProcessorIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'placeholder': return 'default';
      default: return 'default';
    }
  };

  const handleControllerClick = (category: string, controller: ControllerType) => {
    if (category === 'remote' && controller.id === 'real_android_tv') {
      setAndroidTVModalOpen(true);
    }
  };

  const handleTakeControl = async () => {
    setConnectionLoading(true);
    setConnectionError(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionForm),
      });

      const result = await response.json();

      if (result.success) {
        setAndroidTVSession({
          connected: true,
          host_ip: connectionForm.host_ip,
          device_ip: connectionForm.device_ip
        });
      } else {
        setConnectionError(result.error || 'Failed to connect');
      }
    } catch (err: any) {
      setConnectionError(err.message || 'Connection failed');
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleReleaseControl = async () => {
    setConnectionLoading(true);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/release-control', {
        method: 'POST',
      });

      const result = await response.json();
      
      // Always reset session state regardless of response
      setAndroidTVSession({
        connected: false,
        host_ip: '',
        device_ip: ''
      });
      setConnectionError(null);
    } catch (err: any) {
      // Still reset session even if release fails
      setAndroidTVSession({
        connected: false,
        host_ip: '',
        device_ip: ''
      });
    } finally {
      setConnectionLoading(false);
    }
  };

  const handleRemoteCommand = async (command: string, params: any = {}) => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Remote command failed:', result.error);
      }
    } catch (err: any) {
      console.error('Remote command error:', err);
    }
  };

  const handleCloseModal = () => {
    if (androidTVSession.connected) {
      handleReleaseControl();
    }
    setAndroidTVModalOpen(false);
    setConnectionForm({
      host_ip: '',
      host_username: '',
      host_password: '',
      host_port: '22',
      device_ip: '',
      device_port: '5555'
    });
  };

  // Helper function to render a button from configuration
  const renderRemoteButton = (buttonId: string, config: any) => {
    const borderRadius = config.shape === 'circle' ? '50%' : config.shape === 'rectangle' ? 2 : '50%';
    
    return (
      <Box
        key={buttonId}
        onClick={() => handleRemoteCommand('press_key', { key: config.key })}
        sx={{
          position: 'absolute',
          ...config.position,
          ...config.size,
          borderRadius,
          cursor: 'pointer',
          // Show overlay in debug mode or on hover
          bgcolor: debugMode ? 'rgba(255,0,0,0.3)' : 'transparent',
          border: debugMode ? '2px solid rgba(255,0,0,0.8)' : 'none',
          '&:hover': {
            bgcolor: debugMode ? 'rgba(255,0,0,0.5)' : 'rgba(255,255,255,0.2)',
            border: debugMode ? '2px solid rgba(255,0,0,1)' : '2px solid rgba(255,255,255,0.5)'
          },
          // Show button ID in debug mode
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: debugMode ? '8px' : '0px',
          color: debugMode ? 'white' : 'transparent',
          fontWeight: 'bold',
          textShadow: debugMode ? '1px 1px 2px black' : 'none'
        }}
        title={`${buttonId}: ${config.comment} (Key: ${config.key})`} // Enhanced tooltip
      >
        {debugMode && buttonId}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Controller Configuration
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchControllerTypes}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        VirtualPyTest Controller Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Controller Types Overview - Compact Grid */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Available Controller Types
                </Typography>
              </Box>
              
              {controllerTypes && (
                <Grid container spacing={2}>
                  {Object.entries(controllerTypes).map(([type, implementations]) => (
                    <Grid item xs={12} sm={6} md={2.4} key={type}>
                      <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                        <Box display="flex" justifyContent="center" mb={1}>
                          {getControllerIcon(type)}
                        </Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          {implementations.length} types
                        </Typography>
                        <Box display="flex" justifyContent="center" gap={0.5} flexWrap="wrap">
                          {implementations.filter((impl: ControllerType) => impl.status === 'available').length > 0 && (
                            <Chip 
                              label={`${implementations.filter((impl: ControllerType) => impl.status === 'available').length} Ready`}
                              color="success" 
                              size="small" 
                            />
                          )}
                          {implementations.filter((impl: ControllerType) => impl.status === 'placeholder').length > 0 && (
                            <Chip 
                              label={`${implementations.filter((impl: ControllerType) => impl.status === 'placeholder').length} Planned`}
                              color="default" 
                              size="small" 
                            />
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed Controller Types */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Controller Implementations
              </Typography>
              
              {controllerTypes && Object.entries(controllerTypes).map(([type, implementations]) => (
                <Accordion key={type}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={2}>
                      {getControllerIcon(type)}
                      <Typography variant="h6">
                        {type.charAt(0).toUpperCase() + type.slice(1)} Controllers
                      </Typography>
                      <Chip 
                        label={`${implementations.length} types`} 
                        size="small" 
                        color="primary" 
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {implementations.map((impl: ControllerType, index: number) => (
                        <React.Fragment key={impl.id}>
                          <ListItem
                            onClick={() => impl.status === 'available' && handleControllerClick(type, impl)}
                            sx={{ 
                              cursor: impl.status === 'available' ? 'pointer' : 'default',
                              '&:hover': impl.status === 'available' ? { backgroundColor: 'action.hover' } : {}
                            }}
                          >
                            <ListItemIcon>
                              {impl.status === 'available' ? (
                                <ConnectedIcon color="success" />
                              ) : (
                                <DisconnectedIcon color="disabled" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={impl.name}
                              secondary={impl.description}
                            />
                            <Chip 
                              label={impl.status} 
                              color={getStatusColor(impl.status) as any}
                              size="small" 
                            />
                          </ListItem>
                          {index < implementations.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Controller Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Controller</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Controller Name"
              value={newController.name}
              onChange={(e) => setNewController({ ...newController, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Controller Type</InputLabel>
              <Select
                value={newController.controller_type}
                onChange={(e) => setNewController({ 
                  ...newController, 
                  controller_type: e.target.value,
                  implementation: '' 
                })}
              >
                <MenuItem value="remote">Remote Control</MenuItem>
                <MenuItem value="av">Audio/Video Capture</MenuItem>
                <MenuItem value="network">Network Streaming</MenuItem>
                <MenuItem value="verification">Verification</MenuItem>
                <MenuItem value="power">Power Management</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Implementation</InputLabel>
              <Select
                value={newController.implementation}
                onChange={(e) => setNewController({ ...newController, implementation: e.target.value })}
                disabled={!controllerTypes}
              >
                {controllerTypes && controllerTypes[newController.controller_type as keyof ControllerTypes]?.map((impl) => (
                  <MenuItem key={impl.id} value={impl.id} disabled={impl.status !== 'available'}>
                    {impl.name} {impl.status !== 'available' && '(Not Available)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateController} 
            variant="contained"
            disabled={!newController.name || !newController.implementation}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Controller Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Test Controller</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Controller Type</InputLabel>
                  <Select
                    value={testController.controller_type}
                    onChange={(e) => setTestController({ 
                      ...testController, 
                      controller_type: e.target.value,
                      implementation: '' 
                    })}
                  >
                    <MenuItem value="remote">Remote Control</MenuItem>
                    <MenuItem value="av">Audio/Video Capture</MenuItem>
                    <MenuItem value="network">Network Streaming</MenuItem>
                    <MenuItem value="verification">Verification</MenuItem>
                    <MenuItem value="power">Power Management</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Implementation</InputLabel>
                  <Select
                    value={testController.implementation}
                    onChange={(e) => setTestController({ ...testController, implementation: e.target.value })}
                    disabled={!controllerTypes}
                  >
                    {controllerTypes && controllerTypes[testController.controller_type as keyof ControllerTypes]?.map((impl) => (
                      <MenuItem key={impl.id} value={impl.id} disabled={impl.status !== 'available'}>
                        {impl.name} {impl.status !== 'available' && '(Not Available)'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {testResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Test Results
                </Typography>
                <Alert severity={testResults.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {testResults.message}
                </Alert>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <pre style={{ margin: 0, fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(testResults.test_results, null, 2)}
                  </pre>
                </Paper>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
          <Button 
            onClick={handleTestController} 
            variant="contained"
            disabled={!testController.implementation || testing}
            startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
          >
            {testing ? 'Testing...' : 'Run Test'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Android TV Remote Modal */}
      <Dialog 
        open={androidTVModalOpen} 
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              Android TV Remote Control
              {androidTVSession.connected && (
                <Chip 
                  label="Connected" 
                  color="success" 
                  size="small" 
                  sx={{ ml: 2 }} 
                />
              )}
            </Box>
            {androidTVSession.connected && (
              <Button
                variant={debugMode ? "contained" : "outlined"}
                size="small"
                onClick={() => setDebugMode(!debugMode)}
              >
                {debugMode ? 'Hide Overlays' : 'Show Overlays'}
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          {!androidTVSession.connected ? (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter SSH and ADB connection details to take control of the Android TV device.
              </Typography>
              
              {connectionError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {connectionError}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SSH Host IP"
                    value={connectionForm.host_ip}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, host_ip: e.target.value }))}
                    placeholder="192.168.1.100"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SSH Port"
                    value={connectionForm.host_port}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, host_port: e.target.value }))}
                    placeholder="22"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SSH Username"
                    value={connectionForm.host_username}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, host_username: e.target.value }))}
                    placeholder="root"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SSH Password"
                    type="password"
                    value={connectionForm.host_password}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, host_password: e.target.value }))}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Android Device IP"
                    value={connectionForm.device_ip}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, device_ip: e.target.value }))}
                    placeholder="192.168.1.101"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="ADB Port"
                    value={connectionForm.device_port}
                    onChange={(e) => setConnectionForm(prev => ({ ...prev, device_port: e.target.value }))}
                    placeholder="5555"
                  />
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ pt: 2 }}>
              {/* Android TV Remote Interface */}
              <Box sx={{ pt: 1, maxWidth: 140, mx: 'auto' }}>
                {/* Remote Control with Real Image Background */}
                <Box sx={{ 
                  position: 'relative',
                  width: 140,
                  height: 360,
                  mx: 'auto',
                  backgroundImage: 'url("/android-tv-remote.png")', // You'll need to add this image to public folder
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  // Fallback dark background if image doesn't load
                  bgcolor: '#2a2a2a',
                  borderRadius: 6,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }}>
                  
                  {/* Render all buttons from configuration */}
                  {Object.entries(REMOTE_BUTTON_CONFIG).map(([buttonId, config]) => 
                    renderRemoteButton(buttonId, config)
                  )}

                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>
            Close
          </Button>
          {!androidTVSession.connected ? (
            <Button 
              variant="contained" 
              onClick={handleTakeControl}
              disabled={connectionLoading || !connectionForm.host_ip || !connectionForm.host_username || !connectionForm.host_password || !connectionForm.device_ip}
            >
              {connectionLoading ? <CircularProgress size={20} /> : 'Take Control'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="error"
              onClick={handleReleaseControl}
              disabled={connectionLoading}
            >
              {connectionLoading ? <CircularProgress size={20} /> : 'Release Control'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton size="small" color="inherit" onClick={() => setSnackbarOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default Controller;
