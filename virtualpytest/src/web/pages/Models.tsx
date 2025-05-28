import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Memory as ModelIcon,
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
} from '@mui/material';
import React, { useState } from 'react';

interface Model {
  id: string;
  name: string;
  type: string;
  version: string;
  description: string;
}

const modelTypes = [
  'Android Phone',
  'Fire TV',
  'Apple TV',
  'STB EOS',
  'Linux',
  'Windows',
  'STB',
  'Smart TV',
  'Roku',
  'Chromecast',
  'Gaming Console',
  'Tablet',
];

const defaultModels: Model[] = [];

const Models: React.FC = () => {
  const [models, setModels] = useState<Model[]>(defaultModels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    type: '', 
    version: '', 
    description: '' 
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [newModel, setNewModel] = useState({ 
    name: '', 
    type: '', 
    version: '', 
    description: '' 
  });
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (model: Model) => {
    setEditingId(model.id);
    setEditForm({
      name: model.name,
      type: model.type,
      version: model.version,
      description: model.description,
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim() || !editForm.type.trim()) {
      setError('Name and Type are required');
      return;
    }

    // Check for duplicate names (excluding current item)
    const isDuplicate = models.some(
      (m) => m.id !== editingId && m.name.toLowerCase() === editForm.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A model with this name already exists');
      return;
    }

    setModels(models.map(m => 
      m.id === editingId 
        ? { 
            ...m, 
            name: editForm.name.trim(), 
            type: editForm.type.trim(),
            version: editForm.version.trim(), 
            description: editForm.description.trim() 
          }
        : m
    ));
    setEditingId(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', type: '', version: '', description: '' });
    setError(null);
  };

  const handleDelete = (id: string) => {
    setModels(models.filter(m => m.id !== id));
  };

  const handleAddNew = () => {
    if (!newModel.name.trim() || !newModel.type.trim()) {
      setError('Name and Type are required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = models.some(
      (m) => m.name.toLowerCase() === newModel.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A model with this name already exists');
      return;
    }

    const newId = (Math.max(...models.map(m => parseInt(m.id)), 0) + 1).toString();
    setModels([...models, {
      id: newId,
      name: newModel.name.trim(),
      type: newModel.type.trim(),
      version: newModel.version.trim(),
      description: newModel.description.trim(),
    }]);
    setNewModel({ name: '', type: '', version: '', description: '' });
    setOpenDialog(false);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewModel({ name: '', type: '', version: '', description: '' });
    setError(null);
  };

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
      <ModelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Models Created
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Create your first device model to define hardware specifications and capabilities for your test automation.
      </Typography>
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
          {models.length === 0 ? (
            <EmptyState />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Version</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
                      <TableCell>
                        {editingId === model.id ? (
                          <TextField
                            size="small"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          model.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              value={editForm.type}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                              sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                            >
                              {modelTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                  {type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Chip label={model.type} size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <TextField
                            size="small"
                            value={editForm.version}
                            onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                            fullWidth
                            variant="outlined"
                            placeholder="e.g., 12.0"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          model.version || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <TextField
                            size="small"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          model.description || 'N/A'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === model.id ? (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleSaveEdit}
                              sx={{ p: 0.5 }}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={handleCancelEdit}
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
                              onClick={() => handleEdit(model)}
                              sx={{ p: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(model.id)}
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

      {/* Add New Model Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Add New Device Model</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              variant="outlined"
              value={newModel.name}
              onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
              placeholder="e.g., Samsung Galaxy S21"
            />
            
            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel size="small">Type</InputLabel>
              <Select
                size="small"
                value={newModel.type}
                onChange={(e) => setNewModel({ ...newModel, type: e.target.value })}
                label="Type"
              >
                {modelTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Version"
              fullWidth
              variant="outlined"
              value={newModel.version}
              onChange={(e) => setNewModel({ ...newModel, version: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
              placeholder="e.g., 12.0, Android 11"
            />
            
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              variant="outlined"
              value={newModel.description}
              onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
              size="small"
              placeholder="Additional specifications or notes"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 1, pb: 2 }}>
          <Button onClick={handleCloseDialog} size="small">Cancel</Button>
          <Button onClick={handleAddNew} variant="contained" size="small">
            Add Model
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Models; 