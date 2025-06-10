import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  DevicesOther as DeviceIcon,
  VerifiedUser as VerifyIcon,
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

// Import registration context
import { useRegistration } from '../contexts/RegistrationContext';

import { TestCase, Device, EnvironmentProfile, VerificationCondition } from '../types';

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
  const { buildServerUrl, buildApiUrl } = useRegistration();

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [environmentProfiles, setEnvironmentProfiles] = useState<EnvironmentProfile[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
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
    // New Phase 2 fields
    device_id: '',
    environment_profile_id: '',
    verification_conditions: [],
    expected_results: {},
    execution_config: {},
    tags: [],
    priority: 1,
    estimated_duration: 60,
  });

  useEffect(() => {
    fetchTestCases();
    fetchDevices();
    fetchEnvironmentProfiles();
  }, []);

  const fetchTestCases = async () => {
    try {
      // Use abstract server test execution endpoint
      const response = await fetch(buildServerUrl('/server/test/cases'));
      if (response.ok) {
        const data = await response.json();
        setTestCases(data);
      }
    } catch (err) {
      console.error('Error fetching test cases:', err);
    }
  };

  const fetchDevices = async () => {
    try {
      // Use existing system clients devices endpoint
      const response = await fetch(buildApiUrl('/server/system/clients/devices'));
      if (response.ok) {
        const data = await response.json();
        // Extract devices array from the response
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchEnvironmentProfiles = async () => {
    try {
      // Use abstract system environment profiles endpoint
      const response = await fetch(buildApiUrl('/server/system/environment-profiles'));
      if (response.ok) {
        const data = await response.json();
        // Extract profiles array from the response
        setEnvironmentProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching environment profiles:', err);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      // Use abstract server test execution endpoints
      const url = isEditing
        ? buildServerUrl(`/server/test/cases/${formData.test_id}`)
        : buildServerUrl('/server/test/cases');

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
      // Use abstract server test execution endpoint
      const response = await fetch(buildServerUrl(`/server/test/cases/${testId}`), {
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
        device_id: '',
        environment_profile_id: '',
        verification_conditions: [],
        expected_results: {},
        execution_config: {},
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
    setSelectedTestCase(null);
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

  const addVerificationCondition = () => {
    const newCondition: VerificationCondition = {
      id: `vc_${Date.now()}`,
      type: 'element_exists',
      description: '',
      parameters: {},
      timeout: 5000,
      critical: false,
    };
    setFormData((prev) => ({
      ...prev,
      verification_conditions: [...(prev.verification_conditions || []), newCondition],
    }));
  };

  const updateVerificationCondition = (
    index: number,
    field: keyof VerificationCondition,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      verification_conditions:
        prev.verification_conditions?.map((condition, i) =>
          i === index ? { ...condition, [field]: value } : condition,
        ) || [],
    }));
  };

  const removeVerificationCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      verification_conditions: prev.verification_conditions?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleTagsChange = (event: any, newValue: string[]) => {
    setFormData((prev) => ({ ...prev, tags: newValue }));
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    return device ? device.name : 'Unknown Device';
  };

  const getEnvironmentProfileName = (profileId: string) => {
    const profile = environmentProfiles.find((p) => p.id === profileId);
    return profile ? profile.name : 'Unknown Profile';
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

  // Execute test case using abstract test execution controller
  const handleExecute = async (testCaseId: string, selectedDevice: string) => {
    try {
      setLoading(true);
      // Use abstract server test execution endpoint
      const response = await fetch(buildServerUrl('/server/test/execute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_case_id: testCaseId,
          device_id: selectedDevice,
        }),
      });

      if (response.ok) {
        // Handle successful execution
      } else {
        setError('Failed to execute test case');
      }
    } catch (err) {
      setError('Error executing test case');
    } finally {
      setLoading(false);
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
                  : 'rgba(0, 0, 0, 0.04) !important'
            }
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Test ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Steps</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testCases.map((testCase) => (
              <TableRow key={testCase.test_id}>
                <TableCell>{testCase.test_id}</TableCell>
                <TableCell>{testCase.name}</TableCell>
                <TableCell>
                  <Chip label={testCase.test_type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  {testCase.device_id ? (
                    <Chip
                      icon={<DeviceIcon />}
                      label={getDeviceName(testCase.device_id)}
                      size="small"
                      color="primary"
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No device
                    </Typography>
                  )}
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
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Test Case' : 'Create Test Case'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Basic Info" icon={<EditIcon />} />
              <Tab label="Device & Environment" icon={<DeviceIcon />} />
              <Tab label="Verification" icon={<VerifyIcon />} />
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

            {/* Device & Environment Tab */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Device</InputLabel>
                    <Select
                      value={formData.device_id}
                      label="Device"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, device_id: e.target.value }))
                      }
                    >
                      <MenuItem value="">Select a device</MenuItem>
                      {devices.map((device) => (
                        <MenuItem key={device.id} value={device.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DeviceIcon />
                            <Box>
                              <Typography variant="body1">{device.name}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {device.type} - {device.environment}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Environment Profile</InputLabel>
                    <Select
                      value={formData.environment_profile_id}
                      label="Environment Profile"
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, environment_profile_id: e.target.value }))
                      }
                    >
                      <MenuItem value="">Select an environment profile</MenuItem>
                      {environmentProfiles.map((profile) => (
                        <MenuItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Verification Tab */}
            <TabPanel value={tabValue} index={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Verification Conditions</Typography>
                <Button startIcon={<AddIcon />} onClick={addVerificationCondition}>
                  Add Condition
                </Button>
              </Box>

              {formData.verification_conditions?.map((condition, index) => (
                <Card key={condition.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>Type</InputLabel>
                          <Select
                            value={condition.type}
                            label="Type"
                            onChange={(e) =>
                              updateVerificationCondition(index, 'type', e.target.value)
                            }
                          >
                            <MenuItem value="image_appears">Image Appears</MenuItem>
                            <MenuItem value="text_appears">Text Appears</MenuItem>
                            <MenuItem value="element_exists">Element Exists</MenuItem>
                            <MenuItem value="audio_playing">Audio Playing</MenuItem>
                            <MenuItem value="video_playing">Video Playing</MenuItem>
                            <MenuItem value="color_present">Color Present</MenuItem>
                            <MenuItem value="screen_state">Screen State</MenuItem>
                            <MenuItem value="performance_metric">Performance Metric</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Timeout (ms)"
                          type="number"
                          value={condition.timeout}
                          onChange={(e) =>
                            updateVerificationCondition(index, 'timeout', parseInt(e.target.value))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={condition.critical}
                              onChange={(e) =>
                                updateVerificationCondition(index, 'critical', e.target.checked)
                              }
                            />
                          }
                          label="Critical"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Description"
                          value={condition.description}
                          onChange={(e) =>
                            updateVerificationCondition(index, 'description', e.target.value)
                          }
                          multiline
                          rows={2}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button
                      startIcon={<DeleteIcon />}
                      onClick={() => removeVerificationCondition(index)}
                      color="error"
                    >
                      Remove Condition
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </TabPanel>

            {/* Settings Tab */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography gutterBottom>Priority</Typography>
                  <Slider
                    value={formData.priority || 1}
                    onChange={(e, value) =>
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
