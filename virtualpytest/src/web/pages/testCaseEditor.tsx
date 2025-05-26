import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Divider,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { TestCase } from '../type';

const API_BASE_URL = 'http://localhost:5009/api';

const TestCaseEditor: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TestCase>({
    test_id: '',
    name: '',
    test_type: 'functional',
    start_node: '',
    steps: []
  });

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/testcases`);
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      } else {
        setError('Failed to fetch test cases');
      }
    } catch (err) {
      setError('Error fetching test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing 
        ? `${API_BASE_URL}/testcases/${formData.test_id}` 
        : `${API_BASE_URL}/testcases`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTestCases();
        handleCloseDialog();
      } else {
        setError('Failed to save test case');
      }
    } catch (err) {
      setError('Error saving test case');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (testId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/testcases/${testId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTestCases();
      } else {
        setError('Failed to delete test case');
      }
    } catch (err) {
      setError('Error deleting test case');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (testCase?: TestCase) => {
    if (testCase) {
      setFormData(testCase);
      setIsEditing(true);
    } else {
      setFormData({
        test_id: `test_${Date.now()}`,
        name: '',
        test_type: 'functional',
        start_node: '',
        steps: []
      });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTestCase(null);
    setError(null);
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, {
        target_node: '',
        verify: {
          type: 'single',
          conditions: [{ type: 'element_exists', condition: '', timeout: 5000 }]
        }
      }]
    }));
  };

  const updateStep = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Test Case Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Create Test Case
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
              <TableCell>Test ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Start Node</TableCell>
              <TableCell>Steps</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testCases.map((testCase) => (
              <TableRow key={testCase.test_id}>
                <TableCell>{testCase.test_id}</TableCell>
                <TableCell>{testCase.name}</TableCell>
                <TableCell>{testCase.test_type}</TableCell>
                <TableCell>{testCase.start_node}</TableCell>
                <TableCell>{testCase.steps.length}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenDialog(testCase)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(testCase.test_id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Test Case' : 'Create Test Case'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Test ID"
                  value={formData.test_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, test_id: e.target.value }))}
                  disabled={isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Test Type</InputLabel>
                  <Select
                    value={formData.test_type}
                    label="Test Type"
                    onChange={(e) => setFormData(prev => ({ ...prev, test_type: e.target.value as any }))}
                  >
                    <MenuItem value="functional">Functional</MenuItem>
                    <MenuItem value="performance">Performance</MenuItem>
                    <MenuItem value="endurance">Endurance</MenuItem>
                    <MenuItem value="robustness">Robustness</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Node"
                  value={formData.start_node}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_node: e.target.value }))}
                />
              </Grid>
            </Grid>

            <Box mt={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Steps</Typography>
                <Button startIcon={<AddIcon />} onClick={addStep}>
                  Add Step
                </Button>
              </Box>
              
              {formData.steps.map((step, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Step {index + 1}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Target Node"
                          value={step.target_node}
                          onChange={(e) => updateStep(index, 'target_node', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => removeStep(index)}
                      color="error"
                    >
                      Remove Step
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
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

export default TestCaseEditor;
