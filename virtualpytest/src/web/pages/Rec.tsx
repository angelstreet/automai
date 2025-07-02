import { Computer as ComputerIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Alert,
  Grid,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import React, { useEffect, useState, useMemo } from 'react';

import { RecHostPreview } from '../components/rec/RecHostPreview';
import { ModalProvider } from '../contexts/ModalContext';
import { useRec } from '../hooks/pages/useRec';

// REC page - directly uses the global HostManagerProvider from App.tsx
// No local HostManagerProvider needed since we only need AV capability filtering
const RecContent: React.FC = () => {
  const {
    avDevices,
    isLoading,
    error,
    initializeBaseUrl,
    generateThumbnailUrl,
    restartStreams,
    isRestarting,
  } = useRec();

  // Filter states
  const [hostFilter, setHostFilter] = useState<string>('');
  const [deviceModelFilter, setDeviceModelFilter] = useState<string>('');

  // Get unique host names and device models for filter dropdowns
  const { uniqueHosts, uniqueDeviceModels } = useMemo(() => {
    const hosts = new Set<string>();
    const deviceModels = new Set<string>();

    avDevices.forEach(({ host, device }) => {
      hosts.add(host.host_name);
      if (device.device_model) {
        deviceModels.add(device.device_model);
      }
    });

    return {
      uniqueHosts: Array.from(hosts).sort(),
      uniqueDeviceModels: Array.from(deviceModels).sort(),
    };
  }, [avDevices]);

  // Filter devices based on selected filters
  const filteredDevices = useMemo(() => {
    return avDevices.filter(({ host, device }) => {
      const matchesHost = !hostFilter || host.host_name === hostFilter;
      const matchesDeviceModel = !deviceModelFilter || device.device_model === deviceModelFilter;

      return matchesHost && matchesDeviceModel;
    });
  }, [avDevices, hostFilter, deviceModelFilter]);

  // Clear filters
  const clearFilters = () => {
    setHostFilter('');
    setDeviceModelFilter('');
  };

  // Log AV devices count
  useEffect(() => {
    console.log(`[@page:Rec] Found ${avDevices.length} devices with AV capability`);
    console.log(`[@page:Rec] Filtered to ${filteredDevices.length} devices`);
  }, [avDevices.length, filteredDevices.length]);

  const hasActiveFilters = hostFilter || deviceModelFilter;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with integrated filters */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Left side - Title and description */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Remote Eye Controller
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and control connected devices
            {hasActiveFilters && (
              <span>
                {' '}
                • Showing {filteredDevices.length} of {avDevices.length} devices
              </span>
            )}
          </Typography>
        </Box>

        {/* Right side - Restart button and compact filters */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {/* Restart Streams Button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={isRestarting ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={restartStreams}
            disabled={isRestarting || avDevices.length === 0}
            sx={{ height: 32, minWidth: 120 }}
          >
            {isRestarting ? 'Restarting...' : 'Restart'}
          </Button>

          {/* Host Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Host</InputLabel>
            <Select value={hostFilter} label="Host" onChange={(e) => setHostFilter(e.target.value)}>
              <MenuItem value="">
                <em>All Hosts</em>
              </MenuItem>
              {uniqueHosts.map((hostName) => (
                <MenuItem key={hostName} value={hostName}>
                  {hostName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Device Model Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={deviceModelFilter}
              label="Model"
              onChange={(e) => setDeviceModelFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>All Models</em>
              </MenuItem>
              {uniqueDeviceModels.map((deviceModel) => (
                <MenuItem key={deviceModel} value={deviceModel}>
                  {deviceModel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear filters chip */}
          {hasActiveFilters && (
            <Chip
              label="Clear"
              size="small"
              variant="outlined"
              onClick={clearFilters}
              sx={{ height: 32 }}
            />
          )}
        </Stack>
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
      ) : filteredDevices.length === 0 ? (
        <Alert severity="info" icon={<ComputerIcon />}>
          {hasActiveFilters
            ? 'No devices match the selected filters. Try adjusting your filter criteria.'
            : 'No AV devices found. Make sure your devices are connected and have AV capabilities.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredDevices.map(({ host, device }) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${host.host_name}-${device.device_id}`}>
              <RecHostPreview
                host={host}
                device={device}
                initializeBaseUrl={initializeBaseUrl}
                generateThumbnailUrl={generateThumbnailUrl}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

const Rec: React.FC = () => {
  return (
    <ModalProvider>
      <RecContent />
    </ModalProvider>
  );
};

export default Rec;
