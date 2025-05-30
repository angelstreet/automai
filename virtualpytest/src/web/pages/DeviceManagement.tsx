import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  DevicesOther as DeviceIcon,
  Search as SearchIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Alert,
  Chip,
  Grid,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import CreateDeviceDialog from '../src/components/CreateDeviceDialog';
import { deviceApi, Device, DeviceCreatePayload } from '../src/services/deviceService';
import { getDeviceType } from '../src/components/RemoteController';
import { EditControllerParametersDialog, ControllerConfig } from '../src/components/remote/EditControllerParametersDialog';

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    model: '' 
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Controller Parameters state
  const [editControllerOpen, setEditControllerOpen] = useState(false);
  const [selectedDeviceForEdit, setSelectedDeviceForEdit] = useState<Device | null>(null);
  const [currentControllerType, setCurrentControllerType] = useState<'remote' | 'av' | 'power' | 'network'>('remote');

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    const filtered = devices.filter(device =>
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDevices(filtered);
  }, [devices, searchTerm]);

  const fetchDevices = async () => {
    console.log('[@component:DeviceManagement] Fetching devices');
    try {
      setLoading(true);
      setError(null);
      const fetchedDevices = await deviceApi.getAllDevices();
      setDevices(fetchedDevices);
      console.log(`[@component:DeviceManagement] Successfully loaded ${fetchedDevices.length} devices`);
    } catch (error: any) {
      console.error('[@component:DeviceManagement] Error fetching devices:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async (newDeviceData: DeviceCreatePayload) => {
    if (!newDeviceData.name.trim()) {
      setError('Name is required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = devices.some(
      (d) => d.name.toLowerCase() === newDeviceData.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A device with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      console.log('[@component:DeviceManagement] Creating device with full data:', newDeviceData);

      const createdDevice = await deviceApi.createDevice({
        name: newDeviceData.name.trim(),
        description: (newDeviceData.description || '').trim(),
        model: (newDeviceData.model || '').trim(),
        controllerConfigs: newDeviceData.controllerConfigs || {}, // Include controller configurations
      });

      // Update local state
      setDevices([...devices, createdDevice]);
      setOpenDialog(false);
      setSuccessMessage('Device created successfully');
      console.log('[@component:DeviceManagement] Successfully created device:', createdDevice.name);
    } catch (err) {
      console.error('[@component:DeviceManagement] Error creating device:', err);
      setError(err instanceof Error ? err.message : 'Failed to create device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (deviceId: string, deviceData: DeviceCreatePayload) => {
    console.log('[@component:DeviceManagement] Updating device:', deviceId, deviceData);
    try {
      setError(null);
      const updatedDevice = await deviceApi.updateDevice(deviceId, deviceData);
      setDevices(prev => prev.map(device => 
        device.id === deviceId ? updatedDevice : device
      ));
      setEditingId(null);
      setSuccessMessage('Device updated successfully');
      console.log('[@component:DeviceManagement] Successfully updated device:', deviceId);
    } catch (error: any) {
      console.error('[@component:DeviceManagement] Error updating device:', error);
      setError(error instanceof Error ? error.message : 'Failed to update device');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return;
    }

    try {
      setError(null);
      await deviceApi.deleteDevice(id);

      // Update local state
      setDevices(devices.filter(d => d.id !== id));
      setSuccessMessage('Device deleted successfully');
      console.log('[@component:DeviceManagement] Successfully deleted device');
    } catch (err) {
      console.error('[@component:DeviceManagement] Error deleting device:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete device');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
  };

  // Helper function to handle opening edit controller parameters
  const handleOpenEditController = async (device: Device, controllerType: 'remote' | 'av' | 'power' | 'network' = 'remote') => {
    try {
      console.log(`[@component:DeviceManagement] Loading ${controllerType} controller config for device:`, {
        device: device,
        controllerType
      });

      // Load the device's current controller configuration
      const deviceWithConfig = await deviceApi.getDevice(device.id);
      
      console.log(`[@component:DeviceManagement] Loaded device config:`, deviceWithConfig.controller_configs);

      setSelectedDeviceForEdit(deviceWithConfig);
      setCurrentControllerType(controllerType);
      setEditControllerOpen(true);
      setError(null);
    } catch (err) {
      console.error('[@component:DeviceManagement] Error loading device controller config:', err);
      setError('Failed to load device controller configuration');
    }
  };

  // Individual handlers for each controller type
  const handleOpenRemoteController = (device: Device) => {
    handleOpenEditController(device, 'remote');
  };

  const handleOpenAVController = (device: Device) => {
    handleOpenEditController(device, 'av');
  };

  const handleOpenPowerController = (device: Device) => {
    handleOpenEditController(device, 'power');
  };

  const handleOpenNetworkController = (device: Device) => {
    handleOpenEditController(device, 'network');
  };

  // Save controller configuration
  const handleSaveControllerConfig = async (deviceId: string, config: ControllerConfig) => {
    try {
      console.log(`[@component:DeviceManagement] Saving ${currentControllerType} controller config for device ${deviceId}:`, config);
      
      // Update the device's controller configuration in the database
      const deviceToUpdate = devices.find(d => d.id === deviceId);
      if (!deviceToUpdate) {
        throw new Error('Device not found');
      }

      const updatedControllerConfigs = {
        ...deviceToUpdate.controller_configs,
        [currentControllerType]: config
      };

      await deviceApi.updateDevice(deviceId, {
        name: deviceToUpdate.name,
        description: deviceToUpdate.description,
        model: deviceToUpdate.model,
        controllerConfigs: updatedControllerConfigs
      });
      
      // Reload devices to reflect the changes
      await fetchDevices();
      
      console.log(`[@component:DeviceManagement] Successfully saved ${currentControllerType} controller config for device ${deviceId}`);
      
      // Close the dialog
      setEditControllerOpen(false);
      setSelectedDeviceForEdit(null);
      setCurrentControllerType('remote');
      
    } catch (err) {
      console.error('[@component:DeviceManagement] Error saving controller config:', err);
      setError('Failed to save controller configuration');
      throw err;
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    if (!editForm.name.trim()) {
      setError('Name is required');
      return;
    }

    // Check for duplicate names (excluding current item)
    const isDuplicate = devices.some(
      (d) => d.id !== editingId && d.name.toLowerCase() === editForm.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A device with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const updatedDevice = await deviceApi.updateDevice(editingId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        model: editForm.model.trim(),
      });

      // Update local state
      setDevices(devices.map(d => d.id === editingId ? updatedDevice : d));
      setEditingId(null);
      setSuccessMessage('Device updated successfully');
      console.log('[@component:DeviceManagement] Successfully updated device:', updatedDevice.name);
    } catch (err) {
      console.error('[@component:DeviceManagement] Error updating device:', err);
      setError(err instanceof Error ? err.message : 'Failed to update device');
    } finally {
      setSubmitting(false);
    }
  };

  const LoadingState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 8,
        textAlign: 'center'
      }}
    >
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        Loading Devices...
      </Typography>
    </Box>
  );

  const EmptyState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 8,
        textAlign: 'center'
      }}
    >
      <DeviceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {searchTerm ? 'No devices found' : 'No Devices Created'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        {searchTerm ? 'Try adjusting your search criteria' : 'Create your first device to get started with device management and configuration.'}
      </Typography>
      {!searchTerm && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Device
        </Button>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box>
        <LoadingState />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Devices
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your test devices and their configurations
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
          disabled={loading}
        >
          Add Device
        </Button>
      </Box>

      {/* Search */}
      <Box mb={2}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search devices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ maxWidth: 400 }}
          size="small"
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Content */}
      <Card sx={{ boxShadow: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          {filteredDevices.length === 0 ? (
            <EmptyState />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Model</strong></TableCell>
                    <TableCell align="center"><strong>Remote Controller</strong></TableCell>
                    <TableCell align="center"><strong>AV Controller</strong></TableCell>
                    <TableCell align="center"><strong>Power Controller</strong></TableCell>
                    <TableCell align="center"><strong>Network Controller</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                      <TableCell>
                        {editingId === device.id ? (
                          <TextField
                            size="small"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          device.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === device.id ? (
                          <TextField
                            size="small"
                            value={editForm.model}
                            onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          device.model || 'N/A'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {/* Remote Controller Column */}
                        {device.controller_configs?.remote ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LaunchIcon fontSize="small" />}
                            onClick={() => handleOpenRemoteController(device)}
                            disabled={getDeviceType(device) === 'unknown'}
                            sx={{ 
                              minWidth: 'auto',
                              px: 0.5,
                              py: 0.25,
                              fontSize: '0.7rem'
                            }}
                          >
                            Remote
                          </Button>
                        ) : (
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {/* AV Controller Column */}
                        {device.controller_configs?.av ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LaunchIcon fontSize="small" />}
                            onClick={() => handleOpenAVController(device)}
                            disabled={getDeviceType(device) === 'unknown'}
                            sx={{ 
                              minWidth: 'auto',
                              px: 0.5,
                              py: 0.25,
                              fontSize: '0.7rem'
                            }}
                          >
                            AV
                          </Button>
                        ) : (
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {/* Power Controller Column */}
                        {device.controller_configs?.power ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LaunchIcon fontSize="small" />}
                            onClick={() => handleOpenPowerController(device)}
                            disabled={getDeviceType(device) === 'unknown'}
                            sx={{ 
                              minWidth: 'auto',
                              px: 0.5,
                              py: 0.25,
                              fontSize: '0.7rem'
                            }}
                          >
                            Power
                          </Button>
                        ) : (
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {/* Network Controller Column */}
                        {device.controller_configs?.network ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<LaunchIcon fontSize="small" />}
                            onClick={() => handleOpenNetworkController(device)}
                            disabled={getDeviceType(device) === 'unknown'}
                            sx={{ 
                              minWidth: 'auto',
                              px: 0.5,
                              py: 0.25,
                              fontSize: '0.7rem'
                            }}
                          >
                            Network
                          </Button>
                        ) : (
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === device.id ? (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleSaveEdit}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              {submitting ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={() => {
                                setEditingId(null);
                                setEditForm({ name: '', description: '', model: '' });
                                setError(null);
                              }}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setEditForm({
                                  name: device.name,
                                  description: device.description,
                                  model: device.model,
                                });
                                setEditingId(device.id);
                              }}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(device.id)}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
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

      {/* Summary */}
      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredDevices.length} of {devices.length} devices
        </Typography>
      </Box>

      {/* Create Device Dialog */}
      <CreateDeviceDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleAddNew}
        error={error}
      />

      {/* Success Message Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />

      {/* Edit Controller Parameters Modal */}
      {selectedDeviceForEdit && (
        <EditControllerParametersDialog
          device={selectedDeviceForEdit}
          open={editControllerOpen}
          onClose={() => {
            console.log('[@component:DeviceManagement] Closing edit controller parameters');
            setEditControllerOpen(false);
            setSelectedDeviceForEdit(null);
            setCurrentControllerType('remote');
          }}
          onSave={(deviceId, config) => handleSaveControllerConfig(deviceId, config)}
        />
      )}
    </Box>
  );
};

export default DeviceManagement;
