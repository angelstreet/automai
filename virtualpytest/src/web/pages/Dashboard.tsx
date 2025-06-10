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
  ViewModule as GridViewIcon,
  TableRows as TableViewIcon,
  Refresh as RefreshIcon,
  BugReport as DebugIcon,
  Terminal as TerminalIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { TestCase, Campaign, Tree } from '../types';
import { useRegistration } from '../contexts/RegistrationContext';

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
  system_stats: {
    cpu: {
      percent: number;
    };
    memory: {
      percent: number;
      used_gb: number;
      total_gb: number;
    };
    disk: {
      percent: number;
      used_gb: number;
      total_gb: number;
    };
    timestamp: number;
    error?: string;
  };
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: 'frontend' | 'backend';
  message: string;
  details?: any;
}

type ViewMode = 'grid' | 'table';
type LogLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
type LogSource = 'all' | 'frontend' | 'backend';

const Dashboard: React.FC = () => {
  const { 
    buildServerUrl,
    buildApiUrl, 
    availableHosts, 
    fetchHosts, 
    isLoading: hostsLoading, 
    error: hostsError 
  } = useRegistration();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    testCases: 0,
    campaigns: 0,
    trees: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Debug logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<LogLevel>('all');
  const [logSource, setLogSource] = useState<LogSource>('all');
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchHosts(); // Use centralized host fetching
    // Set up auto-refresh for hosts every 30 seconds
    const interval = setInterval(fetchHosts, 30000);
    return () => clearInterval(interval);
  }, [fetchHosts]);

  // Auto-refresh logs
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefreshLogs) {
      interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefreshLogs]);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [campaignsResponse, testCasesResponse] = await Promise.all([
        fetch(buildServerUrl('/server/campaigns')),
        fetch(buildServerUrl('/server/test/cases')),
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

      if (treesRes.ok) {
        const treesResponse = await treesRes.json();
        // The navigation API returns { success: true, data: [...] }
        if (treesResponse.success && treesResponse.data) {
          trees = treesResponse.data;
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
      
    } catch (err) {
      setError('Failed to fetch dashboard data');
      addFrontendLog('error', 'Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      
      // Fetch backend logs
      const backendLogsRes = await fetch(buildApiUrl('/server/system/logs'));
      
      if (backendLogsRes.ok) {
        const backendLogs = await backendLogsRes.json();
        
        // Convert backend logs to our format
        const formattedBackendLogs: LogEntry[] = backendLogs.map((log: any) => ({
          timestamp: log.timestamp || new Date().toISOString(),
          level: log.level || 'info',
          source: 'backend' as const,
          message: log.message || log.msg || 'Unknown message',
          details: log.details || log.data,
        }));

        // Get frontend logs from console (if available)
        const frontendLogs = getFrontendLogs();
        
        // Combine and sort logs by timestamp
        const allLogs = [...formattedBackendLogs, ...frontendLogs]
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(-100); // Keep only last 100 logs

        setLogs(allLogs);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      addFrontendLog('error', 'Failed to fetch server logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const getFrontendLogs = (): LogEntry[] => {
    // This would ideally capture console logs, but for now return stored frontend logs
    return logs.filter(log => log.source === 'frontend');
  };

  const addFrontendLog = (level: LogEntry['level'], message: string, details?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source: 'frontend',
      message,
      details,
    };
    
    setLogs(prevLogs => [...prevLogs.slice(-99), newLog]); // Keep only last 100 logs
  };

  const clearLogs = () => {
    setLogs([]);
    addFrontendLog('info', 'Logs cleared by user');
  };

  const downloadLogs = () => {
    const logsText = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}${log.details ? '\n' + JSON.stringify(log.details, null, 2) : ''}`
    ).join('\n\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `virtualpytest-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addFrontendLog('info', 'Logs downloaded by user');
  };

  const filteredLogs = logs.filter(log => {
    const levelMatch = logFilter === 'all' || log.level === logFilter;
    const sourceMatch = logSource === 'all' || log.source === logSource;
    const searchMatch = logSearch === '' || 
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(logSearch.toLowerCase()));
    
    return levelMatch && sourceMatch && searchMatch;
  });

  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: ViewMode,
  ) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      addFrontendLog('info', `View mode changed to ${newViewMode}`);
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

  const getLogLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      default:
        return 'default';
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

  const formatLogTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return 'Invalid time';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    if (percentage >= 50) return 'info';
    return 'success';
  };

  const SystemStatsDisplay: React.FC<{ stats: ConnectedDevice['system_stats'] }> = ({ stats: systemStats }) => {
    if (systemStats.error) {
      return (
        <Box>
          <Typography variant="caption" color="error">
            Stats unavailable: {systemStats.error}
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
            {systemStats.cpu.percent}%
          </Typography>
        </Box>
        <Box 
          sx={{ 
            width: '100%', 
            height: 4, 
            backgroundColor: 'grey.300', 
            borderRadius: 1,
            mb: 1
          }}
        >
          <Box
            sx={{
              width: `${Math.min(systemStats.cpu.percent, 100)}%`,
              height: '100%',
              backgroundColor: `${getUsageColor(systemStats.cpu.percent)}.main`,
              borderRadius: 1,
            }}
          />
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="textSecondary">
            RAM
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.memory.percent}% ({systemStats.memory.used_gb}GB/{systemStats.memory.total_gb}GB)
          </Typography>
        </Box>
        <Box 
          sx={{ 
            width: '100%', 
            height: 4, 
            backgroundColor: 'grey.300', 
            borderRadius: 1,
            mb: 1
          }}
        >
          <Box
            sx={{
              width: `${Math.min(systemStats.memory.percent, 100)}%`,
              height: '100%',
              backgroundColor: `${getUsageColor(systemStats.memory.percent)}.main`,
              borderRadius: 1,
            }}
          />
        </Box>

        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Typography variant="caption" color="textSecondary">
            Disk
          </Typography>
          <Typography variant="caption" fontWeight="bold">
            {systemStats.disk.percent}% ({systemStats.disk.used_gb}GB/{systemStats.disk.total_gb}GB)
          </Typography>
        </Box>
        <Box 
          sx={{ 
            width: '100%', 
            height: 4, 
            backgroundColor: 'grey.300', 
            borderRadius: 1,
            mb: 1
          }}
        >
          <Box
            sx={{
              width: `${Math.min(systemStats.disk.percent, 100)}%`,
              height: '100%',
              backgroundColor: `${getUsageColor(systemStats.disk.percent)}.main`,
              borderRadius: 1,
            }}
          />
        </Box>

        <Typography variant="caption" color="textSecondary">
          Updated: {formatLastSeen(systemStats.timestamp)}
        </Typography>
      </Box>
    );
  };

  const renderDevicesGrid = () => (
    <Grid container spacing={2}>
      {availableHosts.map((device) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={device.client_id}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  {getDeviceIcon(device.device_model)}
                  <Typography variant="h6" component="div" noWrap>
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
                Local IP: {device.local_ip}:{device.client_port}
              </Typography>
              
              <Typography color="textSecondary" variant="body2" gutterBottom>
                Public IP: {device.public_ip}
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
                <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
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
            <TableCell>Device</TableCell>
            <TableCell>Model</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Local IP</TableCell>
            <TableCell>Public IP</TableCell>
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
            <TableRow key={device.client_id} hover>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  {getDeviceIcon(device.device_model)}
                  <Typography variant="body2">{device.name}</Typography>
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
                  {device.local_ip}:{device.client_port}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {device.public_ip}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {device.system_stats.cpu.percent}%
                  </Typography>
                  <Box 
                    sx={{ 
                      width: 40, 
                      height: 4, 
                      backgroundColor: 'grey.300', 
                      borderRadius: 1
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(device.system_stats.cpu.percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(device.system_stats.cpu.percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {device.system_stats.memory.percent}%
                  </Typography>
                  <Box 
                    sx={{ 
                      width: 40, 
                      height: 4, 
                      backgroundColor: 'grey.300', 
                      borderRadius: 1
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(device.system_stats.memory.percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(device.system_stats.memory.percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {device.system_stats.memory.used_gb}GB/{device.system_stats.memory.total_gb}GB
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {device.system_stats.disk.percent}%
                  </Typography>
                  <Box 
                    sx={{ 
                      width: 40, 
                      height: 4, 
                      backgroundColor: 'grey.300', 
                      borderRadius: 1
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(device.system_stats.disk.percent, 100)}%`,
                        height: '100%',
                        backgroundColor: `${getUsageColor(device.system_stats.disk.percent)}.main`,
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {device.system_stats.disk.used_gb}GB/{device.system_stats.disk.total_gb}GB
                </Typography>
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
                <Typography variant="body2">
                  {formatLastSeen(device.last_seen)}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatRegisteredAt(device.registered_at)}
                </Typography>
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
          <Typography variant="h6">
            Registered Clients ({availableHosts.length})
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
            <Tooltip title="Refresh Devices">
              <IconButton 
                onClick={fetchHosts} 
                disabled={hostsLoading}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {hostsLoading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {availableHosts.length > 0 ? (
          viewMode === 'grid' ? renderDevicesGrid() : renderDevicesTable()
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
