import {
  Refresh as RefreshIcon,
  GridView as GridViewIcon,
  TableRows as TableViewIcon,
  Visibility as EyeIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  Alert,
  Grid,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Chip,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { RecHostPreview } from '../components/rec/RecHostPreview';
import { useRec } from '../hooks/pages/useRec';
import { HostManagerProvider } from '../contexts/HostManagerProvider';

type ViewMode = 'grid' | 'table';

// Inner component that uses the useRec hook
const RecContent: React.FC = () => {
  const { hosts, isLoading, error, refreshHosts, takeScreenshot } = useRec();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh hosts every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        console.log('[@page:Rec] Auto-refreshing hosts list');
        refreshHosts();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshHosts]);

  // Handle view mode change
  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newViewMode: ViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      console.log(`[@page:Rec] View mode changed to ${newViewMode}`);
    }
  };

  // Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    console.log('[@page:Rec] Manual refresh triggered');
    await refreshHosts();
  }, [refreshHosts]);

  // Memoize AV devices calculation to prevent repetitive logging
  const avDevices = useMemo(() => {
    const devices: Array<{ host: any; device: any }> = [];

    hosts.forEach((host) => {
      if (host.devices && host.devices.length > 0) {
        // Filter devices that have AV capability (hdmi_stream)
        host.devices.forEach((device) => {
          if (device.capabilities?.av === 'hdmi_stream') {
            devices.push({ host, device });
          }
        });
      }
    });

    // Only log when the count actually changes
    console.log(`[@page:Rec] Found ${devices.length} devices with AV capability`);
    return devices;
  }, [hosts]);

  // Render grid view - now shows individual devices
  const renderGridView = () => {
    return (
      <Grid container spacing={2}>
        {avDevices.map(({ host, device }) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={`${host.host_name}-${device.device_id}`}>
            <RecHostPreview
              host={host}
              device={device}
              takeScreenshot={takeScreenshot}
              autoRefresh={autoRefresh}
              refreshInterval={15000} // Increase interval to reduce load
            />
          </Grid>
        ))}
      </Grid>
    );
  };

  // Render table view (simplified for now)
  const renderTableView = () => {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          AV Devices ({avDevices.length})
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {avDevices.map(({ host, device }) => (
            <Box
              key={`${host.host_name}-${device.device_id}`}
              sx={{
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="body1" fontWeight="bold">
                  {host.host_name} - {device.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {device.model} • {device.device_ip}:{device.device_port}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={host.status}
                  size="small"
                  color={host.status === 'online' ? 'success' : 'error'}
                  variant="outlined"
                />
                <Chip
                  label={`AV: ${host.avStatus}`}
                  size="small"
                  color={host.avStatus === 'online' ? 'success' : 'error'}
                  variant="outlined"
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EyeIcon />}
                  onClick={() => takeScreenshot(host, device.device_id)}
                >
                  Screenshot
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" gutterBottom>
            AV Devices
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and control connected AV devices
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="grid" aria-label="grid view">
              <GridViewIcon />
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <TableViewIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
          }}
        >
          <CircularProgress />
        </Box>
      ) : avDevices.length === 0 ? (
        <Alert severity="info" icon={<ComputerIcon />}>
          No AV devices found. Make sure your devices are connected and have AV capabilities.
        </Alert>
      ) : viewMode === 'grid' ? (
        renderGridView()
      ) : (
        renderTableView()
      )}
    </Box>
  );
};

// Main Rec component that wraps RecContent with HostManagerProvider
const Rec: React.FC = () => {
  return (
    <HostManagerProvider>
      <RecContent />
    </HostManagerProvider>
  );
};

export default Rec;
