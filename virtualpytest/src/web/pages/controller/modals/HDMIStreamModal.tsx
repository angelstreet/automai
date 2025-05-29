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

interface HDMIStreamModalProps {
  open: boolean;
  onClose: () => void;
}

interface StreamStats {
  stream_url: string;
  is_streaming: boolean;
  uptime_seconds: number;
  frames_received: number;
  bytes_received: number;
  stream_quality: string;
  stream_fps: number;
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  
  // Simulated controller instance (in real implementation, this would be the actual controller)
  const controllerRef = useRef<any>(null);
  
  // Initialize controller when modal opens
  useEffect(() => {
    if (open && !controllerRef.current) {
      // In a real implementation, this would create an actual HDMIStreamController instance
      controllerRef.current = {
        connected: false,
        streaming: false,
        streamUrl: '',
        sshConnection: null,
        stats: {
          stream_url: '',
          is_streaming: false,
          uptime_seconds: 0,
          frames_received: 0,
          bytes_received: 0,
          stream_quality: '1920x1080',
          stream_fps: 30
        }
      };
    }
  }, [open]);

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
        // Update controller state
        if (controllerRef.current) {
          controllerRef.current.connected = true;
          controllerRef.current.streaming = true;
          controllerRef.current.streamUrl = `SSH: ${sshConnectionForm.host_ip}${sshConnectionForm.stream_path}`;
          controllerRef.current.sshConnection = { ...sshConnectionForm };
          controllerRef.current.stats.stream_url = `SSH: ${sshConnectionForm.host_ip}${sshConnectionForm.stream_path}`;
          controllerRef.current.stats.is_streaming = true;
          controllerRef.current.stats.stream_quality = resolution;
          controllerRef.current.stats.stream_fps = fps;
        }
        
        setIsConnected(true);
        setIsStreaming(true);
        console.log('[@component:HDMIStreamModal] SSH connection established successfully');
        
        // Start stats simulation
        startStatsSimulation();
        
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
  
  // Disconnect from stream
  const handleDisconnect = async () => {
    console.log('[@component:HDMIStreamModal] Disconnecting from stream');
    
    // Stop streaming and update controller state
    if (controllerRef.current) {
      // Log connection type for cleanup
      if (controllerRef.current.sshConnection) {
        console.log('[@component:HDMIStreamModal] Closing SSH connection to:', controllerRef.current.sshConnection.host_ip);
        
        // Call backend API to properly close SSH connection
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
      
      controllerRef.current.connected = false;
      controllerRef.current.streaming = false;
      controllerRef.current.streamUrl = '';
      controllerRef.current.sshConnection = null;
      controllerRef.current.stats = {
        stream_url: '',
        is_streaming: false,
        uptime_seconds: 0,
        frames_received: 0,
        bytes_received: 0,
        stream_quality: '1920x1080',
        stream_fps: 30
      };
    }
    
    setIsConnected(false);
    setIsStreaming(false);
    setStreamStats(null);
  };
  
  // Simulate stream statistics
  const startStatsSimulation = () => {
    const updateStats = () => {
      if (controllerRef.current && controllerRef.current.streaming) {
        const stats = controllerRef.current.stats;
        stats.uptime_seconds += 1;
        stats.frames_received += fps;
        stats.bytes_received += Math.floor(Math.random() * 200000) + 50000;
        
        setStreamStats({ ...stats });
        
        // Continue updating
        setTimeout(updateStats, 1000);
      }
    };
    
    setTimeout(updateStats, 1000);
  };
  
  // Handle modal close
  const handleCloseModal = async () => {
    console.log('[@component:HDMIStreamModal] Closing modal and cleaning up session');
    
    // Stop streaming and disconnect if connected
    if (isConnected || isStreaming) {
      console.log('[@component:HDMIStreamModal] Disconnecting active session before closing');
      await handleDisconnect();
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
    setIsStreaming(false);
    setConnectionError(null);
    setStreamStats(null);
    
    // Reset controller reference
    if (controllerRef.current) {
      controllerRef.current = null;
    }
    
    console.log('[@component:HDMIStreamModal] Session cleanup completed');
    onClose();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount - no video player to clean up
    };
  }, []);
  
  // Format bytes for display
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Format uptime for display
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
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
                      helperText="Path to the .m3u8 file on the remote server"
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
                      helperText="Path to the video capture device"
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
            ) : (
              /* Stream Controls & Stats */
              <Box>
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label="Connected" 
                    color="success" 
                    icon={<Settings />} 
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    label="Streaming" 
                    color="primary" 
                    icon={<Videocam />} 
                  />
                </Box>
                
                {streamStats && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Stream Statistics
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Connection:</strong> SSH
                      </Typography>
                      {controllerRef.current?.sshConnection && (
                        <>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>SSH Host:</strong> {controllerRef.current.sshConnection.host_ip}:{controllerRef.current.sshConnection.host_port}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Video Device:</strong> {controllerRef.current.sshConnection.video_device}
                          </Typography>
                        </>
                      )}
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Quality:</strong> {streamStats.stream_quality}@{streamStats.stream_fps}fps
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Uptime:</strong> {formatUptime(streamStats.uptime_seconds)}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Frames:</strong> {streamStats.frames_received.toLocaleString()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Data:</strong> {formatBytes(streamStats.bytes_received)}
                      </Typography>
                    </CardContent>
                  </Card>
                )}
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDisconnect}
                    fullWidth
                  >
                    Disconnect
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
            )}
          </Grid>

          {/* Right Column: Status Display */}
          <Grid item xs={8}>
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              height: '500px',
              border: '1px solid #ccc',
              borderRadius: 1,
              overflow: 'hidden',
              backgroundColor: '#f5f5f5'
            }}>
              {/* Placeholder when not connected */}
              {!isConnected && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5'
                }}>
                  <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                    <Videocam sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">HDMI Stream Configuration</Typography>
                    <Typography>Configure SSH connection and video device for stream capture</Typography>
                  </Box>
                </Box>
              )}
              
              {/* SSH Connection Success Message */}
              {isConnected && controllerRef.current?.sshConnection && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#e8f5e8'
                }}>
                  <Box sx={{ textAlign: 'center', color: 'success.main', p: 3 }}>
                    <Settings sx={{ fontSize: 64, mb: 2 }} />
                    <Typography variant="h6" gutterBottom>SSH Connection Successful!</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Video device: <strong>{controllerRef.current.sshConnection.video_device}</strong>
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Stream output: <strong>{controllerRef.current.sshConnection.stream_path}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The HDMI stream configuration is ready.<br/>
                      This setup can now be used for video capture in your tests.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
} 