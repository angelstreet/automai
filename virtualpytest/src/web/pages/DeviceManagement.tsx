import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Add as AddIcon,
  Devices as DeviceIcon,
  Settings as ControllerIcon,
  Public as ProfileIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Circle as StatusIcon,
} from '@mui/icons-material';

const API_BASE_URL = 'http://localhost:5009/api';

interface Device {
  id: string;
  name: string;
  type: string;
  model?: string;
  version?: string;
  environment: string;
  connection_config: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Controller {
  id: string;
  name: string;
  type: string;
  config: any;
  device_id?: string;
  created_at: string;
  updated_at: string;
}

interface EnvironmentProfile {
  id: string;
  name: string;
  device_id: string;
  remote_controller_id?: string;
  av_controller_id?: string;
  verification_controller_id?: string;
  created_at: string;
  updated_at: string;
}

const DEVICE_TYPES = [
  'android_phone',
  'firetv',
  'appletv',
  'stb_eos',
  'linux',
  'windows',
  'stb'
];

const ENVIRONMENTS = [
  'prod',
  'preprod',
  'dev',
  'staging'
];

const CONTROLLER_TYPES = [
  'remote_controller',
  'av_controller',
  'verification_controller'
];

const DeviceManagement: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [environmentProfiles, setEnvironmentProfiles] = useState<EnvironmentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [controllerDialogOpen, setControllerDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  
  // Form states
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    type: 'android_phone',
    model: '',
    version: '',
    environment: 'dev',
    status: 'offline'
  });
  
  const [controllerForm, setControllerForm] = useState({
    name: '',
    type: 'remote_controller',
    device_id: ''
  });
  
  const [profileForm, setProfileForm] = useState({
    name: '',
    device_id: '',
    remote_controller_id: '',
    av_controller_id: '',
    verification_controller_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devicesRes, controllersRes, profilesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/devices`),
        fetch(`${API_BASE_URL}/controllers`),
        fetch(`${API_BASE_URL}/environment-profiles`),
      ]);

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        setDevices(devicesData);
      }

      if (controllersRes.ok) {
        const controllersData = await controllersRes.json();
        setControllers(controllersData);
      }

      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        setEnvironmentProfiles(profilesData);
      }
    } catch (err) {
      setError('Failed to fetch device management data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCreateDevice = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceForm),
      });

      if (response.ok) {
        setDeviceDialogOpen(false);
        setDeviceForm({
          name: '',
          type: 'android_phone',
          model: '',
          version: '',
          environment: 'dev',
          status: 'offline'
        });
        fetchData();
      } else {
        setError('Failed to create device');
      }
    } catch (err) {
      setError('Failed to create device');
    }
  };

  const handleCreateController = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/controllers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(controllerForm),
      });

      if (response.ok) {
        setControllerDialogOpen(false);
        setControllerForm({
          name: '',
          type: 'remote_controller',
          device_id: ''
        });
        fetchData();
      } else {
        setError('Failed to create controller');
      }
    } catch (err) {
      setError('Failed to create controller');
    }
  };

  const handleCreateProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/environment-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });

      if (response.ok) {
        setProfileDialogOpen(false);
        setProfileForm({
          name: '',
          device_id: '',
          remote_controller_id: '',
          av_controller_id: '',
          verification_controller_id: ''
        });
        fetchData();
      } else {
        setError('Failed to create environment profile');
      }
    } catch (err) {
      setError('Failed to create environment profile');
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        setError('Failed to delete device');
      }
    } catch (err) {
      setError('Failed to delete device');
    }
  };

  const handleDeleteController = async (controllerId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/controllers/${controllerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        setError('Failed to delete controller');
      }
    } catch (err) {
      setError('Failed to delete controller');
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/environment-profiles/${profileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        setError('Failed to delete environment profile');
      }
    } catch (err) {
      setError('Failed to delete environment profile');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'default';
      case 'busy':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : 'Unknown Device';
  };

  const getControllerName = (controllerId: string) => {
    const controller = controllers.find(c => c.id === controllerId);
    return controller ? controller.name : 'None';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Device Management
      </Typography>
      
      <Typography variant="body1" color="textSecondary" paragraph>
        Manage your test devices, controllers, and environment profiles for comprehensive test automation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Devices
                  </Typography>
                  <Typography variant="h4">
                    {devices.length}
                  </Typography>
                </Box>
                <DeviceIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Controllers
                  </Typography>
                  <Typography variant="h4">
                    {controllers.length}
                  </Typography>
                </Box>
                <ControllerIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Environment Profiles
                  </Typography>
                  <Typography variant="h4">
                    {environmentProfiles.length}
                  </Typography>
                </Box>
                <ProfileIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Devices" />
          <Tab label="Controllers" />
          <Tab label="Environment Profiles" />
        </Tabs>
      </Paper>

      {/* Devices Tab */}
      {currentTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Device Registry</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDeviceDialogOpen(true)}
            >
              Add Device
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Environment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>
                      <Chip label={device.type} size="small" />
                    </TableCell>
                    <TableCell>{device.model || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip label={device.environment} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={device.status} 
                        size="small" 
                        color={getStatusColor(device.status) as any}
                        icon={<StatusIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteDevice(device.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Controllers Tab */}
      {currentTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Controller Configuration</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setControllerDialogOpen(true)}
            >
              Add Controller
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {controllers.map((controller) => (
                  <TableRow key={controller.id}>
                    <TableCell>{controller.name}</TableCell>
                    <TableCell>
                      <Chip label={controller.type} size="small" />
                    </TableCell>
                    <TableCell>
                      {controller.device_id ? getDeviceName(controller.device_id) : 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteController(controller.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Environment Profiles Tab */}
      {currentTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Environment Profiles</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setProfileDialogOpen(true)}
            >
              Add Profile
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Remote Controller</TableCell>
                  <TableCell>AV Controller</TableCell>
                  <TableCell>Verification Controller</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {environmentProfiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>{profile.name}</TableCell>
                    <TableCell>{getDeviceName(profile.device_id)}</TableCell>
                    <TableCell>{getControllerName(profile.remote_controller_id || '')}</TableCell>
                    <TableCell>{getControllerName(profile.av_controller_id || '')}</TableCell>
                    <TableCell>{getControllerName(profile.verification_controller_id || '')}</TableCell>
                    <TableCell>
                      <IconButton size="small" color="primary">
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Device Dialog */}
      <Dialog open={deviceDialogOpen} onClose={() => setDeviceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Device</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Device Name"
              value={deviceForm.name}
              onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Device Type</InputLabel>
              <Select
                value={deviceForm.type}
                onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
              >
                {DEVICE_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Model"
              value={deviceForm.model}
              onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Version"
              value={deviceForm.version}
              onChange={(e) => setDeviceForm({ ...deviceForm, version: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Environment</InputLabel>
              <Select
                value={deviceForm.environment}
                onChange={(e) => setDeviceForm({ ...deviceForm, environment: e.target.value })}
              >
                {ENVIRONMENTS.map((env) => (
                  <MenuItem key={env} value={env}>
                    {env.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeviceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateDevice} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Controller Dialog */}
      <Dialog open={controllerDialogOpen} onClose={() => setControllerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Controller</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Controller Name"
              value={controllerForm.name}
              onChange={(e) => setControllerForm({ ...controllerForm, name: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Controller Type</InputLabel>
              <Select
                value={controllerForm.type}
                onChange={(e) => setControllerForm({ ...controllerForm, type: e.target.value })}
              >
                {CONTROLLER_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Assign to Device (Optional)</InputLabel>
              <Select
                value={controllerForm.device_id}
                onChange={(e) => setControllerForm({ ...controllerForm, device_id: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name} ({device.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setControllerDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateController} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Environment Profile Dialog */}
      <Dialog open={profileDialogOpen} onClose={() => setProfileDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Environment Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Profile Name"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Device</InputLabel>
              <Select
                value={profileForm.device_id}
                onChange={(e) => setProfileForm({ ...profileForm, device_id: e.target.value })}
              >
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.name} ({device.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Remote Controller</InputLabel>
              <Select
                value={profileForm.remote_controller_id}
                onChange={(e) => setProfileForm({ ...profileForm, remote_controller_id: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {controllers.filter(c => c.type === 'remote_controller').map((controller) => (
                  <MenuItem key={controller.id} value={controller.id}>
                    {controller.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>AV Controller</InputLabel>
              <Select
                value={profileForm.av_controller_id}
                onChange={(e) => setProfileForm({ ...profileForm, av_controller_id: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {controllers.filter(c => c.type === 'av_controller').map((controller) => (
                  <MenuItem key={controller.id} value={controller.id}>
                    {controller.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Verification Controller</InputLabel>
              <Select
                value={profileForm.verification_controller_id}
                onChange={(e) => setProfileForm({ ...profileForm, verification_controller_id: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {controllers.filter(c => c.type === 'verification_controller').map((controller) => (
                  <MenuItem key={controller.id} value={controller.id}>
                    {controller.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateProfile} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceManagement; 