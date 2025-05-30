import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { userInterfaceApi, UserInterface as UserInterfaceType, UserInterfaceCreatePayload } from '../src/services/userInterfaceApi';
import { deviceApi, Device } from '../src/services/deviceService';


const UserInterface: React.FC = () => {
  const [userInterfaces, setUserInterfaces] = useState<UserInterfaceType[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    models: [] as string[],
    min_version: '', 
    max_version: '' 
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [newInterface, setNewInterface] = useState({ 
    name: '', 
    models: [] as string[],
    min_version: '', 
    max_version: '' 
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Extract unique models from devices
  const availableModels = Array.from(new Set(
    devices
      .map(device => device.model)
      .filter(model => model && model.trim() !== '')
  )).sort();

  // Load data on component mount
  useEffect(() => {
    loadUserInterfaces();
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setDevicesLoading(true);
      const fetchedDevices = await deviceApi.getAllDevices();
      setDevices(fetchedDevices);
      console.log(`[@component:UserInterface] Successfully loaded ${fetchedDevices.length} devices`);
    } catch (err) {
      console.error('[@component:UserInterface] Error loading devices:', err);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  const loadUserInterfaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const interfaces = await userInterfaceApi.getAllUserInterfaces();
      setUserInterfaces(interfaces);
    } catch (err) {
      console.error('[@component:UserInterface] Error loading user interfaces:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user interfaces');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userInterface: UserInterfaceType) => {
    setEditingId(userInterface.id);
    setEditForm({
      name: userInterface.name,
      models: userInterface.models,
      min_version: userInterface.min_version,
      max_version: userInterface.max_version,
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      setError('Name is required');
      return;
    }

    if (editForm.models.length === 0) {
      setError('At least one model must be selected');
      return;
    }

    if (devicesLoading) {
      setError('Please wait for models to load');
      return;
    }

    // Check for duplicate names (excluding current item)
    const isDuplicate = userInterfaces.some(
      (ui) => ui.id !== editingId && ui.name.toLowerCase() === editForm.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A user interface with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: UserInterfaceCreatePayload = {
        name: editForm.name.trim(),
        models: editForm.models,
        min_version: editForm.min_version.trim(),
        max_version: editForm.max_version.trim(),
      };

      const updatedInterface = await userInterfaceApi.updateUserInterface(editingId!, payload);
      
      // Update local state
      setUserInterfaces(userInterfaces.map(ui => 
        ui.id === editingId ? updatedInterface : ui
      ));
      
      setEditingId(null);
      console.log('[@component:UserInterface] Successfully updated user interface:', updatedInterface.name);
    } catch (err) {
      console.error('[@component:UserInterface] Error updating user interface:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user interface');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', models: [], min_version: '', max_version: '' });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user interface?')) {
      return;
    }

    try {
      setError(null);
      await userInterfaceApi.deleteUserInterface(id);
      
      // Update local state
      setUserInterfaces(userInterfaces.filter(ui => ui.id !== id));
      console.log('[@component:UserInterface] Successfully deleted user interface');
    } catch (err) {
      console.error('[@component:UserInterface] Error deleting user interface:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user interface');
    }
  };

  const handleAddNew = async () => {
    if (!newInterface.name.trim()) {
      setError('Name is required');
      return;
    }

    if (newInterface.models.length === 0) {
      setError('At least one model must be selected');
      return;
    }

    if (devicesLoading) {
      setError('Please wait for models to load');
      return;
    }

    // Check for duplicate names
    const isDuplicate = userInterfaces.some(
      (ui) => ui.name.toLowerCase() === newInterface.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A user interface with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: UserInterfaceCreatePayload = {
        name: newInterface.name.trim(),
        models: newInterface.models,
        min_version: newInterface.min_version.trim(),
        max_version: newInterface.max_version.trim(),
      };

      const createdInterface = await userInterfaceApi.createUserInterface(payload);
      
      // Update local state
      setUserInterfaces([...userInterfaces, createdInterface]);
      setNewInterface({ name: '', models: [], min_version: '', max_version: '' });
      setOpenDialog(false);
      console.log('[@component:UserInterface] Successfully created user interface:', createdInterface.name);
    } catch (err) {
      console.error('[@component:UserInterface] Error creating user interface:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user interface');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewInterface({ name: '', models: [], min_version: '', max_version: '' });
    setError(null);
  };

  const handleModelChange = (event: SelectChangeEvent<string[]>, isEdit = false) => {
    const value = event.target.value;
    // Handle the case where value is a string (shouldn't happen with multiple select, but for safety)
    const selectedModels = typeof value === 'string' ? [value] : value;
    
    if (isEdit) {
      setEditForm({ ...editForm, models: selectedModels });
    } else {
      setNewInterface({ ...newInterface, models: selectedModels });
    }
  };

  const handleRemoveModel = (modelToRemove: string, isEdit = false) => {
    if (isEdit) {
      setEditForm({ 
        ...editForm, 
        models: editForm.models.filter(model => model !== modelToRemove) 
      });
    } else {
      setNewInterface({ 
        ...newInterface, 
        models: newInterface.models.filter(model => model !== modelToRemove) 
      });
    }
  };

  // Loading state component
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
        Loading User Interfaces...
      </Typography>
    </Box>
  );

  // Empty state component
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
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No User Interface Created
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Create your first user interface to define navigation structures and device compatibility for your test automation.
      </Typography>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Interface
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage navigation and device compatibility for your test automation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
          disabled={loading || devicesLoading}
        >
          Add UI
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ boxShadow: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          {loading ? (
            <LoadingState />
          ) : userInterfaces.length === 0 ? (
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
                    <TableCell><strong>Models</strong></TableCell>
                    <TableCell align="center"><strong>Min Version</strong></TableCell>
                    <TableCell align="center"><strong>Max Version</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userInterfaces.map((userInterface) => (
                    <TableRow key={userInterface.id}>
                      <TableCell>
                        {editingId === userInterface.id ? (
                          <TextField
                            size="small"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          userInterface.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === userInterface.id ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              multiple
                              value={editForm.models}
                              onChange={(e) => handleModelChange(e, true)}
                              input={<OutlinedInput />}
                              disabled={devicesLoading}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, p: 0.25 }}>
                                  {selected.map((value) => (
                                    <Chip 
                                      key={value} 
                                      label={value} 
                                      size="small"
                                      onDelete={() => handleRemoveModel(value, true)}
                                      sx={{ 
                                        m: 0,
                                        height: 20,
                                        '& .MuiChip-label': { px: 0.5, fontSize: '0.75rem' },
                                        '& .MuiChip-deleteIcon': { width: 14, height: 14 }
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}
                              sx={{ '& .MuiInputBase-root': { minHeight: '32px' } }}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    maxHeight: 200,
                                    width: 250,
                                  },
                                },
                              }}
                            >
                              {devicesLoading ? (
                                <MenuItem disabled>
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                  Loading models...
                                </MenuItem>
                              ) : availableModels.length === 0 ? (
                                <MenuItem disabled>
                                  No models available
                                </MenuItem>
                              ) : (
                                availableModels.map((model) => (
                                  <MenuItem 
                                    key={model} 
                                    value={model}
                                    dense
                                    sx={{
                                      py: 0.5,
                                      px: 1,
                                      minHeight: 'auto',
                                      backgroundColor: editForm.models.includes(model) ? 'action.selected' : 'inherit',
                                      '&:hover': {
                                        backgroundColor: editForm.models.includes(model) ? 'action.selected' : 'action.hover',
                                      },
                                    }}
                                  >
                                    {model}
                                  </MenuItem>
                                ))
                              )}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {userInterface.models.map((model) => (
                              <Chip 
                                key={model} 
                                label={model} 
                                size="small" 
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === userInterface.id ? (
                          <TextField
                            size="small"
                            value={editForm.min_version}
                            onChange={(e) => setEditForm({ ...editForm, min_version: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          userInterface.min_version
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === userInterface.id ? (
                          <TextField
                            size="small"
                            value={editForm.max_version}
                            onChange={(e) => setEditForm({ ...editForm, max_version: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          userInterface.max_version
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === userInterface.id ? (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleSaveEdit}
                              disabled={submitting}
                              sx={{ p: 0.5 }}
                            >
                              {submitting ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={handleCancelEdit}
                              disabled={submitting}
                              sx={{ p: 0.5 }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEdit(userInterface)}
                              sx={{ p: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(userInterface.id)}
                              sx={{ p: 0.5 }}
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

      {/* Add New User Interface Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Add New User Interface</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              variant="outlined"
              value={newInterface.name}
              onChange={(e) => setNewInterface({ ...newInterface, name: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
              placeholder="e.g., Main Navigation Tree"
            />
            
            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel size="small">Models</InputLabel>
              <Select
                multiple
                size="small"
                value={newInterface.models}
                onChange={(e) => handleModelChange(e)}
                input={<OutlinedInput label="Models" />}
                disabled={devicesLoading}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, p: 0.25 }}>
                    {selected.map((value) => (
                      <Chip 
                        key={value} 
                        label={value} 
                        size="small"
                        onDelete={() => handleRemoveModel(value, false)}
                        sx={{ 
                          m: 0,
                          height: 20,
                          '& .MuiChip-label': { px: 0.5, fontSize: '0.75rem' },
                          '& .MuiChip-deleteIcon': { width: 14, height: 14 }
                        }}
                      />
                    ))}
                  </Box>
                )}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxHeight: 200,
                      width: 250,
                    },
                  },
                }}
              >
                {devicesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    Loading models...
                  </MenuItem>
                ) : availableModels.length === 0 ? (
                  <MenuItem disabled>
                    No models available
                  </MenuItem>
                ) : (
                  availableModels.map((model) => (
                    <MenuItem 
                      key={model} 
                      value={model}
                      dense
                      sx={{
                        py: 0.5,
                        px: 1,
                        minHeight: 'auto',
                        backgroundColor: newInterface.models.includes(model) ? 'action.selected' : 'inherit',
                        '&:hover': {
                          backgroundColor: newInterface.models.includes(model) ? 'action.selected' : 'action.hover',
                        },
                      }}
                    >
                      {model}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Min Version"
              fullWidth
              variant="outlined"
              value={newInterface.min_version}
              onChange={(e) => setNewInterface({ ...newInterface, min_version: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
              placeholder="e.g., 1.0.0"
            />
            
            <TextField
              margin="dense"
              label="Max Version"
              fullWidth
              variant="outlined"
              value={newInterface.max_version}
              onChange={(e) => setNewInterface({ ...newInterface, max_version: e.target.value })}
              size="small"
              placeholder="e.g., 2.0.0"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 1, pb: 2, px: 3, gap: 1 }}>
          <Button onClick={handleCloseDialog} size="small" variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddNew} 
            variant="contained" 
            size="small"
            disabled={!newInterface.name.trim() || newInterface.models.length === 0 || submitting || devicesLoading}
          >
            {submitting ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserInterface; 