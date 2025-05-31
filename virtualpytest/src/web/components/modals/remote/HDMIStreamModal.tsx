import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
} from '@mui/material';
import { PlayArrow, Videocam, VolumeUp, Settings, Close as CloseIcon } from '@mui/icons-material';
import { HDMIStreamPanel } from '../../remote/HDMIStreamPanel';

interface HDMIStreamModalProps {
  open: boolean;
  onClose: () => void;
}

interface SSHConnectionForm {
  host_ip: string;
  host_port: string;
  host_username: string;
  host_password: string;
  stream_path: string;
  video_device: string;
}

export function HDMIStreamModal({ open, onClose }: HDMIStreamModalProps) {
  // Stream configuration state
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(30);
  
  // SSH connection form state
  const [sshConnectionForm, setSSHConnectionForm] = useState<SSHConnectionForm>({
    host_ip: '',
    host_port: '22',
    host_username: '',
    host_password: '',
    stream_path: '/path/to/output.m3u8',
    video_device: '/dev/video0',
  });
  
  // Connection and streaming state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
  }, [open]);

  // Fetch default SSH connection values from environment variables
  const fetchDefaultValues = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/hdmi-stream/defaults');
      const result = await response.json();
      
      if (result.success && result.defaults) {
        setSSHConnectionForm(prev => ({
          ...prev,
          host_ip: result.defaults.host_ip || prev.host_ip,
          host_username: result.defaults.host_username || prev.host_username,
          host_password: result.defaults.host_password || prev.host_password,
          host_port: result.defaults.host_port || prev.host_port,
          stream_path: result.defaults.stream_path || prev.stream_path,
          video_device: result.defaults.video_device || prev.video_device,
        }));
        console.log('[@component:HDMIStreamModal] Loaded default SSH connection values');
      }
    } catch (error) {
      console.log('[@component:HDMIStreamModal] Could not load default values:', error);
    }
  };

  // SSH connection
  const handleConnect = async () => {
    if (!sshConnectionForm.host_ip || !sshConnectionForm.host_username || !sshConnectionForm.host_password || !sshConnectionForm.stream_path || !sshConnectionForm.video_device) {
      setConnectionError('Please fill in all SSH connection fields');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[@component:HDMIStreamModal] Connecting via SSH to:', sshConnectionForm.host_ip);
      
      // Use the API to establish SSH connection and configure video capture
      const response = await fetch('http://localhost:5009/api/virtualpytest/hdmi-stream/take-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_ip: sshConnectionForm.host_ip,
          host_username: sshConnectionForm.host_username,
          host_password: sshConnectionForm.host_password,
          host_port: sshConnectionForm.host_port,
          stream_path: sshConnectionForm.stream_path,
          video_device: sshConnectionForm.video_device,
          resolution: resolution,
          fps: fps,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsConnected(true);
        console.log('[@component:HDMIStreamModal] SSH connection established successfully');
      } else {
        setConnectionError(result.error || 'Failed to establish SSH connection');
      }
      
    } catch (error: any) {
      console.error('[@component:HDMIStreamModal] SSH connection failed:', error);
      setConnectionError(error.message || 'Failed to establish SSH connection');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Handle modal close
  const handleCloseModal = async () => {
    console.log('[@component:HDMIStreamModal] Closing modal and cleaning up session');
    
    // Stop streaming and disconnect if connected
    if (isConnected) {
      console.log('[@component:HDMIStreamModal] Disconnecting active session before closing');
      
      try {
        const response = await fetch('http://localhost:5009/api/virtualpytest/hdmi-stream/release-control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const result = await response.json();
        if (result.success) {
          console.log('[@component:HDMIStreamModal] SSH connection released successfully');
        } else {
          console.error('[@component:HDMIStreamModal] Failed to release SSH connection:', result.error);
        }
      } catch (error) {
        console.error('[@component:HDMIStreamModal] Error releasing SSH connection:', error);
      }
    }
    
    // Additional cleanup - reset all states
    setResolution('1920x1080');
    setFps(30);
    setSSHConnectionForm({
      host_ip: '',
      host_port: '22',
      host_username: '',
      host_password: '',
      stream_path: '/path/to/output.m3u8',
      video_device: '/dev/video0',
    });
    setIsConnecting(false);
    setIsConnected(false);
    setConnectionError(null);
    
    console.log('[@component:HDMIStreamModal] Session cleanup completed');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCloseModal} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" component="div">
          HDMI Stream Viewer
        </Typography>
        
        {/* Close button - always visible */}
        <IconButton
          onClick={handleCloseModal}
          size="small"
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Left Column: Stream Configuration & Controls */}
          <Grid item xs={4}>
            {!isConnected ? (
              /* Connection Form */
              <Box>
                {connectionError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {connectionError}
                  </Alert>
                )}

                <Typography variant="subtitle2" gutterBottom>
                  SSH Connection Details
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Host IP"
                      value={sshConnectionForm.host_ip}
                      onChange={(e) => setSSHConnectionForm(prev => ({ ...prev, host_ip: e.target.value }))}
                      size="small"
                      placeholder="192.168.1.100"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="SSH Port"
                      value={sshConnectionForm.host_port}
                      onChange={(e) => setSSHConnectionForm(prev => ({ ...prev, host_port: e.target.value }))}
                      size="small"
                      placeholder="22"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={sshConnectionForm.host_username}
                      onChange={(e) => setSSHConnectionForm(prev => ({ ...prev, host_username: e.target.value }))}
                      size="small"
                      placeholder="user"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={sshConnectionForm.host_password}
                      onChange={(e) => setSSHConnectionForm(prev => ({ ...prev, host_password: e.target.value }))}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Stream File Path"
                      value={sshConnectionForm.stream_path}
                      onChange={(e) => setSSHConnectionForm(prev => ({ ...prev, stream_path: e.target.value }))}
                      size="small"
                      placeholder="/path/to/output.m3u8"
                      
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Video Device"
                      value={sshConnectionForm.video_device}
                      onChange={(e) => setSSHConnectionForm(prev => ({ ...prev, video_device: e.target.value }))}
                      size="small"
                      placeholder="/dev/video0"
                     
                    />
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Stream Configuration
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Resolution"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      size="small"
                      placeholder="1920x1080"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="FPS"
                      type="number"
                      value={fps}
                      onChange={(e) => setFps(parseInt(e.target.value) || 30)}
                      size="small"
                      inputProps={{ min: 1, max: 60 }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleConnect}
                    disabled={
                      isConnecting || 
                      (!sshConnectionForm.host_ip || !sshConnectionForm.host_username || !sshConnectionForm.host_password || !sshConnectionForm.stream_path || !sshConnectionForm.video_device)
                    }
                    fullWidth
                    startIcon={isConnecting ? <CircularProgress size={20} /> : <PlayArrow />}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect & Stream'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    onClick={handleCloseModal}
                    fullWidth
                  >
                    Close
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Grid>

          {/* Right Column: Stream Panel */}
          <Grid item xs={8}>
            {!isConnected ? (
              /* Placeholder when not connected */
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                height: '500px',
                border: '1px solid #ccc',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  <Videocam sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6">HDMI Stream Configuration</Typography>
                  <Typography>Configure SSH connection and video device for stream capture</Typography>
                </Box>
              </Box>
            ) : (
              /* Connected - Show Stream Panel */
              <HDMIStreamPanel
                connectionConfig={{
                  host_ip: sshConnectionForm.host_ip,
                  host_port: sshConnectionForm.host_port,
                  host_username: sshConnectionForm.host_username,
                  host_password: sshConnectionForm.host_password,
                  stream_path: sshConnectionForm.stream_path,
                  video_device: sshConnectionForm.video_device,
                  resolution: resolution,
                  fps: fps,
                }}
                autoConnect={true} // Auto-connect since connection already established
                compact={false} // Full modal mode
                sx={{ height: '500px' }}
              />
            )}
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
} 