import { Refresh as RefreshIcon, Computer as ComputerIcon } from '@mui/icons-material';
import { Box, Typography, Button, Alert, Grid, CircularProgress } from '@mui/material';
import React, { useEffect, useCallback } from 'react';

import { RecHostPreview } from '../components/rec/RecHostPreview';
import { useRec } from '../hooks/pages/useRec';

// REC page - directly uses the global HostManagerProvider from App.tsx
// No local HostManagerProvider needed since we only need AV capability filtering
const Rec: React.FC = () => {
  const { avDevices, isLoading, error, refreshHosts } = useRec();

  // Handle take screenshot - for RecHostPreview components
  const handleTakeScreenshot = useCallback(async (host: any, deviceId?: string) => {
    try {
      console.log(`[@page:Rec] Taking screenshot for ${host.host_name}:${deviceId || 'device1'}`);

      const response = await fetch('/server/av/take-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: deviceId || 'device1',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.screenshot_url) {
          console.log(`[@page:Rec] Screenshot taken: ${result.screenshot_url}`);
          return result.screenshot_url;
        }
      }

      console.warn(`[@page:Rec] Screenshot failed for ${host.host_name}`);
      return null;
    } catch (error) {
      console.error(`[@page:Rec] Error taking screenshot:`, error);
      return null;
    }
  }, []);

  // Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    console.log('[@page:Rec] Manual refresh triggered');
    await refreshHosts();
  }, [refreshHosts]);

  // Log AV devices count
  useEffect(() => {
    console.log(`[@page:Rec] Found ${avDevices.length} devices with AV capability`);
  }, [avDevices.length]);

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
      ) : (
        <Grid container spacing={2}>
          {avDevices.map(({ host, device }) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${host.host_name}-${device.device_id}`}>
              <RecHostPreview host={host} device={device} takeScreenshot={handleTakeScreenshot} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Rec;
