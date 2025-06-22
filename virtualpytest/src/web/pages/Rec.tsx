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
import {
  Refresh as RefreshIcon,
  GridView as GridViewIcon,
  TableRows as TableViewIcon,
  Videocam as VideocamIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useCallback } from 'react';

import { useRec } from '../hooks/pages/useRec';
import { RecHostPreview } from '../components/rec/RecHostPreview';
import { Host } from '../types/common/Host_Types';

type ViewMode = 'grid' | 'table';

const Rec: React.FC = () => {
  const { hosts, isLoading, error, refreshHosts, takeScreenshot } = useRec();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreenHost, setFullscreenHost] = useState<Host | null>(null);

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

  // Handle fullscreen view
  const handleFullscreen = (host: Host) => {
    console.log(`[@page:Rec] Opening fullscreen view for host: ${host.host_name}`);
    setFullscreenHost(host);
    // TODO: Implement fullscreen modal or navigation to dedicated viewer
  };

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
    console.log(`[@page:Rec] Auto-refresh ${!autoRefresh ? 'enabled' : 'disabled'}`);
  };

  // Render grid view
  const renderGridView = () => (
    <Grid container spacing={2}>
      {hosts.map((host) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={host.host_name}>
          <RecHostPreview
            host={host}
            takeScreenshot={takeScreenshot}
            onFullscreen={handleFullscreen}
            autoRefresh={autoRefresh}
            refreshInterval={1000}
          />
        </Grid>
      ))}
    </Grid>
  );

  // Render table view (simplified for now)
  const renderTableView = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Table View
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Table view implementation coming soon...
      </Typography>
      {/* TODO: Implement table view with smaller previews */}
    </Paper>
  );

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
            <VideocamIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              AV Capture Monitoring
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Auto-refresh indicator */}
            <Chip
              icon={<ComputerIcon />}
              label={`${hosts.length} hosts`}
              color="primary"
              variant="outlined"
            />

            <Chip
              label={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              color={autoRefresh ? 'success' : 'default'}
              onClick={handleAutoRefreshToggle}
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

      {/* No hosts message */}
      {!isLoading && hosts.length === 0 && !error && (
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
            No AV-capable hosts found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Make sure you have hosts connected with AV controller capabilities.
          </Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleManualRefresh}>
            Refresh Hosts
          </Button>
        </Box>
      )}

      {/* Content */}
      {hosts.length > 0 && <Box>{viewMode === 'grid' ? renderGridView() : renderTableView()}</Box>}

      {/* Fullscreen Modal - TODO: Implement */}
      {fullscreenHost && (
        <Box>
          {/* TODO: Implement fullscreen modal or navigation */}
          <Typography variant="body2">
            Fullscreen view for {fullscreenHost.host_name} - Coming soon
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Rec;
