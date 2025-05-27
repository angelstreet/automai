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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { PlayArrow, Videocam, VolumeUp, Settings } from '@mui/icons-material';

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
}

export function HDMIStreamModal({ open, onClose }: HDMIStreamModalProps) {
  // Connection mode state
  const [connectionMode, setConnectionMode] = useState<'direct' | 'ssh'>('direct');
  
  // Stream configuration state
  const [streamUrl, setStreamUrl] = useState('https://77.56.53.130:444/stream/output.m3u8');
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(30);
  
  // SSH connection form state
  const [sshConnectionForm, setSSHConnectionForm] = useState<SSHConnectionForm>({
    host_ip: '',
    host_port: '22',
    host_username: '',
    host_password: '',
    stream_path: '/path/to/output.m3u8',
  });
  
  // Connection and streaming state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  
  // Video display state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const hlsRef = useRef<any>(null);
  
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
        }));
        console.log('[@component:HDMIStreamModal] Loaded default SSH connection values');
      }
    } catch (error) {
      console.log('[@component:HDMIStreamModal] Could not load default values:', error);
    }
  };

  // Setup HLS stream
  const setupHlsStream = async (streamUrl: string) => {
    try {
      if (!videoRef.current) return;

      // Clean up previous instance if it exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const HLS = (await import('hls.js')).default;

      if (!HLS.isSupported()) {
        // Try native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setIsVideoLoading(false);
            videoRef.current?.play().catch((err) => {
              console.error('[@component:HDMIStreamModal] Autoplay failed:', err);
              setVideoError('Autoplay failed - click to play manually');
            });
          });
        } else {
          setVideoError('HLS is not supported in this browser');
        }
        return;
      }

      const hls = new HLS({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 5,
        liveDurationInfinity: true,
        maxBufferLength: 5,
        maxMaxBufferLength: 10,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        setIsVideoLoading(false);
        videoRef.current?.play().catch((err) => {
          console.error('[@component:HDMIStreamModal] Autoplay failed:', err);
          setVideoError('Autoplay failed - click to play manually');
        });
      });

      // Handle HLS errors
      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          console.error('[@component:HDMIStreamModal] Fatal HLS error:', data.type, data.details);
          setVideoError(`Stream error: ${data.type}`);
        }
      });
    } catch (err) {
      console.error('[@component:HDMIStreamModal] Failed to setup HLS:', err);
      setVideoError('Failed to load video player');
    }
  };

  // Connect to stream
  const handleConnect = async () => {
    if (connectionMode === 'direct') {
      return handleDirectConnect();
    } else {
      return handleSSHConnect();
    }
  };

  // Direct URL connection
  const handleDirectConnect = async () => {
    if (!streamUrl.trim()) {
      setConnectionError('Please enter a valid stream URL');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    setIsVideoLoading(true);
    setVideoError(null);
    
    try {
      console.log('[@component:HDMIStreamModal] Connecting to direct stream:', streamUrl);
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate URL format
      try {
        new URL(streamUrl);
      } catch {
        throw new Error('Invalid URL format');
      }
      
      // Update controller state
      if (controllerRef.current) {
        controllerRef.current.connected = true;
        controllerRef.current.streaming = true;
        controllerRef.current.streamUrl = streamUrl;
        controllerRef.current.stats.stream_url = streamUrl;
        controllerRef.current.stats.is_streaming = true;
        controllerRef.current.stats.stream_quality = resolution;
        controllerRef.current.stats.stream_fps = fps;
      }
      
      setIsConnected(true);
      setIsStreaming(true);
      console.log('[@component:HDMIStreamModal] Connected successfully and starting stream');
      
      // Setup HLS stream
      await setupHlsStream(streamUrl);
      
      // Start stats simulation
      startStatsSimulation();
      
    } catch (error: any) {
      console.error('[@component:HDMIStreamModal] Connection failed:', error);
      setConnectionError(error.message || 'Failed to connect to stream');
      setIsVideoLoading(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // SSH connection
  const handleSSHConnect = async () => {
    if (!sshConnectionForm.host_ip || !sshConnectionForm.host_username || !sshConnectionForm.host_password || !sshConnectionForm.stream_path) {
      setConnectionError('Please fill in all SSH connection fields');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    setIsVideoLoading(true);
    setVideoError(null);
    
    try {
      console.log('[@component:HDMIStreamModal] Connecting via SSH to:', sshConnectionForm.host_ip);
      
      // Use the same API pattern as AndroidMobileModal
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
        setIsVideoLoading(false);
        console.log('[@component:HDMIStreamModal] SSH connection established successfully');
        
        // Start stats simulation
        startStatsSimulation();
        
      } else {
        setConnectionError(result.error || 'Failed to establish SSH connection');
        setIsVideoLoading(false);
      }
      
    } catch (error: any) {
      console.error('[@component:HDMIStreamModal] SSH connection failed:', error);
      setConnectionError(error.message || 'Failed to establish SSH connection');
      setIsVideoLoading(false);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect from stream
  const handleDisconnect = async () => {
    console.log('[@component:HDMIStreamModal] Disconnecting from stream');
    
    // Clean up HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Stop and clear video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
    }
    
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
    setIsVideoLoading(false);
    setStreamStats(null);
    setVideoError(null);
  };
  
  // Stop video streaming
  const handleStopStreaming = async () => {
    console.log('[@component:HDMIStreamModal] Stopping video streaming');
    
    // Clean up HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Update controller state
    if (controllerRef.current) {
      controllerRef.current.streaming = false;
      controllerRef.current.stats.is_streaming = false;
    }
    
    setIsStreaming(false);
    setIsVideoLoading(false);
    
    // Stop video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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
    setConnectionMode('direct');
    setStreamUrl('https://77.56.53.130:444/stream/output.m3u8');
    setResolution('1920x1080');
    setFps(30);
    setSSHConnectionForm({
      host_ip: '',
      host_port: '22',
      host_username: '',
      host_password: '',
      stream_path: '/path/to/output.m3u8',
    });
    setIsConnecting(false);
    setIsConnected(false);
    setIsStreaming(false);
    setConnectionError(null);
    setStreamStats(null);
    setVideoError(null);
    setIsVideoLoading(false);
    
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
      // Cleanup HLS on unmount
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
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
      <DialogTitle>HDMI Stream Viewer</DialogTitle>
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

                {/* Connection Mode Selection */}
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">Connection Type</FormLabel>
                  <RadioGroup
                    row
                    value={connectionMode}
                    onChange={(e) => setConnectionMode(e.target.value as 'direct' | 'ssh')}
                  >
                    <FormControlLabel value="direct" control={<Radio />} label="Direct URL" />
                    <FormControlLabel value="ssh" control={<Radio />} label="SSH Connection" />
                  </RadioGroup>
                </FormControl>

                {connectionMode === 'direct' ? (
                  /* Direct URL Form */
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <TextField
                        fullWidth
                        label="Stream URL"
                        placeholder="https://example.com/stream.m3u8"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        size="small"
                        helperText="Enter HLS, RTSP, or HTTP stream URL"
                      />
                    </Box>
                    
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
                  </Box>
                ) : (
                  /* SSH Connection Form */
                  <Box>
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
                    </Grid>
                    
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
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleConnect}
                    disabled={
                      isConnecting || 
                      (connectionMode === 'direct' && !streamUrl.trim()) ||
                      (connectionMode === 'ssh' && (!sshConnectionForm.host_ip || !sshConnectionForm.host_username || !sshConnectionForm.host_password || !sshConnectionForm.stream_path))
                    }
                    fullWidth
                    startIcon={isConnecting ? <CircularProgress size={20} /> : <PlayArrow />}
                  >
                    {isConnecting ? 
                      (connectionMode === 'ssh' ? 'Connecting via SSH...' : 'Connecting...') : 
                      (connectionMode === 'ssh' ? 'Connect via SSH & Stream' : 'Connect & Stream')
                    }
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
                 
                </Box>
                
                {streamStats && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Stream Statistics
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Connection:</strong> {controllerRef.current?.sshConnection ? 'SSH' : 'Direct URL'}
                      </Typography>
                      {controllerRef.current?.sshConnection && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>SSH Host:</strong> {controllerRef.current.sshConnection.host_ip}:{controllerRef.current.sshConnection.host_port}
                        </Typography>
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

          {/* Right Column: Video Display */}
          <Grid item xs={8}>
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              height: '500px',
              border: '1px solid #ccc',
              borderRadius: 1,
              overflow: 'hidden',
              backgroundColor: '#000'
            }}>
              {/* Loading state */}
              {isVideoLoading && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  zIndex: 10
                }}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography>Loading stream...</Typography>
                  </Box>
                </Box>
              )}
              
              {/* Error state */}
              {videoError && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  zIndex: 10
                }}>
                  <Box sx={{ textAlign: 'center', color: 'white', p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Stream Error</Typography>
                    <Typography>{videoError}</Typography>
                  </Box>
                </Box>
              )}
              
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
                    <Typography>Configure connection to test stream accessibility</Typography>
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
                      Stream file verified at: <strong>{controllerRef.current.sshConnection.stream_path}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      The HDMI stream is accessible via SSH connection.<br/>
                      This configuration can now be used in your tests.
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Direct URL Video Display */}
              {isConnected && !controllerRef.current?.sshConnection && (
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                  controls
                  muted
                  playsInline
                  disablePictureInPicture
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
} 