import { Box, Typography, Paper, Grid, Switch, FormControlLabel } from '@mui/material';
import { useState, useMemo } from 'react';

import { HDMIStream } from '../components/controller/av/HDMIStream';
import { RemotePanel } from '../components/controller/remote/RemotePanel';
import { Host } from '../types/common/Host_Types';

// Extended Host type to include controller_configs used in the components
interface TestHost extends Host {
  controller_configs?: {
    remote?: {
      implementation: string;
      type: string;
      parameters: any;
    };
    av?: {
      implementation: string;
      type: string;
      parameters: any;
    };
    [key: string]: any; // Allow indexing with string keys
  };
}

// Mock host data for testing different device types
const mockHosts: TestHost[] = [
  {
    host_name: 'Test Android Mobile',
    description: 'Android Mobile Test Device',
    host_url: 'http://localhost:6109',
    host_port: 6109,
    devices: [
      {
        device_id: 'device1',
        device_name: 'Android Mobile',
        device_model: 'android_mobile',
        device_capabilities: {
          av: 'hdmi_stream',
          remote: 'android_mobile',
        },
      },
    ],
    device_count: 1,
    status: 'online',
    last_seen: Date.now(),
    registered_at: new Date().toISOString(),
    system_stats: {
      cpu_percent: 10,
      memory_percent: 30,
      disk_percent: 50,
      platform: 'linux',
      architecture: 'x64',
      python_version: '3.9.0',
    },
    isLocked: false,
    controller_configs: {
      remote: {
        implementation: 'android_mobile',
        type: 'android_mobile',
        parameters: {},
      },
      av: {
        implementation: 'hdmi_stream',
        type: 'hdmi_stream',
        parameters: {},
      },
    },
  },
  {
    host_name: 'Test Android TV',
    description: 'Android TV Test Device',
    host_url: 'http://localhost:6109',
    host_port: 6109,
    devices: [
      {
        device_id: 'device1',
        device_name: 'Android TV',
        device_model: 'android_tv',
        device_capabilities: {
          av: 'hdmi_stream',
          remote: 'android_tv',
        },
      },
    ],
    device_count: 1,
    status: 'online',
    last_seen: Date.now(),
    registered_at: new Date().toISOString(),
    system_stats: {
      cpu_percent: 10,
      memory_percent: 30,
      disk_percent: 50,
      platform: 'linux',
      architecture: 'x64',
      python_version: '3.9.0',
    },
    isLocked: false,
    controller_configs: {
      remote: {
        implementation: 'android_tv',
        type: 'android_tv',
        parameters: {},
      },
      av: {
        implementation: 'hdmi_stream',
        type: 'hdmi_stream',
        parameters: {},
      },
    },
  },
  {
    host_name: 'Test iOS Mobile',
    description: 'iOS Mobile Test Device',
    host_url: 'http://localhost:6109',
    host_port: 6109,
    devices: [
      {
        device_id: 'device1',
        device_name: 'iOS Mobile',
        device_model: 'ios_mobile',
        device_capabilities: {
          av: 'hdmi_stream',
          remote: 'appium_remote',
        },
      },
    ],
    device_count: 1,
    status: 'online',
    last_seen: Date.now(),
    registered_at: new Date().toISOString(),
    system_stats: {
      cpu_percent: 10,
      memory_percent: 30,
      disk_percent: 50,
      platform: 'darwin',
      architecture: 'x64',
      python_version: '3.9.0',
    },
    isLocked: false,
    controller_configs: {
      remote: {
        implementation: 'appium_remote',
        type: 'appium_remote',
        parameters: {
          device_ip: '192.168.8.1',
          device_port: '5555',
          platform_name: 'iOS',
          automation_name: 'XCUITest',
          appium_url: 'http://localhost:4723',
        },
      },
      av: {
        implementation: 'hdmi_stream',
        type: 'hdmi_stream',
        parameters: {},
      },
    },
  },
  {
    host_name: 'Test Bluetooth Remote',
    description: 'Bluetooth Remote Test Device',
    host_url: 'http://localhost:6109',
    host_port: 6109,
    devices: [
      {
        device_id: 'device1',
        device_name: 'Bluetooth Remote',
        device_model: 'bluetooth_remote',
        device_capabilities: {
          av: 'hdmi_stream',
          remote: 'bluetooth_remote',
        },
      },
    ],
    device_count: 1,
    status: 'online',
    last_seen: Date.now(),
    registered_at: new Date().toISOString(),
    system_stats: {
      cpu_percent: 10,
      memory_percent: 30,
      disk_percent: 50,
      platform: 'linux',
      architecture: 'x64',
      python_version: '3.9.0',
    },
    isLocked: false,
    controller_configs: {
      remote: {
        implementation: 'bluetooth_remote',
        type: 'bluetooth_remote',
        parameters: {},
      },
      av: {
        implementation: 'hdmi_stream',
        type: 'hdmi_stream',
        parameters: {},
      },
    },
  },
  {
    host_name: 'Test Infrared Remote',
    description: 'IR Remote Test Device',
    host_url: 'http://localhost:6109',
    host_port: 6109,
    devices: [
      {
        device_id: 'device1',
        device_name: 'IR Remote',
        device_model: 'ir_remote',
        device_capabilities: {
          av: 'hdmi_stream',
          remote: 'ir_remote',
        },
      },
    ],
    device_count: 1,
    status: 'online',
    last_seen: Date.now(),
    registered_at: new Date().toISOString(),
    system_stats: {
      cpu_percent: 10,
      memory_percent: 30,
      disk_percent: 50,
      platform: 'linux',
      architecture: 'x64',
      python_version: '3.9.0',
    },
    isLocked: false,
    controller_configs: {
      remote: {
        implementation: 'ir_remote',
        type: 'ir_remote',
        parameters: {},
      },
      av: {
        implementation: 'hdmi_stream',
        type: 'hdmi_stream',
        parameters: {},
      },
    },
  },
];

export default function RemoteTestPage() {
  const [selectedHost, setSelectedHost] = useState<TestHost>(mockHosts[0]);
  const [useModalLayout, setUseModalLayout] = useState<boolean>(false);
  const [showRemote, setShowRemote] = useState<boolean>(true);

  // State to coordinate between HDMIStream and RemotePanel
  const [captureMode, setCaptureMode] = useState<'stream' | 'screenshot' | 'video'>('stream');
  const [streamCollapsed, setStreamCollapsed] = useState<boolean>(true);
  const [streamMinimized, setStreamMinimized] = useState<boolean>(false);

  // Stable stream container dimensions to prevent re-renders - copied from RecHostStreamModal
  const streamContainerDimensions = useMemo(() => {
    if (!useModalLayout) return undefined;

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Modal dimensions (95vw x 90vh)
    const modalWidth = windowWidth * 0.95;
    const modalHeight = windowHeight * 0.9;

    // Header height
    const headerHeight = 48;

    // Use fixed stream area (assume remote might be shown)
    const streamAreaWidth = modalWidth * 0.75;
    const streamAreaHeight = modalHeight - headerHeight;

    // Modal position (centered)
    const modalX = (windowWidth - modalWidth) / 2;
    const modalY = (windowHeight - modalHeight) / 2;

    // Stream container position
    const streamX = modalX;
    const streamY = modalY + headerHeight;

    return {
      width: Math.round(streamAreaWidth),
      height: Math.round(streamAreaHeight),
      x: Math.round(streamX),
      y: Math.round(streamY),
    };
  }, [useModalLayout]);

  // Stable device resolution to prevent re-renders
  const stableDeviceResolution = useMemo(() => ({ width: 1920, height: 1080 }), []);

  console.log('[@page:RemoteTestPage] Rendering test page with host:', selectedHost.host_name);

  return (
    <Box sx={{ p: 3, minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Typography variant="h4" gutterBottom>
        Remote & AV Stream Testing
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Test different remote configurations and panel layouts without device control
      </Typography>

      {/* Device Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Select Device Type to Test:
        </Typography>
        <Grid container spacing={2}>
          {mockHosts.map((host) => (
            <Grid item key={host.host_name}>
              <Box
                component="button"
                onClick={() => setSelectedHost(host)}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderColor:
                    selectedHost.host_name === host.host_name ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  backgroundColor:
                    selectedHost.host_name === host.host_name
                      ? 'primary.light'
                      : 'background.paper',
                  color:
                    selectedHost.host_name === host.host_name
                      ? 'primary.contrastText'
                      : 'text.primary',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.light',
                  },
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {host.host_name}
                </Typography>
                <Typography variant="caption" display="block">
                  {host.devices[0].device_model}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Modal Layout Toggle */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'warning.light' }}>
        <FormControlLabel
          control={
            <Switch
              checked={useModalLayout}
              onChange={(e) => setUseModalLayout(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" fontWeight="bold">
              Use RecHostStreamModal Layout (button_layout_recmodal)
            </Typography>
          }
        />
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          When enabled, this will simulate the remote layout as it appears in RecHostStreamModal
          using button_layout_recmodal
        </Typography>
      </Paper>

      {/* Remote Toggle */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'info.light' }}>
        <FormControlLabel
          control={
            <Switch
              checked={showRemote}
              onChange={(e) => setShowRemote(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" fontWeight="bold">
              Show Remote Panel
            </Typography>
          }
        />
      </Paper>

      {/* Current Selection Info */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'info.light' }}>
        <Typography variant="h6" gutterBottom>
          Currently Testing: {selectedHost.host_name}
        </Typography>
        <Typography variant="body2">
          Device Model: <strong>{selectedHost.devices[0].device_model}</strong>
        </Typography>
        <Typography variant="body2">
          Remote Type:{' '}
          <strong>
            {(() => {
              if (!selectedHost.controller_configs) return 'None';
              const remoteKey = Object.keys(selectedHost.controller_configs).find((key) =>
                key.startsWith('remote_'),
              );
              return remoteKey
                ? selectedHost.controller_configs[remoteKey]?.implementation || 'Unknown'
                : selectedHost.controller_configs.remote?.implementation || 'None';
            })()}
          </strong>
        </Typography>
        <Typography variant="body2">
          AV Type: <strong>{selectedHost.controller_configs?.av?.type || 'None'}</strong>
        </Typography>
        <Typography variant="body2">
          Layout Mode:{' '}
          <strong>
            {useModalLayout
              ? 'RecHostStreamModal (button_layout_recmodal)'
              : 'Standard (button_layout)'}
          </strong>
        </Typography>
      </Paper>

      {/* Instructions */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'success.light' }}>
        <Typography variant="body2" gutterBottom>
          <strong>Testing Instructions:</strong>
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>Remote panels should appear at bottom-right with device-specific sizing</li>
          <li>AV stream should appear at bottom-left</li>
          <li>Toggle panels between collapsed/expanded states</li>
          <li>Verify positioning and sizing from config files</li>
          <li>
            Toggle "Use RecHostStreamModal Layout" to test button_layout_recmodal configuration
          </li>
          <li>No actual device control - just UI testing</li>
        </Typography>
      </Paper>

      {/* Test Components */}
      {useModalLayout ? (
        // Modal layout - mimic RecHostStreamModal layout
        <Box
          sx={{
            position: 'relative',
            width: '95vw',
            height: '90vh',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 24,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            margin: '0 auto',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1,
              backgroundColor: 'grey.800',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '8px 8px 0 0',
              minHeight: 48,
            }}
          >
            <Typography variant="h6" component="h2">
              {selectedHost.devices[0].device_name || selectedHost.host_name} - Modal Test
            </Typography>
          </Box>

          {/* Main Content */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              backgroundColor: 'black',
              position: 'relative',
            }}
          >
            {/* Stream Viewer */}
            <Box
              sx={{
                width: showRemote ? '75%' : '100%',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'black',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'white',
                }}
              >
                <Typography>Stream area (mock)</Typography>
              </Box>
            </Box>

            {/* Remote Control Panel */}
            {showRemote && (
              <Box
                sx={{
                  width: '25%',
                  backgroundColor: 'background.default',
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <RemotePanel
                  host={selectedHost as any}
                  deviceId="test-device-1"
                  deviceModel={selectedHost.devices[0].device_model}
                  isConnected={true}
                  onReleaseControl={() => console.log('Release control')}
                  initialCollapsed={false}
                  deviceResolution={stableDeviceResolution}
                  streamCollapsed={false}
                  streamMinimized={false}
                  streamContainerDimensions={streamContainerDimensions}
                />
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        // Standard layout
        <Box sx={{ position: 'relative', minHeight: '600px' }}>
          {/* Remote Panel */}
          {showRemote &&
            (() => {
              if (!selectedHost.controller_configs) return false;
              return (
                Object.keys(selectedHost.controller_configs).some((key) =>
                  key.startsWith('remote_'),
                ) || selectedHost.controller_configs.remote !== undefined
              );
            })() && (
              <RemotePanel
                host={selectedHost as any}
                deviceId="test-device-1"
                deviceModel={selectedHost.devices[0].device_model}
                isConnected={true}
                initialCollapsed={true}
                deviceResolution={{ width: 1920, height: 1080 }}
                streamCollapsed={streamCollapsed}
                streamMinimized={streamMinimized}
                captureMode={captureMode}
              />
            )}

          {/* AV Stream */}
          {selectedHost.controller_configs?.av && (
            <HDMIStream
              host={selectedHost as any}
              deviceId="test-device-1"
              deviceModel={selectedHost.devices[0].device_model}
              onCollapsedChange={setStreamCollapsed}
              onMinimizedChange={setStreamMinimized}
              onCaptureModeChange={setCaptureMode}
            />
          )}

          {/* Center message */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              p: 3,
              backgroundColor: 'background.paper',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Testing Area
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Remote and AV panels should appear at screen edges
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This center area represents your main workspace
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
