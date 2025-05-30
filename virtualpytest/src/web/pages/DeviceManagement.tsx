import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  DevicesOther as DeviceIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
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
import EditDeviceDialog from '../src/components/EditDeviceDialog';
import { deviceApi, Device, DeviceCreatePayload } from '../src/services/deviceService';
import { useTheme } from '@mui/material/styles';

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedDeviceForEdit, setSelectedDeviceForEdit] = useState<Device | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    model: '' 
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const theme = useTheme();

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
      setOpenCreateDialog(false);
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
      setOpenEditDialog(false);
      setSelectedDeviceForEdit(null);
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

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
    setError(null);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedDeviceForEdit(null);
    setError(null);
  };

  // Open edit dialog for a device
  const handleOpenEditDialog = async (device: Device) => {
    try {
      console.log('[@component:DeviceManagement] Loading device for editing:', device.id);

      // Load the device's current configuration
      const deviceWithConfig = await deviceApi.getDevice(device.id);
      
      console.log('[@component:DeviceManagement] Loaded device config:', deviceWithConfig);

      setSelectedDeviceForEdit(deviceWithConfig);
      setOpenEditDialog(true);
      setError(null);
    } catch (err) {
      console.error('[@component:DeviceManagement] Error loading device for editing:', err);
      setError('Failed to load device configuration');
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

  // Helper function to get controller count and summary
  const getControllerSummary = (device: Device) => {
    if (!device.controller_configs) {
      return { count: 0, summary: 'No controllers configured', types: [] };
    }

    const configuredControllers = Object.keys(device.controller_configs).filter(
      key => device.controller_configs[key] && 
             typeof device.controller_configs[key] === 'object' && 
             device.controller_configs[key].implementation
    );

    const count = configuredControllers.length;
    
    if (count === 0) {
      return { count: 0, summary: 'No controllers configured', types: [] };
    }

    // Create a summary of configured controller types
    const summary = configuredControllers.map(type => 
      type.charAt(0).toUpperCase() + type.slice(1)
    ).join(', ');

    // Map controller types to display names
    const typeDisplayNames = configuredControllers.map(type => {
      switch (type.toLowerCase()) {
        case 'remote': return 'Remote';
        case 'av': return 'AV';
        case 'verification': return 'Verify';
        case 'power': return 'Power';
        case 'network': return 'Network';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
      }
    });

    return { count, summary, types: typeDisplayNames };
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
          onClick={() => setOpenCreateDialog(true)}
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
          onClick={() => setOpenCreateDialog(true)}
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
              <Table 
                size="small" 
                sx={{ 
                  '& .MuiTableCell-root': { py: 0.5, px: 1 },
                  '& .MuiTableRow-root:hover': {
                    backgroundColor: (theme) => 
                      theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.08) !important' 
                        : 'rgba(0, 0, 0, 0.04) !important'
                  }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Model</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="center"><strong>Controllers</strong></TableCell>
                    <TableCell align="center"><strong>Edit Controllers</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDevices.map((device) => {
                    const controllerSummary = getControllerSummary(device);
                    
                    return (
                      <TableRow key={device.id}>
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
                        <TableCell>
                          {editingId === device.id ? (
                            <TextField
                              size="small"
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              fullWidth
                              variant="outlined"
                              sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                            />
                          ) : (
                            device.description || 'N/A'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {controllerSummary.types.length > 0 ? (
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {controllerSummary.types.map((type, index) => (
                                <Chip 
                                  key={index}
                                  label={type}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          ) : (
                            <Chip 
                              label="None"
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditDialog(device)}
                            sx={{ p: 0.5 }}
                            disabled={submitting}
                            title="Edit Controllers Configuration"
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
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
                    );
                  })}
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
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        onSubmit={handleAddNew}
        error={error}
      />

      {/* Edit Device Dialog */}
      {selectedDeviceForEdit && (
        <EditDeviceDialog
          open={openEditDialog}
          device={selectedDeviceForEdit}
          onClose={handleCloseEditDialog}
          onSubmit={handleUpdate}
          error={error}
        />
      )}

      {/* Success Message Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
};

export default DeviceManagement;
