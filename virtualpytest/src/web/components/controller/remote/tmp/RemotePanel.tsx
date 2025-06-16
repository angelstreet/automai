import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Alert,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ExpandMore, ExpandLess, OpenInFull, CloseFullscreen } from '@mui/icons-material';
import { useRemoteConnection } from '../../hooks/remote/useRemoteConnection';
import { RemoteCore } from './RemoteCore';
import { RemoteType, BaseConnectionConfig } from '../../types/remote/remoteTypes';
import { ConnectionForm } from '../../types/remote/types';
import { getConfigurableRemotePanelLayout } from '../../../config/layoutConfig';

interface RemotePanelProps {
  /** The type of remote device */
  remoteType: RemoteType;
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Show/hide screenshot display */
  showScreenshot?: boolean;
  /** Initial collapsed state */
  initialCollapsed?: boolean;
  /** Custom styling */
  sx?: any;
}

export function RemotePanel({
  remoteType,
  connectionConfig,
  showScreenshot = true,
  initialCollapsed = true,
  sx = {},
}: RemotePanelProps) {
  // Panel state
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  // Screenshot UI state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  // Use the generic remote connection hook - single source of truth
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    androidScreenshot,
    handleTakeControl,
    handleReleaseControl,
    handleScreenshot,
    handleRemoteCommand,
    fetchDefaultValues,
    remoteConfig,
    deviceConfig,
  } = useRemoteConnection(remoteType);

  // Get configurable layout from device config
  const panelLayout = getConfigurableRemotePanelLayout(remoteType, remoteConfig);

  // Determine current layout based on collapsed state
  const currentLayout = isCollapsed ? panelLayout.collapsed : panelLayout.expanded;
  const shouldShowScreenshot = isCollapsed
    ? panelLayout.showScreenshotInCollapsed
    : panelLayout.showScreenshotInExpanded;

  // Reset screenshot loading state on mount
  useEffect(() => {
    setIsScreenshotLoading(false);
  }, []);

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (connectionConfig) {
      console.log(`[@component:RemotePanel] Initializing with provided config for ${remoteType}`);
      setConnectionForm({
        host_ip: connectionConfig.host_ip,
        host_port: connectionConfig.host_port || '22',
        host_username: connectionConfig.host_username,
        host_password: connectionConfig.host_password,
        device_ip: connectionConfig.device_ip,
        device_port: connectionConfig.device_port || '5555',
      });
    } else {
      console.log(
        `[@component:RemotePanel] No config provided for ${remoteType}, fetching defaults`,
      );
      fetchDefaultValues();
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm, remoteType]);

  const handleScreenshotClick = async () => {
    if (!deviceConfig?.hasScreenshot) return;

    setIsScreenshotLoading(true);
    setScreenshotError(null);
    try {
      console.log(`[@component:RemotePanel] Taking screenshot for ${remoteType}`);
      await handleScreenshot();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot';
      setScreenshotError(errorMessage);
      console.error(`[@component:RemotePanel] Screenshot failed for ${remoteType}:`, error);
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setConnectionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDisconnect = async () => {
    try {
      // Clear screenshot error when disconnecting
      setScreenshotError(null);
      await handleReleaseControl();
    } catch (error) {
      console.error(`[@component:RemotePanel] Error during disconnect for ${remoteType}:`, error);
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    console.log(
      `[@component:RemotePanel] Toggling panel state to ${!isCollapsed ? 'collapsed' : 'expanded'}`,
    );
  };

  // Build position styles from config
  const positionStyles: any = {
    position: 'fixed',
    zIndex: panelLayout.zIndex,
    width: currentLayout.width,
    height: currentLayout.height,
    backgroundColor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    boxShadow: 3,
    overflow: 'hidden',
    transition: 'all 0.3s ease-in-out',
    ...sx,
  };

  // Add positioning based on config
  if (currentLayout.position.top) positionStyles.top = currentLayout.position.top;
  if (currentLayout.position.bottom) positionStyles.bottom = currentLayout.position.bottom;
  if (currentLayout.position.left) positionStyles.left = currentLayout.position.left;
  if (currentLayout.position.right) positionStyles.right = currentLayout.position.right;

  // Connection status display
  if (!session.connected) {
    // Connection form with collapse/expand toggle
    return (
      <Box sx={positionStyles}>
        {/* Header with toggle button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {deviceConfig?.name || `${remoteType} Remote`}
          </Typography>
          <Tooltip title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}>
            <IconButton size="small" onClick={toggleCollapsed} sx={{ color: 'inherit' }}>
              {isCollapsed ? <OpenInFull fontSize="small" /> : <CloseFullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ p: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
          {connectionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {connectionError}
            </Alert>
          )}

          {!isCollapsed && (
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Connection Settings
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {deviceConfig?.connectionFields.map((field) => (
                  <Grid item xs={12} sm={6} key={field.name}>
                    <TextField
                      fullWidth
                      label={field.label}
                      type={field.type || 'text'}
                      value={connectionForm[field.name as keyof ConnectionForm] || ''}
                      onChange={(e) => handleFormChange(field.name, e.target.value)}
                      size="small"
                    />
                  </Grid>
                ))}
              </Grid>

              <Button
                variant="contained"
                onClick={handleTakeControl}
                disabled={connectionLoading}
                fullWidth
              >
                {connectionLoading ? <CircularProgress size={16} /> : 'Connect'}
              </Button>
            </Paper>
          )}

          {isCollapsed && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="textSecondary" textAlign="center">
                Disconnected
              </Typography>
              <Button
                variant="contained"
                onClick={handleTakeControl}
                disabled={connectionLoading}
                size="small"
                fullWidth
              >
                {connectionLoading ? <CircularProgress size={16} /> : 'Connect'}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Connected state - Responsive layout based on collapsed/expanded state
  return (
    <Box sx={positionStyles}>
      {/* Header with toggle button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'success.main',
          color: 'success.contrastText',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
          {deviceConfig?.name || `${remoteType} Remote`} - Connected
        </Typography>
        <Tooltip title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}>
          <IconButton size="small" onClick={toggleCollapsed} sx={{ color: 'inherit' }}>
            {isCollapsed ? <OpenInFull fontSize="small" /> : <CloseFullscreen fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: isCollapsed ? 'column' : 'row',
          height: 'calc(100% - 48px)',
          overflow: 'hidden',
        }}
      >
        {/* Screenshot Section - Only show if configured and not collapsed or if expanded */}
        {deviceConfig?.hasScreenshot && shouldShowScreenshot && showScreenshot && (
          <Box
            sx={{
              flex: isCollapsed ? 'none' : 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: isCollapsed ? '120px' : '250px',
              maxHeight: isCollapsed ? '120px' : 'none',
            }}
          >
            {screenshotError && (
              <Alert severity="error" sx={{ m: 1 }}>
                {screenshotError}
              </Alert>
            )}

            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                m: 1,
                p: 1,
                border: '2px dashed #ccc',
                borderRadius: 2,
                bgcolor: 'transparent',
                aspectRatio: isCollapsed ? '16/9' : undefined,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
            >
              {androidScreenshot ? (
                <img
                  src={`data:image/png;base64,${androidScreenshot}`}
                  alt={`${deviceConfig.name} Screenshot`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    pointerEvents: 'none',
                  }}
                  draggable={false}
                />
              ) : (
                <Typography variant="body2" color="textSecondary" textAlign="center">
                  {isCollapsed
                    ? 'No Screenshot'
                    : 'Click "Take Screenshot" to capture the current screen'}
                </Typography>
              )}
            </Box>

            <Button
              variant="contained"
              onClick={handleScreenshotClick}
              disabled={isScreenshotLoading}
              fullWidth
              size="small"
              sx={{
                height: '32px',
                m: 1,
              }}
            >
              {isScreenshotLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Taking...</Typography>
                </Box>
              ) : isCollapsed ? (
                'Screenshot'
              ) : (
                'Take Screenshot'
              )}
            </Button>
          </Box>
        )}

        {/* Remote Section */}
        <Box
          sx={{
            flex: isCollapsed
              ? 1
              : deviceConfig?.hasScreenshot && shouldShowScreenshot && showScreenshot
                ? 'none'
                : 1,
            width: isCollapsed
              ? '100%'
              : deviceConfig?.hasScreenshot && shouldShowScreenshot && showScreenshot
                ? '200px'
                : '100%',
            minWidth: isCollapsed ? 'auto' : '200px',
          }}
        >
          <RemoteCore
            remoteType={remoteType}
            isConnected={session.connected}
            remoteConfig={remoteConfig}
            connectionLoading={connectionLoading}
            onCommand={handleRemoteCommand}
            onDisconnect={handleDisconnect}
            style="panel"
            sx={{
              height: '100%',
              '& .MuiButton-root': {
                fontSize: isCollapsed ? '0.7rem' : '0.875rem',
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
