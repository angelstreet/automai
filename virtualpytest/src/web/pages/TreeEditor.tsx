import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  AccountTree as TreeIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { Tree } from '../type';

const API_BASE_URL = 'http://localhost:5009/api';

const TreeEditor: React.FC = () => {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Tree>({
    tree_id: '',
    device: '',
    version: '',
    nodes: {},
  });

  useEffect(() => {
    fetchTrees();
  }, []);

  const fetchTrees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/trees`);
      if (response.ok) {
        const data = await response.json();
        setTrees(data);
      } else {
        setError('Failed to fetch trees');
      }
    } catch (err) {
      setError('Error fetching trees');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_BASE_URL}/trees/${formData.tree_id}` : `${API_BASE_URL}/trees`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTrees();
        handleCloseDialog();
      } else {
        setError('Failed to save tree');
      }
    } catch (err) {
      setError('Error saving tree');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (treeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/trees/${treeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTrees();
      } else {
        setError('Failed to delete tree');
      }
    } catch (err) {
      setError('Error deleting tree');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tree?: Tree) => {
    if (tree) {
      setFormData(tree);
      setIsEditing(true);
    } else {
      setFormData({
        tree_id: `tree_${Date.now()}`,
        device: '',
        version: '',
        nodes: {},
      });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTree(null);
    setError(null);
  };

  const addNode = () => {
    const nodeId = `node_${Date.now()}`;
    setFormData((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          id: nodeId,
          actions: [],
        },
      },
    }));
  };

  const removeNode = (nodeId: string) => {
    setFormData((prev) => {
      const newNodes = { ...prev.nodes };
      delete newNodes[nodeId];
      return { ...prev, nodes: newNodes };
    });
  };

  const updateNodeId = (oldId: string, newId: string) => {
    if (oldId === newId) return;

    setFormData((prev) => {
      const newNodes = { ...prev.nodes };
      const node = newNodes[oldId];
      if (node) {
        node.id = newId;
        newNodes[newId] = node;
        delete newNodes[oldId];
      }
      return { ...prev, nodes: newNodes };
    });
  };

  const addAction = (nodeId: string) => {
    setFormData((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          actions: [
            ...prev.nodes[nodeId].actions,
            {
              to: '',
              action: '',
              params: {},
              verification: {
                type: 'single',
                conditions: [{ type: 'element_exists', condition: '', timeout: 5000 }],
              },
            },
          ],
        },
      },
    }));
  };

  const removeAction = (nodeId: string, actionIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          actions: prev.nodes[nodeId].actions.filter((_, i) => i !== actionIndex),
        },
      },
    }));
  };

  const updateAction = (nodeId: string, actionIndex: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...prev.nodes[nodeId],
          actions: prev.nodes[nodeId].actions.map((action, i) =>
            i === actionIndex ? { ...action, [field]: value } : action,
          ),
        },
      },
    }));
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Navigation Tree Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Tree
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tree ID</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Nodes</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trees.map((tree) => (
              <TableRow key={tree.tree_id}>
                <TableCell>{tree.tree_id}</TableCell>
                <TableCell>{tree.device}</TableCell>
                <TableCell>{tree.version}</TableCell>
                <TableCell>
                  <Chip
                    label={`${Object.keys(tree.nodes).length} nodes`}
                    size="small"
                    variant="outlined"
                    icon={<TreeIcon />}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => setSelectedTree(tree)} color="info">
                    <TreeIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpenDialog(tree)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(tree.tree_id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Tree Details View */}
      {selectedTree && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5">
              Tree Details: {selectedTree.device} ({selectedTree.version})
            </Typography>
            <Button onClick={() => setSelectedTree(null)}>Close</Button>
          </Box>

          {Object.entries(selectedTree.nodes).map(([nodeId, node]) => (
            <Accordion key={nodeId} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Node: {nodeId} ({node.actions.length} actions)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {node.actions.map((action, index) => (
                  <Card key={index} sx={{ mb: 1 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="textSecondary">
                            To:
                          </Typography>
                          <Typography variant="body1">{action.to || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="textSecondary">
                            Action:
                          </Typography>
                          <Typography variant="body1">{action.action || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="textSecondary">
                            Verification:
                          </Typography>
                          <Typography variant="body1">{action.verification.type}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Tree' : 'Create Tree'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Tree ID"
                  value={formData.tree_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tree_id: e.target.value }))}
                  disabled={isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Device"
                  value={formData.device}
                  onChange={(e) => setFormData((prev) => ({ ...prev, device: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Version"
                  value={formData.version}
                  onChange={(e) => setFormData((prev) => ({ ...prev, version: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Nodes</Typography>
              <Button startIcon={<AddIcon />} onClick={addNode}>
                Add Node
              </Button>
            </Box>

            {Object.entries(formData.nodes).map(([nodeId, node]) => (
              <Card key={nodeId} sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <TextField
                      label="Node ID"
                      value={nodeId}
                      onChange={(e) => updateNodeId(nodeId, e.target.value)}
                      size="small"
                    />
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => removeNode(nodeId)}
                      color="error"
                      size="small"
                    >
                      Remove Node
                    </Button>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2">Actions</Typography>
                    <Button startIcon={<AddIcon />} onClick={() => addAction(nodeId)} size="small">
                      Add Action
                    </Button>
                  </Box>

                  {node.actions.map((action, actionIndex) => (
                    <Card key={actionIndex} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="To"
                              value={action.to}
                              onChange={(e) =>
                                updateAction(nodeId, actionIndex, 'to', e.target.value)
                              }
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              label="Action"
                              value={action.action}
                              onChange={(e) =>
                                updateAction(nodeId, actionIndex, 'action', e.target.value)
                              }
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions>
                        <Button
                          startIcon={<DeleteIcon />}
                          onClick={() => removeAction(nodeId, actionIndex)}
                          color="error"
                          size="small"
                        >
                          Remove Action
                        </Button>
                      </CardActions>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TreeEditor;
