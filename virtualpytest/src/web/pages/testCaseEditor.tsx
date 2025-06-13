import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
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
  Chip,
  Tabs,
  Tab,
  Autocomplete,
  Slider,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

// Import registration context
import { buildServerUrl } from '../utils/frontendUtils';

import { TestCase } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TestCaseEditor: React.FC = () => {
  // Use registration context for centralized URL management
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const [formData, setFormData] = useState<TestCase>({
    test_id: '',
    name: '',
    test_type: 'functional',
    start_node: '',
    steps: [],
    // Simplified fields - removed device and environment dependencies
    tags: [],
    priority: 1,
    estimated_duration: 60,
  });

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    try {
      // Use correct testcases endpoint
      const response = await fetch(buildServerUrl('/server/testcases/getAllTestCases'));
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (err) {
      console.error('Error fetching test cases:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      // Use correct testcases endpoints
      const url = isEditing
        ? buildServerUrl(`/server/testcases/updateTestCase/${formData.test_id}`)
        : buildServerUrl('/server/testcases/createTestCase');

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
      // Use correct testcases endpoint
      const response = await fetch(buildServerUrl(`/server/testcases/deleteTestCase/${testId}`), {
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
        steps: [],
        tags: [],
        priority: 1,
        estimated_duration: 60,
      });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError(null);
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          target_node: '',
          verify: {
            type: 'single',
            conditions: [{ type: 'element_exists', condition: '', timeout: 5000 }],
          },
        },
      ],
    }));
  };

  const updateStep = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    }));
  };

  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const handleTagsChange = (_event: any, newValue: string[]) => {
    setFormData((prev) => ({ ...prev, tags: newValue }));
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'default';
      case 2:
        return 'primary';
      case 3:
        return 'secondary';
      case 4:
        return 'warning';
      case 5:
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return 'Very Low';
      case 2:
        return 'Low';
      case 3:
        return 'Medium';
      case 4:
        return 'High';
      case 5:
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Test Case Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
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
        <Table
          sx={{
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
              <TableCell>Test ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Steps</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testCases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                    No test cases found. Create your first test case to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              testCases.map((testCase) => (
                <TableRow key={testCase.test_id}>
                  <TableCell>{testCase.test_id}</TableCell>
                  <TableCell>{testCase.name}</TableCell>
                  <TableCell>
                    <Chip label={testCase.test_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPriorityLabel(testCase.priority || 1)}
                      size="small"
                      color={getPriorityColor(testCase.priority || 1) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{testCase.estimated_duration || 60}s</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {testCase.tags
                        ?.slice(0, 2)
                        .map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      {(testCase.tags?.length || 0) > 2 && (
                        <Chip label={`+${(testCase.tags?.length || 0) - 2}`} size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{testCase.steps.length}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpenDialog(testCase)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(testCase.test_id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Test Case' : 'Create Test Case'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
              <Tab label="Basic Info" icon={<EditIcon />} />
              <Tab label="Settings" icon={<SettingsIcon />} />
            </Tabs>

            {/* Basic Info Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Test ID"
                    value={formData.test_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, test_id: e.target.value }))}
                    disabled={isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Test Type</InputLabel>
                    <Select
                      value={formData.test_type}
                      label="Test Type"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, test_type: e.target.value as any }))
                      }
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
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, start_node: e.target.value }))
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={[]}
                    value={formData.tags || []}
                    onChange={handleTagsChange}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Tags" placeholder="Add tags..." />
                    )}
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
            </TabPanel>

            {/* Settings Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography gutterBottom>Priority</Typography>
                  <Slider
                    value={formData.priority || 1}
                    onChange={(_e, value) =>
                      setFormData((prev) => ({ ...prev, priority: value as number }))
                    }
                    min={1}
                    max={5}
                    step={1}
                    marks={[
                      { value: 1, label: 'Very Low' },
                      { value: 2, label: 'Low' },
                      { value: 3, label: 'Medium' },
                      { value: 4, label: 'High' },
                      { value: 5, label: 'Critical' },
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Estimated Duration (seconds)"
                    type="number"
                    value={formData.estimated_duration || 60}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimated_duration: parseInt(e.target.value),
                      }))
                    }
                  />
                </Grid>
              </Grid>
            </TabPanel>
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
