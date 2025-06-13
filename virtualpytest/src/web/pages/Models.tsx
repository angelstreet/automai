import { Add as AddIcon, Delete as DeleteIcon, Devices as DeviceIcon } from '@mui/icons-material';
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
import React, { useState, useEffect, useCallback } from 'react';

import CreateModelDialog from '../components/models/Models_CreateDialog';
import { useRegistration } from '../contexts/RegistrationContext';

// Simple model interface matching database
interface Model {
  id: string;
  name: string;
  types: string[];
  version: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

// Create payload type
export interface ModelCreatePayload {
  name: string;
  types: string[];
  version: string;
  description: string;
}

const Models: React.FC = () => {
  const { buildServerUrl } = useRegistration();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(buildServerUrl('/server/devicemodel/getAllModels'));
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const modelsData = await response.json();
      setModels(modelsData || []);
      console.log('[@component:Models] Loaded models:', modelsData?.length || 0);
    } catch (err) {
      console.error('[@component:Models] Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  }, [buildServerUrl]);

  // Load models on component mount
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(buildServerUrl(`/server/devicemodel/deleteDeviceModel/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete model: ${response.status}`);
      }

      // Update local state
      setModels(models.filter((m) => m.id !== id));
      setSuccessMessage('Model deleted successfully');
      console.log('[@component:Models] Deleted model');
    } catch (err) {
      console.error('[@component:Models] Error deleting model:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const handleAddNew = async (newModelData: ModelCreatePayload) => {
    try {
      setSubmitting(true);
      setError(null);

      console.log('[@component:Models] Creating model:', newModelData);

      const response = await fetch(buildServerUrl('/server/devicemodel/createDeviceModel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newModelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create model: ${response.status}`);
      }

      const result = await response.json();
      const createdModel: Model = result.model;

      // Update local state
      setModels([...models, createdModel]);
      setOpenDialog(false);
      setSuccessMessage('Model created successfully');
      console.log('[@component:Models] Created model:', createdModel.name);
    } catch (err) {
      console.error('[@component:Models] Error creating model:', err);
      setError(err instanceof Error ? err.message : 'Failed to create model');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
  };

  // Loading state
  const LoadingState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        Loading Models...
      </Typography>
    </Box>
  );

  // Empty state
  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <DeviceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Models Found
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Create your first device model to get started.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenDialog(true)}
        disabled={submitting}
      >
        Add Model
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
            Manage device models and their specifications.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
          disabled={submitting || loading}
        >
          Add Model
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
                        : 'rgba(0, 0, 0, 0.04) !important',
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Name</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Types</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Version</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Description</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
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

      {/* Summary */}
      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          Showing {models.length} models
        </Typography>
      </Box>

      {/* Create Model Dialog */}
      <CreateModelDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleAddNew}
        error={error}
      />

      {/* Success Message */}
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
