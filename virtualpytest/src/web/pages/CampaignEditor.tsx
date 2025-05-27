import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
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
  FormControlLabel,
  Switch,
  Autocomplete,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { Campaign, TestCase, Tree } from '../type';

const API_BASE_URL = 'http://localhost:5009/api';

const CampaignEditor: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [trees, setTrees] = useState<Tree[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Campaign>({
    campaign_id: '',
    campaign_name: '',
    navigation_tree_id: '',
    remote_controller: '',
    audio_video_acquisition: '',
    test_case_ids: [],
    auto_tests: { mode: 'manual', nodes: [] },
    prioritize: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, testCasesRes, treesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/campaigns`),
        fetch(`${API_BASE_URL}/testcases`),
        fetch(`${API_BASE_URL}/trees`),
      ]);

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }

      if (testCasesRes.ok) {
        const testCasesData = await testCasesRes.json();
        setTestCases(testCasesData);
      }

      if (treesRes.ok) {
        const treesData = await treesRes.json();
        setTrees(treesData);
      }
    } catch (err) {
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing
        ? `${API_BASE_URL}/campaigns/${formData.campaign_id}`
        : `${API_BASE_URL}/campaigns`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchData();
        handleCloseDialog();
      } else {
        setError('Failed to save campaign');
      }
    } catch (err) {
      setError('Error saving campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
      } else {
        setError('Failed to delete campaign');
      }
    } catch (err) {
      setError('Error deleting campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (campaign?: Campaign) => {
    if (campaign) {
      setFormData(campaign);
      setIsEditing(true);
    } else {
      setFormData({
        campaign_id: `campaign_${Date.now()}`,
        campaign_name: '',
        navigation_tree_id: '',
        remote_controller: '',
        audio_video_acquisition: '',
        test_case_ids: [],
        auto_tests: { mode: 'manual', nodes: [] },
        prioritize: false,
      });
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError(null);
  };

  const getTreeName = (treeId: string) => {
    const tree = trees.find((t) => t.tree_id === treeId);
    return tree ? `${tree.device} (${tree.version})` : treeId;
  };

  const getTestCaseName = (testId: string) => {
    const testCase = testCases.find((t) => t.test_id === testId);
    return testCase ? testCase.name : testId;
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Campaign Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Campaign
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
              <TableCell>Campaign ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Navigation Tree</TableCell>
              <TableCell>Test Cases</TableCell>
              <TableCell>Prioritize</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.campaign_id}>
                <TableCell>{campaign.campaign_id}</TableCell>
                <TableCell>{campaign.campaign_name}</TableCell>
                <TableCell>{getTreeName(campaign.navigation_tree_id)}</TableCell>
                <TableCell>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {campaign.test_case_ids.slice(0, 3).map((testId) => (
                      <Chip
                        key={testId}
                        label={getTestCaseName(testId)}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {campaign.test_case_ids.length > 3 && (
                      <Chip
                        label={`+${campaign.test_case_ids.length - 3} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={campaign.prioritize ? 'Yes' : 'No'}
                    color={campaign.prioritize ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenDialog(campaign)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(campaign.campaign_id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                  <IconButton color="success">
                    <PlayIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Campaign ID"
                  value={formData.campaign_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, campaign_id: e.target.value }))
                  }
                  disabled={isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Campaign Name"
                  value={formData.campaign_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, campaign_name: e.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Navigation Tree</InputLabel>
                  <Select
                    value={formData.navigation_tree_id}
                    label="Navigation Tree"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, navigation_tree_id: e.target.value }))
                    }
                  >
                    {trees.map((tree) => (
                      <MenuItem key={tree.tree_id} value={tree.tree_id}>
                        {tree.device} ({tree.version})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Remote Controller"
                  value={formData.remote_controller}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, remote_controller: e.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Audio/Video Acquisition"
                  value={formData.audio_video_acquisition}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, audio_video_acquisition: e.target.value }))
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.prioritize}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, prioritize: e.target.checked }))
                      }
                    />
                  }
                  label="Enable Prioritization"
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={testCases}
                  getOptionLabel={(option) => `${option.name} (${option.test_id})`}
                  value={testCases.filter((tc) => formData.test_case_ids.includes(tc.test_id))}
                  onChange={(_, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      test_case_ids: newValue.map((tc) => tc.test_id),
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Test Cases" placeholder="Select test cases" />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.test_id}
                      />
                    ))
                  }
                />
              </Grid>
            </Grid>
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

export default CampaignEditor;
