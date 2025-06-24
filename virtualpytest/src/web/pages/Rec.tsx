import { Computer as ComputerIcon } from '@mui/icons-material';
import { Box, Typography, Alert, Grid, CircularProgress } from '@mui/material';
import React, { useEffect } from 'react';

import { RecHostPreview } from '../components/rec/RecHostPreview';
import { useRec } from '../hooks/pages/useRec';

// REC page - directly uses the global HostManagerProvider from App.tsx
// No local HostManagerProvider needed since we only need AV capability filtering
const Rec: React.FC = () => {
  const { avDevices, isLoading, error } = useRec();

  // Log AV devices count
  useEffect(() => {
    console.log(`[@page:Rec] Found ${avDevices.length} devices with AV capability`);
  }, [avDevices.length]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          AV Devices
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and control connected AV devices
        </Typography>
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
              <RecHostPreview host={host} device={device} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Rec;
