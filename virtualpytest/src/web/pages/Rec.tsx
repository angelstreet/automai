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
import { HostManagerProvider } from '../contexts/DeviceControlContext';

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
                  {host.host_name} - {device.device_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {device.device_model} • {device.device_ip}:{device.device_port}
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
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  // Loading state
  if (isLoading && hosts.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Loading AV hosts...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EyeIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Remote Eye Controller
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Auto-refresh indicator */}
            <Chip
              icon={<ComputerIcon />}
              label={`${hosts.length} hosts - ${avDevices.length} AV devices`}
              color="primary"
              variant="outlined"
            />

            <Chip
              label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              color={autoRefresh ? 'success' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              sx={{ cursor: 'pointer' }}
            />

            {/* Manual refresh button */}
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>

            {/* View mode toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
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

        <Typography variant="body1" color="text.secondary">
          Real-time monitoring of AV captures from connected hosts. Screenshots refresh
          automatically every second.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => window.location.reload()}>
          {error}
        </Alert>
      )}

      {/* No devices message */}
      {!isLoading && avDevices.length === 0 && !error && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40vh',
            textAlign: 'center',
          }}
        >
          <ComputerIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No AV-capable devices found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connect devices with AV capabilities or check your network connection.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleManualRefresh}
            size="large"
          >
            Refresh Devices
          </Button>
        </Box>
      )}

      {/* Device Grid/Table */}
      {!isLoading && avDevices.length > 0 && (
        <Box sx={{ mt: 3 }}>{viewMode === 'grid' ? renderGridView() : renderTableView()}</Box>
      )}
    </Box>
  );
};

// Wrapper component that provides HostManagerContext
const Rec: React.FC = () => {
  return (
    <HostManagerProvider>
      <RecContent />
    </HostManagerProvider>
  );
};

export default Rec;
