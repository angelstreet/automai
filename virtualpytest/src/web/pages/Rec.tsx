import { Computer as ComputerIcon, FilterList as FilterIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Alert,
  Grid,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import React, { useEffect, useState, useMemo } from 'react';

import { RecHostPreview } from '../components/rec/RecHostPreview';
import { useRec } from '../hooks/pages/useRec';

// REC page - directly uses the global HostManagerProvider from App.tsx
// No local HostManagerProvider needed since we only need AV capability filtering
const Rec: React.FC = () => {
  const { avDevices, isLoading, error } = useRec();

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
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Remote Eye Controller
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and control connected devices
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FilterIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle1">Filters</Typography>
          {hasActiveFilters && (
            <Chip
              label="Clear Filters"
              size="small"
              variant="outlined"
              onClick={clearFilters}
              sx={{ ml: 2 }}
            />
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {/* Host Filter */}
          <FormControl sx={{ minWidth: 200 }}>
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Device Model</InputLabel>
            <Select
              value={deviceModelFilter}
              label="Device Model"
              onChange={(e) => setDeviceModelFilter(e.target.value)}
            >
              <MenuItem value="">
                <em>All Device Models</em>
              </MenuItem>
              {uniqueDeviceModels.map((deviceModel) => (
                <MenuItem key={deviceModel} value={deviceModel}>
                  {deviceModel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Filter Results Summary */}
        {hasActiveFilters && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredDevices.length} of {avDevices.length} devices
              {hostFilter && (
                <Chip
                  label={`Host: ${hostFilter}`}
                  size="small"
                  sx={{ ml: 1 }}
                  onDelete={() => setHostFilter('')}
                />
              )}
              {deviceModelFilter && (
                <Chip
                  label={`Model: ${deviceModelFilter}`}
                  size="small"
                  sx={{ ml: 1 }}
                  onDelete={() => setDeviceModelFilter('')}
                />
              )}
            </Typography>
          </Box>
        )}
      </Paper>

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
              <RecHostPreview host={host} device={device} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Rec;
