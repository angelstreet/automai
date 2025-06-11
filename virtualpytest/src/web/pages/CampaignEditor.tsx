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
} from '@mui/material';
import React, { useState, useEffect } from 'react';

// Import registration context
import { useRegistration } from '../contexts/RegistrationContext';

import { Campaign } from '../types';

const CampaignEditor: React.FC = () => {
  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
      const campaignsResponse = await fetch(buildServerUrl('/server/campaigns'));

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      setError('Error fetching campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const url = formData.campaign_id
        ? buildServerUrl(`/server/campaigns/${formData.campaign_id}`)
        : buildServerUrl('/server/campaigns');
      const method = formData.campaign_id ? 'PUT' : 'POST';

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
      const response = await fetch(buildServerUrl(`/server/campaigns/${campaignId}`), {
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
              <TableCell>Navigation Tree ID</TableCell>
              <TableCell>Remote Controller</TableCell>
              <TableCell>Prioritize</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(campaigns || []).map((campaign) => (
              <TableRow key={campaign.campaign_id}>
                <TableCell>{campaign.campaign_id}</TableCell>
                <TableCell>{campaign.campaign_name}</TableCell>
                <TableCell>{campaign.navigation_tree_id}</TableCell>
                <TableCell>{campaign.remote_controller}</TableCell>
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
                <TextField
                  fullWidth
                  label="Navigation Tree ID"
                  value={formData.navigation_tree_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, navigation_tree_id: e.target.value }))
                  }
                />
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
                <TextField
                  fullWidth
                  label="Test Case IDs (comma-separated)"
                  value={(formData.test_case_ids || []).join(', ')}
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(id => id.trim()).filter(id => id);
                    setFormData((prev) => ({ ...prev, test_case_ids: ids }));
                  }}
                  placeholder="Enter test case IDs separated by commas"
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
