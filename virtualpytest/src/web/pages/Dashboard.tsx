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
  ExpandMore as ExpandMoreIcon,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useHostManager } from '../hooks/useHostManager';
import { TestCase, Campaign, Tree } from '../types';
import { Host } from '../types/common/Host_Types';
import { DashboardStats, RecentActivity, ViewMode } from '../types/pages/Dashboard_Types';

const Dashboard: React.FC = () => {
  const { getAllHosts } = useHostManager();
  const availableHosts = useMemo(() => getAllHosts(), [getAllHosts]);
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
        fetch('/server/navigationTrees/getAllTrees'), // Use relative URL for navigation requests
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

  useEffect(() => {
    fetchDashboardData();
    // Hosts are automatically updated via HostManagerContext
    // Set up auto-refresh for dashboard data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

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
        <Typography variant="caption" color="error">
          No system stats available
        </Typography>
      );
    }

    if (systemStats.error) {
      return (
        <Typography variant="caption" color="error">
          {systemStats.error}
        </Typography>
      );
    }

    return (
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        {/* CPU */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography variant="caption" color="textSecondary">
            CPU:
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.cpu_percent}%
          </Typography>
          <Box sx={{ width: 30, height: 3, backgroundColor: 'grey.300', borderRadius: 1 }}>
            <Box
              sx={{
                width: `${Math.min(systemStats.cpu_percent, 100)}%`,
                height: '100%',
                backgroundColor: `${getUsageColor(systemStats.cpu_percent)}.main`,
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>

        {/* Memory */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography variant="caption" color="textSecondary">
            RAM:
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.memory_percent}%
          </Typography>
          <Box sx={{ width: 30, height: 3, backgroundColor: 'grey.300', borderRadius: 1 }}>
            <Box
              sx={{
                width: `${Math.min(systemStats.memory_percent, 100)}%`,
                height: '100%',
                backgroundColor: `${getUsageColor(systemStats.memory_percent)}.main`,
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>

        {/* Disk */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Typography variant="caption" color="textSecondary">
            Disk:
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.disk_percent}%
          </Typography>
          <Box sx={{ width: 30, height: 3, backgroundColor: 'grey.300', borderRadius: 1 }}>
            <Box
              sx={{
                width: `${Math.min(systemStats.disk_percent, 100)}%`,
                height: '100%',
                backgroundColor: `${getUsageColor(systemStats.disk_percent)}.main`,
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>
      </Box>
    );
  };

  const renderDevicesGrid = () => (
    <Grid container spacing={2}>
      {availableHosts.map((host) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={host.host_name}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Host Header */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ComputerIcon color="primary" />
                  <Typography variant="h6" component="div" noWrap>
                    {host.host_name}
                  </Typography>
                  <Chip
                    label={`${host.device_count} device${host.device_count > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
                <Chip
                  label={host.status}
                  size="small"
                  color={host.status === 'online' ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>

              <Typography color="textSecondary" variant="body2" gutterBottom>
                {host.host_url}
              </Typography>

              {/* System Stats - Compact */}
              <Box sx={{ mb: 1.5 }}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 0.5 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    System Stats
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {host.system_stats?.platform} ({host.system_stats?.architecture})
                  </Typography>
                </Box>
                <SystemStatsDisplay stats={host.system_stats} />
              </Box>

              {/* Devices - Collapsible Accordion */}
              <Accordion
                sx={{
                  mb: 1.5,
                  boxShadow: 'none',
                  border: '1px solid #e0e0e0',
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{ minHeight: '36px', '& .MuiAccordionSummary-content': { margin: '6px 0' } }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Devices ({host.device_count})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 0.5, px: 1 }}>
                  <Box sx={{ maxHeight: '150px', overflowY: 'auto', overflowX: 'hidden' }}>
                    {host.devices.map((device) => (
                      <Box
                        key={device.device_id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 0.2,
                          px: 0,
                          borderRadius: 1,
                          '&:hover': { backgroundColor: 'grey.100' },
                        }}
                      >
                        {getDeviceIcon(device.model)}
                        <Typography
                          variant="body2"
                          sx={{ minWidth: '70px', fontWeight: 500, fontSize: '0.8rem' }}
                        >
                          {device.name}
                        </Typography>
                        <Chip
                          label={device.model}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem', height: '18px' }}
                        />
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ ml: 'auto', fontFamily: 'monospace', fontSize: '0.7rem' }}
                        >
                          {device.device_ip}:{device.device_port}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>

              <Typography color="textSecondary" variant="caption" display="block">
                Last seen: {formatLastSeen(host.last_seen)}
              </Typography>

              <Typography color="textSecondary" variant="caption" display="block">
                Registered: {formatRegisteredAt(host.registered_at)}
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
            <TableCell>Devices</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Host URL</TableCell>
            <TableCell>CPU</TableCell>
            <TableCell>RAM</TableCell>
            <TableCell>Disk</TableCell>
            <TableCell>Last Seen</TableCell>
            <TableCell>Registered</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {availableHosts.map((host) => (
            <TableRow
              key={host.host_name}
              hover
              sx={{
                '&:hover': {
                  backgroundColor: 'transparent !important',
                },
              }}
            >
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <ComputerIcon color="primary" />
                  <Typography variant="body2">{host.host_name}</Typography>
                  <Chip
                    label={`${host.device_count} device${host.device_count > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  {host.devices.map((device) => (
                    <Box key={device.device_id} display="flex" alignItems="center" gap={1} mb={0.5}>
                      {getDeviceIcon(device.model)}
                      <Typography variant="body2" fontFamily="monospace">
                        {device.name} ({device.device_ip}:{device.device_port})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={host.status}
                  size="small"
                  color={host.status === 'online' ? 'success' : 'error'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {host.host_url}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {host.system_stats.cpu_percent}%
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
                        width: `${Math.min(host.system_stats.cpu_percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(host.system_stats.cpu_percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {host.system_stats.memory_percent}%
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
                        width: `${Math.min(host.system_stats.memory_percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(host.system_stats.memory_percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {host.system_stats.disk_percent}%
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
                        width: `${Math.min(host.system_stats.disk_percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(host.system_stats.disk_percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatLastSeen(host.last_seen)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatRegisteredAt(host.registered_at)}</Typography>
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
                  <Typography variant="h4">
                    {availableHosts.reduce((total, host) => total + (host.device_count || 0), 0)}
                  </Typography>
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
          <Typography variant="h6">
            Registered Hosts ({availableHosts.length}) -{' '}
            {availableHosts.reduce((total, host) => total + (host.device_count || 0), 0)} Devices
          </Typography>
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
            <Tooltip title="Hosts automatically refresh">
              <span>
                <IconButton disabled size="small">
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

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
              No hosts connected
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
