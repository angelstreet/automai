import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Devices as DeviceIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import CreateModelDialog from '../components/models/Models_CreateDialog';
import { DeviceModel } from '../types';

const Models: React.FC = () => {
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load device models on component mount only
  useEffect(() => {
    loadDeviceModels();
  }, []);

  const loadDeviceModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/server/devicemodel/getAllModels');
      if (!response.ok) {
        throw new Error(`Failed to fetch device models: ${response.status} ${response.statusText}`);
      }
      
      const modelsData = await response.json();
      setModels(modelsData || []);
      console.log('[@component:Models] Successfully loaded device models:', modelsData?.length || 0);
    } catch (err) {
      console.error('[@component:Models] Error loading device models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load device models');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this device model?')) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/server/devicemodel/deleteDeviceModel/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete device model: ${response.status}`);
      }

      // Update local state
      setModels(models.filter(m => m.id !== id));
      setSuccessMessage('Device model deleted successfully');
      console.log('[@component:Models] Successfully deleted device model');
    } catch (err) {
      console.error('[@component:Models] Error deleting device model:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete device model');
    }
  };

  const handleAddNew = async (newModelData: Omit<DeviceModel, 'id'>) => {
    if (!newModelData.name.trim() || newModelData.types.length === 0) {
      setError('Name and at least one Type are required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = models.some(
      (m) => m.name.toLowerCase() === newModelData.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A model with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/server/devicemodel/createDeviceModel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newModelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create device model: ${response.status}`);
      }

      const result = await response.json();
      const createdModel: DeviceModel = result.model;

      // Update local state
      setModels([...models, createdModel]);
      setOpenDialog(false);
      setSuccessMessage('Device model created successfully');
      console.log('[@component:Models] Successfully created device model:', createdModel.name);
    } catch (err) {
      console.error('[@component:Models] Error creating device model:', err);
      setError(err instanceof Error ? err.message : 'Failed to create device model');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
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
        Loading Device Models...
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
      <DeviceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Models Created
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Create your first device model to define hardware specifications and capabilities for your test automation.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenDialog(true)}
        disabled={submitting}
      >
        Create Your First Model
      </Button>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Device Models
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage device models and their specifications for test automation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
          disabled={submitting || loading}
        >
          {submitting ? 'Creating...' : 'Add Model'}
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
          ) : models.length === 0 ? (
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
                    <TableCell><strong>Types</strong></TableCell>
                    <TableCell><strong>Version</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>{model.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {model.types.map((type) => (
                            <Chip key={type} label={type} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>{model.version || 'N/A'}</TableCell>
                      <TableCell>{model.description || 'N/A'}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(model.id)}
                          sx={{ p: 0.5 }}
                          disabled={submitting}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Model Dialog */}
      <CreateModelDialog
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
    </Box>
  );
};

export default Models; 