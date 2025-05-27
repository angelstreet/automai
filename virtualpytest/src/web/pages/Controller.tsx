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

// IR Remote Session interface
interface IRRemoteSession {
  connected: boolean;
  device_path: string;
  protocol: string;
}

// Bluetooth Remote Session interface  
interface BluetoothRemoteSession {
  connected: boolean;
  device_address: string;
  device_name: string;
}

// Remote configuration interfaces
interface RemoteInfo {
  name: string;
  type: string;
  image_url: string;
  default_scale: number;
  min_scale: number;
  max_scale: number;
  button_scale_factor?: number;
  global_offset?: {
    x: number;
    y: number;
  };
}

interface ButtonConfig {
  key: string;
  position: any;
  size: any;
  shape: string;
  comment: string;
  local_offset?: {
    x: number;
    y: number;
  };
}

interface RemoteConfig {
  remote_info: RemoteInfo;
  button_layout: { [key: string]: ButtonConfig };
}

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

  // Remote configurations fetched from backend
  const [androidTVConfig, setAndroidTVConfig] = useState<RemoteConfig | null>(null);
  const [irRemoteConfig, setIrRemoteConfig] = useState<RemoteConfig | null>(null);
  const [bluetoothConfig, setBluetoothConfig] = useState<RemoteConfig | null>(null);

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

  // Remote scaling parameter - 1.0 = original size, 1.5 = 50% larger, etc.
  const [remoteScale, setRemoteScale] = useState(1.2); // Default to 20% larger than current

  // IR Remote Modal State
  const [irRemoteModalOpen, setIrRemoteModalOpen] = useState(false);
  const [irRemoteSession, setIrRemoteSession] = useState<IRRemoteSession>({
    connected: false,
    device_path: '/dev/lirc0',
    protocol: 'NEC'
  });
  const [irConnectionForm, setIrConnectionForm] = useState({
    device_path: '/dev/lirc0',
    protocol: 'NEC',
    frequency: '38000'
  });
  const [irConnectionLoading, setIrConnectionLoading] = useState(false);
  const [irConnectionError, setIrConnectionError] = useState<string | null>(null);

  // Bluetooth Remote Modal State
  const [bluetoothModalOpen, setBluetoothModalOpen] = useState(false);
  const [bluetoothSession, setBluetoothSession] = useState<BluetoothRemoteSession>({
    connected: false,
    device_address: '00:00:00:00:00:00',
    device_name: 'Unknown Device'
  });
  const [bluetoothConnectionForm, setBluetoothConnectionForm] = useState({
    device_address: '00:00:00:00:00:00',
    device_name: 'TV Remote',
    pairing_pin: '0000'
  });
  const [bluetoothConnectionLoading, setBluetoothConnectionLoading] = useState(false);
  const [bluetoothConnectionError, setBluetoothConnectionError] = useState<string | null>(null);

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

  // Fetch remote configurations
  const fetchAndroidTVConfig = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-tv/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setAndroidTVConfig(result.config);
        setRemoteScale(result.config.remote_info.default_scale);
      }
    } catch (error) {
      console.log('Could not load Android TV config:', error);
    }
  };

  const fetchIrRemoteConfig = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/ir-remote/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setIrRemoteConfig(result.config);
        setRemoteScale(result.config.remote_info.default_scale);
      }
    } catch (error) {
      console.log('Could not load IR remote config:', error);
    }
  };

  const fetchBluetoothConfig = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/config');
      const result = await response.json();
      
      if (result.success && result.config) {
        setBluetoothConfig(result.config);
        setRemoteScale(result.config.remote_info.default_scale);
      }
    } catch (error) {
      console.log('Could not load Bluetooth config:', error);
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
      fetchAndroidTVConfig();
    } else if (category === 'remote' && controller.id === 'ir_remote') {
      setIrRemoteModalOpen(true);
      fetchIrRemoteConfig();
    } else if (category === 'remote' && controller.id === 'bluetooth_remote') {
      setBluetoothModalOpen(true);
      fetchBluetoothConfig();
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

  // IR Remote Handlers
  const handleIrConnect = async () => {
    setIrConnectionLoading(true);
    setIrConnectionError(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/ir-remote/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(irConnectionForm),
      });

      const result = await response.json();

      if (result.success) {
        setIrRemoteSession({
          connected: true,
          device_path: irConnectionForm.device_path,
          protocol: irConnectionForm.protocol
        });
      } else {
        setIrConnectionError(result.error || 'Failed to connect to IR device');
      }
    } catch (err: any) {
      setIrConnectionError(err.message || 'IR connection failed');
    } finally {
      setIrConnectionLoading(false);
    }
  };

  const handleIrDisconnect = async () => {
    setIrConnectionLoading(true);

    try {
      await fetch('http://localhost:5009/api/virtualpytest/ir-remote/disconnect', {
        method: 'POST',
      });
      
      setIrRemoteSession({
        connected: false,
        device_path: '/dev/lirc0',
        protocol: 'NEC'
      });
      setIrConnectionError(null);
    } catch (err: any) {
      setIrRemoteSession({
        connected: false,
        device_path: '/dev/lirc0',
        protocol: 'NEC'
      });
    } finally {
      setIrConnectionLoading(false);
    }
  };

  const handleIrCommand = async (command: string, params: any = {}) => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/ir-remote/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('IR command failed:', result.error);
      }
    } catch (err: any) {
      console.error('IR command error:', err);
    }
  };

  const handleCloseIrModal = () => {
    if (irRemoteSession.connected) {
      handleIrDisconnect();
    }
    setIrRemoteModalOpen(false);
    setIrConnectionForm({
      device_path: '/dev/lirc0',
      protocol: 'NEC',
      frequency: '38000'
    });
  };

  // Bluetooth Remote Handlers
  const handleBluetoothConnect = async () => {
    setBluetoothConnectionLoading(true);
    setBluetoothConnectionError(null);

    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bluetoothConnectionForm),
      });

      const result = await response.json();

      if (result.success) {
        setBluetoothSession({
          connected: true,
          device_address: bluetoothConnectionForm.device_address,
          device_name: bluetoothConnectionForm.device_name
        });
      } else {
        setBluetoothConnectionError(result.error || 'Failed to connect to Bluetooth device');
      }
    } catch (err: any) {
      setBluetoothConnectionError(err.message || 'Bluetooth connection failed');
    } finally {
      setBluetoothConnectionLoading(false);
    }
  };

  const handleBluetoothDisconnect = async () => {
    setBluetoothConnectionLoading(true);

    try {
      await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/disconnect', {
        method: 'POST',
      });
      
      setBluetoothSession({
        connected: false,
        device_address: '00:00:00:00:00:00',
        device_name: 'Unknown Device'
      });
      setBluetoothConnectionError(null);
    } catch (err: any) {
      setBluetoothSession({
        connected: false,
        device_address: '00:00:00:00:00:00',
        device_name: 'Unknown Device'
      });
    } finally {
      setBluetoothConnectionLoading(false);
    }
  };

  const handleBluetoothCommand = async (command: string, params: any = {}) => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/bluetooth-remote/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
      });

      const result = await response.json();
      if (!result.success) {
        console.error('Bluetooth command failed:', result.error);
      }
    } catch (err: any) {
      console.error('Bluetooth command error:', err);
    }
  };

  const handleCloseBluetoothModal = () => {
    if (bluetoothSession.connected) {
      handleBluetoothDisconnect();
    }
    setBluetoothModalOpen(false);
    setBluetoothConnectionForm({
      device_address: '00:00:00:00:00:00',
      device_name: 'TV Remote',
      pairing_pin: '0000'
    });
  };

  // Helper function to render a button from configuration
  const renderRemoteButton = (buttonId: string, config: any, commandHandler: (command: string, params: any) => void, remoteConfig: RemoteConfig | null, scale: number = 1) => {
    if (!remoteConfig) return null;
    
    const borderRadius = config.shape === 'circle' ? '50%' : config.shape === 'rectangle' ? 2 : '50%';
    
    // Get scaling and offset parameters from remote config
    const buttonScaleFactor = remoteConfig.remote_info.button_scale_factor || 1.0;
    const globalOffset = remoteConfig.remote_info.global_offset || { x: 0, y: 0 };
    const localOffset = config.local_offset || { x: 0, y: 0 };
    
    // Apply scaling and offsets to position and size
    const scaledPosition = { ...config.position };
    const scaledSize = { ...config.size };
    
    // Scale numeric position values and apply offsets
    if (typeof scaledPosition.top === 'number') {
      scaledPosition.top = (scaledPosition.top * scale) + (globalOffset.y * scale) + (localOffset.y * scale);
    }
    if (typeof scaledPosition.left === 'number') {
      scaledPosition.left = (scaledPosition.left * scale) + (globalOffset.x * scale) + (localOffset.x * scale);
    }
    if (typeof scaledPosition.right === 'number') {
      scaledPosition.right = (scaledPosition.right * scale) + (globalOffset.x * scale) + (localOffset.x * scale);
    }
    if (typeof scaledPosition.bottom === 'number') {
      scaledPosition.bottom = (scaledPosition.bottom * scale) + (globalOffset.y * scale) + (localOffset.y * scale);
    }
    
    // Scale size values with button scale factor
    if (typeof scaledSize.width === 'number') {
      scaledSize.width = scaledSize.width * scale * buttonScaleFactor;
    }
    if (typeof scaledSize.height === 'number') {
      scaledSize.height = scaledSize.height * scale * buttonScaleFactor;
    }
    
    return (
      <Box
        key={buttonId}
        onClick={() => commandHandler('press_key', { key: config.key })}
        sx={{
          position: 'absolute',
          ...scaledPosition,
          ...scaledSize,
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
          fontSize: debugMode ? `${8 * scale}px` : '0px',
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
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
            {/* Left side: Title and status */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" component="span">
                Android TV Remote
              </Typography>
              {androidTVSession.connected && (
                <Chip 
                  label="Connected" 
                  color="success" 
                  size="small"
                />
              )}
            </Box>
            
            {/* Right side: Controls */}
            {androidTVSession.connected && (
              <Box display="flex" alignItems="center" gap={1}>
                {/* Show Overlays button */}
                <Button
                  variant={debugMode ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setDebugMode(!debugMode)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  {debugMode ? 'Hide Overlays' : 'Show Overlays'}
                </Button>
                
                {/* Scale controls */}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    Scale:
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRemoteScale(prev => Math.max(androidTVConfig?.remote_info.min_scale || 0.5, prev - 0.1))}
                    disabled={remoteScale <= (androidTVConfig?.remote_info.min_scale || 0.5)}
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                  >
                    -
                  </Button>
                  <Typography variant="caption" sx={{ minWidth: 35, textAlign: 'center', fontSize: '0.75rem' }}>
                    {Math.round(remoteScale * 100)}%
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRemoteScale(prev => Math.min(androidTVConfig?.remote_info.max_scale || 2.0, prev + 0.1))}
                    disabled={remoteScale >= (androidTVConfig?.remote_info.max_scale || 2.0)}
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                  >
                    +
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, overflow: 'hidden', maxHeight: 'none' }}>
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
            <Box sx={{ pt: 2, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
              {/* Android TV Remote Interface */}
              <Box sx={{ 
                position: 'relative',
                transform: `scale(${remoteScale})`,
                transformOrigin: 'center top',
                display: 'inline-block',
                overflow: 'visible'
              }}>
                {/* Actual remote image */}
                <img 
                  src={androidTVConfig?.remote_info.image_url || "/android-tv-remote.png"}
                  alt={androidTVConfig?.remote_info.name || "Android TV Remote"}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '6px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                  }}
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.style.width = '140px';
                    e.currentTarget.style.height = '360px';
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                />
                
                {/* Button overlays positioned absolutely over the image */}
                {Object.entries(androidTVConfig?.button_layout || {}).map(([buttonId, config]) => 
                  renderRemoteButton(buttonId, config, handleRemoteCommand, androidTVConfig, 1)
                )}

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

      {/* IR Remote Modal */}
      <Dialog 
        open={irRemoteModalOpen} 
        onClose={handleCloseIrModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
            {/* Left side: Title and status */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" component="span">
                IR Remote Control
              </Typography>
              {irRemoteSession.connected && (
                <Chip 
                  label="Connected" 
                  color="success" 
                  size="small"
                />
              )}
            </Box>
            
            {/* Right side: Controls */}
            {irRemoteSession.connected && (
              <Box display="flex" alignItems="center" gap={1}>
                {/* Show Overlays button */}
                <Button
                  variant={debugMode ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setDebugMode(!debugMode)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  {debugMode ? 'Hide Overlays' : 'Show Overlays'}
                </Button>
                
                {/* Scale controls */}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    Scale:
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRemoteScale(prev => Math.max(irRemoteConfig?.remote_info.min_scale || 0.5, prev - 0.1))}
                    disabled={remoteScale <= (irRemoteConfig?.remote_info.min_scale || 0.5)}
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                  >
                    -
                  </Button>
                  <Typography variant="caption" sx={{ minWidth: 35, textAlign: 'center', fontSize: '0.75rem' }}>
                    {Math.round(remoteScale * 100)}%
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRemoteScale(prev => Math.min(irRemoteConfig?.remote_info.max_scale || 2.0, prev + 0.1))}
                    disabled={remoteScale >= (irRemoteConfig?.remote_info.max_scale || 2.0)}
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                  >
                    +
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, overflow: 'hidden', maxHeight: 'none' }}>
          {!irRemoteSession.connected ? (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure IR transmitter settings to control your TV or set-top box.
              </Typography>
              
              {irConnectionError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {irConnectionError}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="IR Device Path"
                    value={irConnectionForm.device_path}
                    onChange={(e) => setIrConnectionForm(prev => ({ ...prev, device_path: e.target.value }))}
                    placeholder="/dev/lirc0"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Protocol</InputLabel>
                    <Select
                      value={irConnectionForm.protocol}
                      onChange={(e) => setIrConnectionForm(prev => ({ ...prev, protocol: e.target.value }))}
                    >
                      <MenuItem value="NEC">NEC</MenuItem>
                      <MenuItem value="RC5">RC5</MenuItem>
                      <MenuItem value="RC6">RC6</MenuItem>
                      <MenuItem value="SONY">SONY</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Frequency (Hz)"
                    value={irConnectionForm.frequency}
                    onChange={(e) => setIrConnectionForm(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="38000"
                  />
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ pt: 2, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
              {/* IR Remote Interface */}
              <Box sx={{ 
                position: 'relative',
                transform: `scale(${remoteScale})`,
                transformOrigin: 'center top',
                display: 'inline-block',
                overflow: 'visible'
              }}>
                {/* Actual remote image */}
                <img 
                  src={irRemoteConfig?.remote_info.image_url || "/suncherry_remote.png"}
                  alt={irRemoteConfig?.remote_info.name || "Sunrise Remote"}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '6px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                  }}
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.style.width = '120px';
                    e.currentTarget.style.height = '360px';
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                />
                
                {/* Button overlays positioned absolutely over the image */}
                {Object.entries(irRemoteConfig?.button_layout || {}).map(([buttonId, config]) => 
                  renderRemoteButton(buttonId, config, handleIrCommand, irRemoteConfig, 1)
                )}

              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIrModal}>
            Close
          </Button>
          {!irRemoteSession.connected ? (
            <Button 
              variant="contained" 
              onClick={handleIrConnect}
              disabled={irConnectionLoading || !irConnectionForm.device_path}
            >
              {irConnectionLoading ? <CircularProgress size={20} /> : 'Connect'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="error"
              onClick={handleIrDisconnect}
              disabled={irConnectionLoading}
            >
              {irConnectionLoading ? <CircularProgress size={20} /> : 'Disconnect'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bluetooth Remote Modal */}
      <Dialog 
        open={bluetoothModalOpen} 
        onClose={handleCloseBluetoothModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ minHeight: 40 }}>
            {/* Left side: Title and status */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" component="span">
                Bluetooth Remote Control
              </Typography>
              {bluetoothSession.connected && (
                <Chip 
                  label="Connected" 
                  color="success" 
                  size="small"
                />
              )}
            </Box>
            
            {/* Right side: Controls */}
            {bluetoothSession.connected && (
              <Box display="flex" alignItems="center" gap={1}>
                {/* Show Overlays button */}
                <Button
                  variant={debugMode ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setDebugMode(!debugMode)}
                  sx={{ minWidth: 'auto', px: 1 }}
                >
                  {debugMode ? 'Hide Overlays' : 'Show Overlays'}
                </Button>
                
                {/* Scale controls */}
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    Scale:
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRemoteScale(prev => Math.max(bluetoothConfig?.remote_info.min_scale || 0.5, prev - 0.1))}
                    disabled={remoteScale <= (bluetoothConfig?.remote_info.min_scale || 0.5)}
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                  >
                    -
                  </Button>
                  <Typography variant="caption" sx={{ minWidth: 35, textAlign: 'center', fontSize: '0.75rem' }}>
                    {Math.round(remoteScale * 100)}%
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setRemoteScale(prev => Math.min(bluetoothConfig?.remote_info.max_scale || 2.0, prev + 0.1))}
                    disabled={remoteScale >= (bluetoothConfig?.remote_info.max_scale || 2.0)}
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                  >
                    +
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 2, overflow: 'hidden', maxHeight: 'none' }}>
          {!bluetoothSession.connected ? (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Pair with a Bluetooth device to control it remotely using HID protocol.
              </Typography>
              
              {bluetoothConnectionError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {bluetoothConnectionError}
                </Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Device Address (MAC)"
                    value={bluetoothConnectionForm.device_address}
                    onChange={(e) => setBluetoothConnectionForm(prev => ({ ...prev, device_address: e.target.value }))}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Device Name"
                    value={bluetoothConnectionForm.device_name}
                    onChange={(e) => setBluetoothConnectionForm(prev => ({ ...prev, device_name: e.target.value }))}
                    placeholder="Smart TV"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Pairing PIN"
                    value={bluetoothConnectionForm.pairing_pin}
                    onChange={(e) => setBluetoothConnectionForm(prev => ({ ...prev, pairing_pin: e.target.value }))}
                    placeholder="0000"
                  />
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ pt: 2, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
              {/* Bluetooth Remote Interface */}
              <Box sx={{ 
                position: 'relative',
                transform: `scale(${remoteScale})`,
                transformOrigin: 'center top',
                display: 'inline-block',
                overflow: 'visible'
              }}>
                {/* Actual remote image */}
                <img 
                  src={bluetoothConfig?.remote_info.image_url || "/suncherry_remote.png"}
                  alt={bluetoothConfig?.remote_info.name || "Sunrise Remote"}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '6px',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                  }}
                  onError={(e) => {
                    // Fallback if image doesn't load
                    e.currentTarget.style.width = '120px';
                    e.currentTarget.style.height = '360px';
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                />
                
                {/* Button overlays positioned absolutely over the image */}
                {Object.entries(bluetoothConfig?.button_layout || {}).map(([buttonId, config]) => 
                  renderRemoteButton(buttonId, config, handleBluetoothCommand, bluetoothConfig, 1)
                )}

              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBluetoothModal}>
            Close
          </Button>
          {!bluetoothSession.connected ? (
            <Button 
              variant="contained" 
              onClick={handleBluetoothConnect}
              disabled={bluetoothConnectionLoading || !bluetoothConnectionForm.device_address}
            >
              {bluetoothConnectionLoading ? <CircularProgress size={20} /> : 'Pair & Connect'}
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="error"
              onClick={handleBluetoothDisconnect}
              disabled={bluetoothConnectionLoading}
            >
              {bluetoothConnectionLoading ? <CircularProgress size={20} /> : 'Disconnect'}
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
