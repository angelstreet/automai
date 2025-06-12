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
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

// Import registration context
import { useRegistration } from '../contexts/RegistrationContext';

import { Campaign } from '../types';

const CampaignEditor: React.FC = () => {
  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true for initial fetch
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Don't set loading to true here since it's already true initially
      // Only set loading for subsequent fetches (like after delete)
      const campaignsResponse = await fetch(buildServerUrl('/server/campaigns/getAllCampaigns'));

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

  const handleDelete = async (campaignId: string) => {
    try {
      setLoading(true);
      const response = await fetch(buildServerUrl(`/server/campaigns/deleteCampaign/${campaignId}`), {
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Campaign Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          Create Campaign
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
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
              <TableCell>Campaign ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                    No campaigns found. Create your first campaign to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.campaign_id}>
                  <TableCell>{campaign.campaign_id}</TableCell>
                  <TableCell>{campaign.campaign_name}</TableCell>
                  <TableCell>
                    <IconButton color="primary">
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}
    </Box>
  );
};

export default CampaignEditor;
