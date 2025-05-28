import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AccountTree as TreeIcon,
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
} from '@mui/material';
import React, { useState } from 'react';

interface UITree {
  id: string;
  name: string;
  models: string[];
  min_version: string;
  max_version: string;
}

const availableModels = [
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
];

const defaultTrees: UITree[] = [];

const UserInterface: React.FC = () => {
  const [trees, setTrees] = useState<UITree[]>(defaultTrees);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    models: [] as string[], 
    min_version: '', 
    max_version: '' 
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [newTree, setNewTree] = useState({ 
    name: '', 
    models: [] as string[], 
    min_version: '', 
    max_version: '' 
  });
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (tree: UITree) => {
    setEditingId(tree.id);
    setEditForm({
      name: tree.name,
      models: tree.models,
      min_version: tree.min_version,
      max_version: tree.max_version,
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.name.trim()) {
      setError('Name is required');
      return;
    }

    if (editForm.models.length === 0) {
      setError('At least one model must be selected');
      return;
    }

    // Check for duplicate names (excluding current item)
    const isDuplicate = trees.some(
      (t) => t.id !== editingId && t.name.toLowerCase() === editForm.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A tree with this name already exists');
      return;
    }

    setTrees(trees.map(t => 
      t.id === editingId 
        ? { 
            ...t, 
            name: editForm.name.trim(), 
            models: editForm.models,
            min_version: editForm.min_version.trim(), 
            max_version: editForm.max_version.trim() 
          }
        : t
    ));
    setEditingId(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', models: [], min_version: '', max_version: '' });
    setError(null);
  };

  const handleDelete = (id: string) => {
    setTrees(trees.filter(t => t.id !== id));
  };

  const handleAddNew = () => {
    if (!newTree.name.trim()) {
      setError('Name is required');
      return;
    }

    if (newTree.models.length === 0) {
      setError('At least one model must be selected');
      return;
    }

    // Check for duplicate names
    const isDuplicate = trees.some(
      (t) => t.name.toLowerCase() === newTree.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A tree with this name already exists');
      return;
    }

    const newId = (Math.max(...trees.map(t => parseInt(t.id)), 0) + 1).toString();
    setTrees([...trees, {
      id: newId,
      name: newTree.name.trim(),
      models: newTree.models,
      min_version: newTree.min_version.trim(),
      max_version: newTree.max_version.trim(),
    }]);
    setNewTree({ name: '', models: [], min_version: '', max_version: '' });
    setOpenDialog(false);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewTree({ name: '', models: [], min_version: '', max_version: '' });
    setError(null);
  };

  const handleModelChange = (event: SelectChangeEvent<string[]>, isEdit = false) => {
    const value = event.target.value;
    if (isEdit) {
      setEditForm({ ...editForm, models: typeof value === 'string' ? value.split(',') : value });
    } else {
      setNewTree({ ...newTree, models: typeof value === 'string' ? value.split(',') : value });
    }
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
      <TreeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Interface Trees Created
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Create your first interface tree to define navigation structures and device compatibility for your test automation.
      </Typography>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Interface Trees
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage navigation trees and device compatibility for your test automation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
        >
          Add Tree
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ boxShadow: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          {trees.length === 0 ? (
            <EmptyState />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Models</strong></TableCell>
                    <TableCell><strong>Min Version</strong></TableCell>
                    <TableCell><strong>Max Version</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trees.map((tree) => (
                    <TableRow key={tree.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
                      <TableCell>
                        {editingId === tree.id ? (
                          <TextField
                            size="small"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          tree.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tree.id ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              multiple
                              value={editForm.models}
                              onChange={(e) => handleModelChange(e, true)}
                              input={<OutlinedInput />}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                  ))}
                                </Box>
                              )}
                              sx={{ '& .MuiInputBase-root': { minHeight: '32px' } }}
                            >
                              {availableModels.map((model) => (
                                <MenuItem key={model} value={model}>
                                  {model}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {tree.models.map((model) => (
                              <Chip key={model} label={model} size="small" variant="outlined" />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tree.id ? (
                          <TextField
                            size="small"
                            value={editForm.min_version}
                            onChange={(e) => setEditForm({ ...editForm, min_version: e.target.value })}
                            fullWidth
                            variant="outlined"
                            placeholder="e.g., 1.0.0"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          tree.min_version || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === tree.id ? (
                          <TextField
                            size="small"
                            value={editForm.max_version}
                            onChange={(e) => setEditForm({ ...editForm, max_version: e.target.value })}
                            fullWidth
                            variant="outlined"
                            placeholder="e.g., 2.0.0"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          tree.max_version || 'N/A'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === tree.id ? (
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
                              onClick={() => handleEdit(tree)}
                              sx={{ p: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(tree.id)}
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

      {/* Add New Tree Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Add New Interface Tree</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              variant="outlined"
              value={newTree.name}
              onChange={(e) => setNewTree({ ...newTree, name: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
              placeholder="e.g., Main Navigation Tree"
            />
            
            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel size="small">Models</InputLabel>
              <Select
                multiple
                size="small"
                value={newTree.models}
                onChange={(e) => handleModelChange(e)}
                input={<OutlinedInput label="Models" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availableModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              margin="dense"
              label="Min Version"
              fullWidth
              variant="outlined"
              value={newTree.min_version}
              onChange={(e) => setNewTree({ ...newTree, min_version: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
              placeholder="e.g., 1.0.0"
            />
            
            <TextField
              margin="dense"
              label="Max Version"
              fullWidth
              variant="outlined"
              value={newTree.max_version}
              onChange={(e) => setNewTree({ ...newTree, max_version: e.target.value })}
              size="small"
              placeholder="e.g., 2.0.0"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 1, pb: 2 }}>
          <Button onClick={handleCloseDialog} size="small">Cancel</Button>
          <Button onClick={handleAddNew} variant="contained" size="small">
            Add Tree
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserInterface; 