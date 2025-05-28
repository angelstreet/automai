import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
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
} from '@mui/material';
import React, { useState, useEffect } from 'react';

interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  description: string;
}

const defaultEnvironmentVariables: EnvironmentVariable[] = [
  {
    id: '1',
    key: 'prod',
    value: 'production',
    description: 'Production environment',
  },
  {
    id: '2',
    key: 'test',
    value: 'testing',
    description: 'Test environment',
  },
  {
    id: '3',
    key: 'dev',
    value: 'development',
    description: 'Development environment',
  },
  {
    id: '4',
    key: 'preprod',
    value: 'preproduction',
    description: 'Preproduction environment',
  },
];

const Environment: React.FC = () => {
  const [variables, setVariables] = useState<EnvironmentVariable[]>(defaultEnvironmentVariables);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ key: '', value: '', description: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [newVariable, setNewVariable] = useState({ key: '', value: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (variable: EnvironmentVariable) => {
    setEditingId(variable.id);
    setEditForm({
      key: variable.key,
      value: variable.value,
      description: variable.description,
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.key.trim() || !editForm.value.trim()) {
      setError('Key and Value are required');
      return;
    }

    // Check for duplicate keys (excluding current item)
    const isDuplicate = variables.some(
      (v) => v.id !== editingId && v.key.toLowerCase() === editForm.key.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A variable with this key already exists');
      return;
    }

    setVariables(variables.map(v => 
      v.id === editingId 
        ? { ...v, key: editForm.key.trim(), value: editForm.value.trim(), description: editForm.description.trim() }
        : v
    ));
    setEditingId(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ key: '', value: '', description: '' });
    setError(null);
  };

  const handleDelete = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
  };

  const handleAddNew = () => {
    if (!newVariable.key.trim() || !newVariable.value.trim()) {
      setError('Key and Value are required');
      return;
    }

    // Check for duplicate keys
    const isDuplicate = variables.some(
      (v) => v.key.toLowerCase() === newVariable.key.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A variable with this key already exists');
      return;
    }

    const newId = (Math.max(...variables.map(v => parseInt(v.id))) + 1).toString();
    setVariables([...variables, {
      id: newId,
      key: newVariable.key.trim(),
      value: newVariable.value.trim(),
      description: newVariable.description.trim(),
    }]);
    setNewVariable({ key: '', value: '', description: '' });
    setOpenDialog(false);
    setError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewVariable({ key: '', value: '', description: '' });
    setError(null);
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Environment Variables
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage environment configuration variables for your test automation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
        >
          Add Variable
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ boxShadow: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
            <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Key</strong></TableCell>
                  <TableCell><strong>Value</strong></TableCell>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variables.map((variable) => (
                  <TableRow key={variable.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
                    <TableCell>
                      {editingId === variable.id ? (
                        <TextField
                          size="small"
                          value={editForm.key}
                          onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                          fullWidth
                          variant="outlined"
                          sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                        />
                      ) : (
                        variable.key
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === variable.id ? (
                        <TextField
                          size="small"
                          value={editForm.value}
                          onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                          fullWidth
                          variant="outlined"
                          sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                        />
                      ) : (
                        variable.value
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === variable.id ? (
                        <TextField
                          size="small"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          fullWidth
                          variant="outlined"
                          sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                        />
                      ) : (
                        variable.description
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {editingId === variable.id ? (
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
                            onClick={() => handleEdit(variable)}
                            sx={{ p: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(variable.id)}
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
        </CardContent>
      </Card>

      {/* Add New Variable Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Add New Environment Variable</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Key"
              fullWidth
              variant="outlined"
              value={newVariable.key}
              onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
            />
            <TextField
              margin="dense"
              label="Value"
              fullWidth
              variant="outlined"
              value={newVariable.value}
              onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
              sx={{ mb: 1.5 }}
              size="small"
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              variant="outlined"
              value={newVariable.description}
              onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 1, pb: 2 }}>
          <Button onClick={handleCloseDialog} size="small">Cancel</Button>
          <Button onClick={handleAddNew} variant="contained" size="small">
            Add Variable
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Environment;
