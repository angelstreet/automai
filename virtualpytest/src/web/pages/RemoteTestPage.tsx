import { Box, Typography, Paper, Grid } from '@mui/material';
import { useState } from 'react';

import { HDMIStream } from '../components/controller/av/HDMIStream';
import { RemotePanel } from '../components/controller/remote/RemotePanel';
import { Host } from '../types/common/Host_Types';

// Mock host data for testing different device types
const mockHosts: Host[] = [
  {
    id: 'test-android-mobile',
    host_name: 'Test Android Mobile',
    device_model: 'android_mobile',
    status: 'online',
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
    id: 'test-android-tv',
    host_name: 'Test Android TV',
    device_model: 'android_tv',
    status: 'online',
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
    id: 'test-bluetooth',
    host_name: 'Test Bluetooth Remote',
    device_model: 'bluetooth_remote',
    status: 'online',
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
    id: 'test-infrared',
    host_name: 'Test Infrared Remote',
    device_model: 'ir_remote',
    status: 'online',
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
  const [selectedHost, setSelectedHost] = useState<Host>(mockHosts[0]);

  // State to coordinate between HDMIStream and RemotePanel
  const [captureMode, setCaptureMode] = useState<'stream' | 'screenshot' | 'video'>('stream');
  const [streamCollapsed, setStreamCollapsed] = useState<boolean>(true);
  const [streamMinimized, setStreamMinimized] = useState<boolean>(false);

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
            <Grid item key={host.id}>
              <Box
                component="button"
                onClick={() => setSelectedHost(host)}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderColor: selectedHost.id === host.id ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  backgroundColor:
                    selectedHost.id === host.id ? 'primary.light' : 'background.paper',
                  color: selectedHost.id === host.id ? 'primary.contrastText' : 'text.primary',
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
                  {host.device_model}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Current Selection Info */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'info.light' }}>
        <Typography variant="h6" gutterBottom>
          Currently Testing: {selectedHost.host_name}
        </Typography>
        <Typography variant="body2">
          Device Model: <strong>{selectedHost.device_model}</strong>
        </Typography>
        <Typography variant="body2">
          Remote Type: <strong>{selectedHost.controller_configs?.remote?.type || 'None'}</strong>
        </Typography>
        <Typography variant="body2">
          AV Type: <strong>{selectedHost.controller_configs?.av?.type || 'None'}</strong>
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
          <li>No actual device control - just UI testing</li>
        </Typography>
      </Paper>

      {/* Test Components */}
      <Box sx={{ position: 'relative', minHeight: '600px' }}>
        {/* Remote Panel */}
        {selectedHost.controller_configs?.remote && (
          <RemotePanel
            host={selectedHost}
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
            host={selectedHost}
            deviceResolution={{ width: 1920, height: 1080 }}
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
    </Box>
  );
}
