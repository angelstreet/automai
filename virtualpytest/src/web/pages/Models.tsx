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
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
} from '@mui/material';
import React, { useState } from 'react';
import { CreateModelDialog } from '../components/model';

interface Model {
  id: string;
  name: string;
  types: string[];
  controllers: string[];
  version: string;
  description: string;
}

const modelTypes = [
  'Android Phone',
  'Android TV',
  'Android Tablet',
  'iOs Phone',
  'iOs Tablet',
  'Fire TV',
  'Nvidia Shield',
  'Apple TV',
  'STB',
  'Linux',
  'Windows',
  'Tizen TV',
  'LG TV',
];

const controllerTypes = [
  'Audio Video Controller',
  'Power Controller',
  'Remote Controller',
  'Network Controller',
];

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const defaultModels: Model[] = [];

const Models: React.FC = () => {
  const [models, setModels] = useState<Model[]>(defaultModels);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    types: [] as string[], 
    controllers: [] as string[],
    version: '', 
    description: '' 
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (model: Model) => {
    setEditingId(model.id);
    setEditForm({
      name: model.name,
      types: model.types,
      controllers: model.controllers,
      version: model.version,
      description: model.description,
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim() || editForm.types.length === 0) {
      setError('Name and at least one Type are required');
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
            types: editForm.types,
            controllers: editForm.controllers,
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
    setEditForm({ name: '', types: [], controllers: [], version: '', description: '' });
    setError(null);
  };

  const handleDelete = (id: string) => {
    setModels(models.filter(m => m.id !== id));
  };

  const handleAddNew = (newModelData: Omit<Model, 'id'>) => {
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

    const newId = (Math.max(...models.map(m => parseInt(m.id)), 0) + 1).toString();
    setModels([...models, {
      id: newId,
      name: newModelData.name.trim(),
      types: newModelData.types,
      controllers: newModelData.controllers,
      version: newModelData.version.trim(),
      description: newModelData.description.trim(),
    }]);
    setOpenDialog(false);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
  };

  const handleTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setEditForm({
      ...editForm,
      types: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleControllerChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setEditForm({
      ...editForm,
      controllers: typeof value === 'string' ? value.split(',') : value,
    });
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
                    <TableCell><strong>Types</strong></TableCell>
                    <TableCell><strong>Controllers</strong></TableCell>
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
                              multiple
                              value={editForm.types}
                              onChange={handleTypeChange}
                              input={<OutlinedInput />}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                  ))}
                                </Box>
                              )}
                              MenuProps={MenuProps}
                              sx={{ '& .MuiInputBase-root': { minHeight: '32px' } }}
                            >
                              {modelTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                  <Checkbox checked={editForm.types.indexOf(type) > -1} />
                                  <ListItemText primary={type} />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {model.types.map((type) => (
                              <Chip key={type} label={type} size="small" variant="outlined" />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              multiple
                              value={editForm.controllers}
                              onChange={handleControllerChange}
                              input={<OutlinedInput />}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" color="primary" variant="outlined" />
                                  ))}
                                </Box>
                              )}
                              MenuProps={MenuProps}
                              sx={{ '& .MuiInputBase-root': { minHeight: '32px' } }}
                            >
                              {controllerTypes.map((controller) => (
                                <MenuItem key={controller} value={controller}>
                                  <Checkbox checked={editForm.controllers.indexOf(controller) > -1} />
                                  <ListItemText primary={controller} />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {model.controllers.length > 0 ? (
                              model.controllers.map((controller) => (
                                <Chip key={controller} label={controller} size="small" color="primary" variant="outlined" />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">N/A</Typography>
                            )}
                          </Box>
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

      {/* Create Model Dialog */}
      <CreateModelDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleAddNew}
        error={error}
      />
    </Box>
  );
};

export default Models; 