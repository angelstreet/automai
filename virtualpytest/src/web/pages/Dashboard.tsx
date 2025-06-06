import {
  PlayArrow as PlayIcon,
  Add as AddIcon,
  Science as TestIcon,
  Campaign as CampaignIcon,
  AccountTree as TreeIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Devices as DevicesIcon,
  Computer as ComputerIcon,
  PhoneAndroid as PhoneIcon,
  Tv as TvIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { TestCase, Campaign, Tree } from '../type';

const API_BASE_URL = 'http://localhost:5009/api';

interface DashboardStats {
  testCases: number;
  campaigns: number;
  trees: number;
  recentActivity: Array<{
    id: string;
    type: 'test' | 'campaign' | 'tree';
    name: string;
    status: 'success' | 'error' | 'pending';
    timestamp: string;
  }>;
}

interface ConnectedDevice {
  client_id: string;
  name: string;
  device_model: string;
  local_ip: string;
  client_port: string;
  public_ip: string;
  capabilities: string[];
  status: string;
  registered_at: string;
  last_seen: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    testCases: 0,
    campaigns: 0,
    trees: 0,
    recentActivity: [],
  });
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [testCasesRes, campaignsRes, treesRes, devicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/testcases`),
        fetch(`${API_BASE_URL}/campaigns`),
        fetch(`${API_BASE_URL}/navigation/trees`),
        fetch(`${API_BASE_URL}/system/clients`),
      ]);

      let testCases: TestCase[] = [];
      let campaigns: Campaign[] = [];
      let trees: Tree[] = [];
      let devices: ConnectedDevice[] = [];

      if (testCasesRes.ok) {
        testCases = await testCasesRes.json();
      }

      if (campaignsRes.ok) {
        campaigns = await campaignsRes.json();
      }

      if (treesRes.ok) {
        const treesResponse = await treesRes.json();
        // The navigation API returns { success: true, data: [...] }
        if (treesResponse.success && treesResponse.data) {
          trees = treesResponse.data;
        }
      }

      if (devicesRes.ok) {
        const devicesResponse = await devicesRes.json();
        if (devicesResponse.status === 'success' && devicesResponse.clients) {
          devices = devicesResponse.clients;
        }
      }

      // Generate mock recent activity
      const recentActivity = [
        ...testCases.slice(0, 3).map((tc) => ({
          id: tc.test_id,
          type: 'test' as const,
          name: tc.name,
          status: 'success' as const,
          timestamp: new Date().toISOString(),
        })),
        ...campaigns.slice(0, 2).map((c) => ({
          id: c.campaign_id,
          type: 'campaign' as const,
          name: c.campaign_name,
          status: 'pending' as const,
          timestamp: new Date().toISOString(),
        })),
      ].slice(0, 5);

      setStats({
        testCases: testCases.length,
        campaigns: campaigns.length,
        trees: trees.length,
        recentActivity,
      });
      
      setConnectedDevices(devices);
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      default:
        return <PendingIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDeviceIcon = (deviceModel: string) => {
    switch (deviceModel) {
      case 'android_mobile':
        return <PhoneIcon color="primary" />;
      case 'android_tv':
        return <TvIcon color="secondary" />;
      default:
        return <ComputerIcon color="info" />;
    }
  };

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Test Cases
                  </Typography>
                  <Typography variant="h4">{stats.testCases}</Typography>
                </Box>
                <TestIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Campaigns
                  </Typography>
                  <Typography variant="h4">{stats.campaigns}</Typography>
                </Box>
                <CampaignIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Navigation Trees
                  </Typography>
                  <Typography variant="h4">{stats.trees}</Typography>
                </Box>
                <TreeIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Connected Devices
                  </Typography>
                  <Typography variant="h4">{connectedDevices.length}</Typography>
                </Box>
                <DevicesIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button variant="contained" startIcon={<AddIcon />} href="/testcases" fullWidth>
                Create New Test Case
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                href="/campaigns"
                fullWidth
                color="secondary"
              >
                Create New Campaign
              </Button>
              <Button variant="outlined" startIcon={<PlayIcon />} fullWidth disabled>
                Run Test Campaign (Coming Soon)
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            {stats.recentActivity.length > 0 ? (
              <List>
                {stats.recentActivity.map((activity) => (
                  <ListItem key={activity.id} divider>
                    <ListItemIcon>{getStatusIcon(activity.status)}</ListItemIcon>
                    <ListItemText
                      primary={activity.name}
                      secondary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip label={activity.type} size="small" variant="outlined" />
                          <Chip
                            label={activity.status}
                            size="small"
                            color={getStatusColor(activity.status) as any}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">
                No recent activity. Start by creating your first test case!
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Connected Devices */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Connected Devices ({connectedDevices.length})
        </Typography>
        {connectedDevices.length > 0 ? (
          <Grid container spacing={2}>
            {connectedDevices.map((device) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={device.client_id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getDeviceIcon(device.device_model)}
                        <Typography variant="h6" component="div">
                          {device.name}
                        </Typography>
                      </Box>
                      <Chip
                        label={device.status}
                        size="small"
                        color={device.status === 'online' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </Box>
                    
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Model: {device.device_model}
                    </Typography>
                    
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      IP: {device.local_ip}:{device.client_port}
                    </Typography>
                    
                    <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                      {device.capabilities.map((capability) => (
                        <Chip
                          key={capability}
                          label={capability}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                    
                    <Typography color="textSecondary" variant="caption">
                      Last seen: {formatLastSeen(device.last_seen)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box textAlign="center" py={4}>
            <DevicesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="textSecondary" variant="h6" gutterBottom>
              No devices connected
            </Typography>
            <Typography color="textSecondary" variant="body2">
              Start a client with: python app.py --client
            </Typography>
          </Box>
        )}
      </Paper>

      {/* System Status */}
      <Paper sx={{ p: 1, mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <SuccessIcon color="success" />
              <Typography>API Server: Online</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <SuccessIcon color="success" />
              <Typography>Database: Connected</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <PendingIcon color="warning" />
              <Typography>Test Runner: Idle</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <PendingIcon color="warning" />
              <Typography>Scheduler: Idle</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Dashboard;
