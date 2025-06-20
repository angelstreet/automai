import {
  Computer as ComputerIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  TableRows as TableViewIcon,
  Refresh as RefreshIcon,
  Assignment as TestIcon,
  Campaign as CampaignIcon,
  AccountTree as TreeIcon,
  Devices as DevicesIcon,
  Add as AddIcon,
  PlayArrow as PlayIcon,
  GridView as GridViewIcon,
  Phone as PhoneIcon,
  Tv as TvIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Paper,
} from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import { useRegistration } from '../hooks/useRegistration';
import { TestCase, Campaign, Tree } from '../types';
import { Host } from '../types/common/Host_Types';
import { DashboardStats, RecentActivity, ViewMode } from '../types/pages/Dashboard_Types';

const Dashboard: React.FC = () => {
  const { availableHosts, fetchHosts, isLoading: hostsLoading } = useRegistration();
  const [stats, setStats] = useState<DashboardStats>({
    testCases: 0,
    campaigns: 0,
    trees: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsResponse, testCasesResponse, treesResponse] = await Promise.all([
        fetch('/server/campaigns/getAllCampaigns'),
        fetch('/server/testcases/getAllTestCases'),
        fetch('/server/navigation/getAllTrees'), // Use relative URL for navigation requests
      ]);

      let testCases: TestCase[] = [];
      let campaigns: Campaign[] = [];
      let trees: Tree[] = [];

      if (testCasesResponse.ok) {
        testCases = await testCasesResponse.json();
      }

      if (campaignsResponse.ok) {
        campaigns = await campaignsResponse.json();
      }

      if (treesResponse.ok) {
        const treesData = await treesResponse.json();
        // The navigation API returns { success: true, data: [...] }
        if (treesData.success && treesData.data) {
          trees = treesData.data;
        }
      }

      // Generate mock recent activity with proper RecentActivity type
      const recentActivity: RecentActivity[] = [
        ...testCases.slice(0, 3).map(
          (tc): RecentActivity => ({
            id: tc.test_id,
            type: 'test' as const,
            name: tc.name,
            status: 'success' as const,
            timestamp: new Date().toISOString(),
          }),
        ),
        ...campaigns.slice(0, 2).map(
          (c): RecentActivity => ({
            id: c.campaign_id,
            type: 'campaign' as const,
            name: c.name,
            status: 'pending' as const,
            timestamp: new Date().toISOString(),
          }),
        ),
      ].slice(0, 5);

      setStats({
        testCases: testCases.length,
        campaigns: campaigns.length,
        trees: trees.length,
        recentActivity,
      });
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useCallback to prevent fetchHosts from changing on every render
  const memoizedFetchHosts = useCallback(() => {
    fetchHosts();
  }, [fetchHosts]);

  useEffect(() => {
    fetchDashboardData();
    memoizedFetchHosts();
    // Set up auto-refresh for hosts every 30 seconds
    const interval = setInterval(memoizedFetchHosts, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, memoizedFetchHosts]);

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newViewMode: ViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      console.log(`View mode changed to ${newViewMode}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
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

  const formatRegisteredAt = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    if (percentage >= 50) return 'info';
    return 'success';
  };

  const SystemStatsDisplay: React.FC<{ stats: Host['system_stats'] }> = ({
    stats: systemStats,
  }) => {
    if (!systemStats) {
      return (
        <Box>
          <Typography variant="caption" color="error">
            No system stats available
          </Typography>
        </Box>
      );
    }

    if (systemStats.error) {
      return (
        <Box>
          <Typography variant="caption" color="error">
            {systemStats.error}
          </Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="textSecondary">
            CPU
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.cpu_percent}%
          </Typography>
        </Box>
        <Box
          sx={{
            width: '100%',
            height: 4,
            backgroundColor: 'grey.300',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Box
            sx={{
              width: `${Math.min(systemStats.cpu_percent, 100)}%`,
              height: '100%',
              backgroundColor: `${getUsageColor(systemStats.cpu_percent)}.main`,
              borderRadius: 1,
            }}
          />
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="textSecondary">
            Memory
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.memory_percent}%
          </Typography>
        </Box>
        <Box
          sx={{
            width: '100%',
            height: 4,
            backgroundColor: 'grey.300',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Box
            sx={{
              width: `${Math.min(systemStats.memory_percent, 100)}%`,
              height: '100%',
              backgroundColor: `${getUsageColor(systemStats.memory_percent)}.main`,
              borderRadius: 1,
            }}
          />
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="textSecondary">
            Disk
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.disk_percent}%
          </Typography>
        </Box>
        <Box
          sx={{
            width: '100%',
            height: 4,
            backgroundColor: 'grey.300',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Box
            sx={{
              width: `${Math.min(systemStats.disk_percent, 100)}%`,
              height: '100%',
              backgroundColor: `${getUsageColor(systemStats.disk_percent)}.main`,
              borderRadius: 1,
            }}
          />
        </Box>

        <Typography variant="caption" color="textSecondary">
          {systemStats.platform} ({systemStats.architecture})
        </Typography>
      </Box>
    );
  };

  const renderDevicesGrid = () => (
    <Grid container spacing={2}>
      {availableHosts.map((device) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={device.host_name}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  {getDeviceIcon(device.device_model)}
                  <Typography variant="h6" component="div" noWrap>
                    {device.host_name}
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
                Host URL: {device.host_url}
              </Typography>

              <Typography color="textSecondary" variant="body2" gutterBottom>
                Device: {device.device_name} ({device.device_ip}:{device.device_port})
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

              {/* System Stats */}
              <Box mb={2}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}
                >
                  System Stats
                </Typography>
                <SystemStatsDisplay stats={device.system_stats} />
              </Box>

              <Typography color="textSecondary" variant="caption" display="block">
                Last seen: {formatLastSeen(device.last_seen)}
              </Typography>

              <Typography color="textSecondary" variant="caption" display="block">
                Registered: {formatRegisteredAt(device.registered_at)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderDevicesTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Host</TableCell>
            <TableCell>Model</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Host IP</TableCell>
            <TableCell>Device</TableCell>
            <TableCell>CPU</TableCell>
            <TableCell>RAM</TableCell>
            <TableCell>Disk</TableCell>
            <TableCell>Capabilities</TableCell>
            <TableCell>Last Seen</TableCell>
            <TableCell>Registered</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {availableHosts.map((device) => (
            <TableRow
              key={device.host_name}
              hover
              sx={{
                '&:hover': {
                  backgroundColor: 'transparent !important',
                },
              }}
            >
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  {getDeviceIcon(device.device_model)}
                  <Typography variant="body2">{device.host_name}</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{device.device_model}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={device.status}
                  size="small"
                  color={device.status === 'online' ? 'success' : 'error'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {device.host_url}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {device.device_name} ({device.device_ip}:{device.device_port})
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {device.system_stats.cpu_percent}%
                  </Typography>
                  <Box
                    sx={{
                      width: 40,
                      height: 4,
                      backgroundColor: 'grey.300',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(device.system_stats.cpu_percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(device.system_stats.cpu_percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {device.system_stats.memory_percent}%
                  </Typography>
                  <Box
                    sx={{
                      width: 40,
                      height: 4,
                      backgroundColor: 'grey.300',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(device.system_stats.memory_percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(device.system_stats.memory_percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {device.system_stats.disk_percent}%
                  </Typography>
                  <Box
                    sx={{
                      width: 40,
                      height: 4,
                      backgroundColor: 'grey.300',
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(device.system_stats.disk_percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(device.system_stats.disk_percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
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
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatLastSeen(device.last_seen)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatRegisteredAt(device.registered_at)}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

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
                  <Typography variant="h4">{availableHosts.length}</Typography>
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
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Registered Clients ({availableHosts.length})</Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="grid">
                <Tooltip title="Grid View">
                  <GridViewIcon />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="table">
                <Tooltip title="Table View">
                  <TableViewIcon />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="Refresh Devices">
              <span>
                <IconButton onClick={memoizedFetchHosts} disabled={hostsLoading} size="small">
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {hostsLoading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        {availableHosts.length > 0 ? (
          viewMode === 'grid' ? (
            renderDevicesGrid()
          ) : (
            renderDevicesTable()
          )
        ) : (
          <Box textAlign="center" py={4}>
            <DevicesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="textSecondary" variant="h6" gutterBottom>
              No devices connected
            </Typography>
          </Box>
        )}
      </Paper>

      {/* System Status */}
      <Paper sx={{ p: 1, mt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3} key="api-server">
            <Box display="flex" alignItems="center" gap={1}>
              <SuccessIcon color="success" />
              <Typography>API Server: Online</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} key="database">
            <Box display="flex" alignItems="center" gap={1}>
              <SuccessIcon color="success" />
              <Typography>Database: Connected</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} key="test-runner">
            <Box display="flex" alignItems="center" gap={1}>
              <PendingIcon color="warning" />
              <Typography>Test Runner: Idle</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3} key="scheduler">
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
