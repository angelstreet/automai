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
  DialogActions,
} from '@mui/material';
import { PlayArrow, Videocam, VolumeUp, Settings, Close as CloseIcon } from '@mui/icons-material';
import { HDMIStreamPanel } from '../../remote/HDMIStreamPanel';
import { useRegistration } from '../../../contexts/RegistrationContext';

interface HDMIStreamModalProps {
  open: boolean;
  onClose: () => void;
}

export function HDMIStreamModal({ open, onClose }: HDMIStreamModalProps) {
  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();

  // Stream configuration state
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(30);
  
  // SSH connection parameters - restored
  const [hostIp, setHostIp] = useState('');
  const [hostPort, setHostPort] = useState(22);
  const [hostUsername, setHostUsername] = useState('');
  const [hostPassword, setHostPassword] = useState('');
  
  // Stream connection form state
  const [streamUrl, setStreamUrl] = useState('https://77.56.53.130:444/stream/output.m3u8');
  const [videoDevice, setVideoDevice] = useState('/dev/video0');
  
  // Connection and streaming state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Video player refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  // Load default values when modal opens
  useEffect(() => {
    if (open) {
      fetchDefaultValues();
    }
    
    // Cleanup when modal closes
    return () => {
      cleanupStream();
    };
  }, [open]);

  // Clean up stream resources
  const cleanupStream = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }
  };

  // Fetch default stream URL from environment variables if available
  const fetchDefaultValues = async () => {
    try {
      const response = await fetch(buildServerUrl('/api/virtualpytest/hdmi-stream/defaults'));
      const result = await response.json();
      
      if (result.success && result.defaults) {
        setStreamUrl(result.defaults.stream_path || streamUrl);
        setVideoDevice(result.defaults.video_device || videoDevice);
        setHostIp(result.defaults.host_ip || '');
        setHostPort(result.defaults.host_port || 22);
        setHostUsername(result.defaults.host_username || '');
        console.log('[@component:HDMIStreamModal] Loaded default stream and SSH settings');
      }
    } catch (error) {
      console.log('[@component:HDMIStreamModal] Could not load default values:', error);
    }
  };

  // Connect to HLS stream
  const handleConnect = async () => {
    if (!streamUrl || !videoDevice) {
      setConnectionError('Please enter both a valid stream URL and video device');
      return;
    }
    
    if (!videoRef.current) {
      setConnectionError('Video player not initialized');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[@component:HDMIStreamModal] Connecting to HLS stream:', streamUrl);
      console.log('[@component:HDMIStreamModal] Using video device:', videoDevice);
      console.log('[@component:HDMIStreamModal] SSH Host:', hostIp, 'Port:', hostPort, 'User:', hostUsername);
      
      // Clean up any existing stream first
      cleanupStream();
      
      // Make sure we have the video element
      if (!videoRef.current) {
        throw new Error('Video element not found');
      }
      
      // Dynamically import HLS.js
      const HLSModule = await import('hls.js');
      const HLS = HLSModule.default;
      
      if (!HLS.isSupported()) {
        console.log('[@component:HDMIStreamModal] HLS.js is not supported, trying native playback');
        // Try native HLS (Safari)
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setIsConnecting(false);
            setIsConnected(true);
            videoRef.current?.play().catch((err) => {
              console.error('[@component:HDMIStreamModal] Autoplay failed:', err);
              setConnectionError('Autoplay failed - please click play');
            });
          });
          
          videoRef.current.addEventListener('error', () => {
            setIsConnecting(false);
            setIsConnected(false);
            setConnectionError('Stream error - Unable to play the stream');
          });
        } else {
          throw new Error('HLS is not supported in this browser');
        }
        return;
      }
      
      // Create HLS instance with low latency settings
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
      
      // Setup event handlers
      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        setIsConnecting(false);
        setIsConnected(true);
        videoRef.current?.play().catch((err) => {
          console.error('[@component:HDMIStreamModal] Autoplay failed:', err);
          setConnectionError('Autoplay failed - please click play');
        });
      });
      
      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          console.error('[@component:HDMIStreamModal] Fatal HLS error:', data.type, data.details);
          setIsConnecting(false);
          setIsConnected(false);
          setConnectionError(`Stream error: ${data.details || data.type}`);
          
          // Destroy instance on fatal error
          hls.destroy();
          hlsRef.current = null;
        } else {
          console.warn('[@component:HDMIStreamModal] Non-fatal HLS error:', data.details);
        }
      });
      
      // Load and attach the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      
    } catch (error: any) {
      console.error('[@component:HDMIStreamModal] Stream connection failed:', error);
      setIsConnecting(false);
      setIsConnected(false);
      setConnectionError(error.message || 'Failed to connect to stream');
    }
  };
  
  // Handle stream disconnect
  const handleDisconnect = () => {
    console.log('[@component:HDMIStreamModal] Disconnecting from stream');
    cleanupStream();
    setIsConnected(false);
  };
  
  // Handle modal close
  const handleCloseModal = () => {
    console.log('[@component:HDMIStreamModal] Closing modal and cleaning up');
    
    // Clean up streaming
    if (isConnected) {
      handleDisconnect();
    }
    
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
                <Typography variant="subtitle2" gutterBottom>
                  SSH Connection Details
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      label="Host IP Address"
                      value={hostIp}
                      onChange={(e) => setHostIp(e.target.value)}
                      size="small"
                      placeholder="192.168.1.100"
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="SSH Port"
                      type="number"
                      value={hostPort}
                      onChange={(e) => setHostPort(parseInt(e.target.value) || 22)}
                      size="small"
                      placeholder="22"
                      inputProps={{ min: 1, max: 65535 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={hostUsername}
                      onChange={(e) => setHostUsername(e.target.value)}
                      size="small"
                      placeholder="username"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      value={hostPassword}
                      onChange={(e) => setHostPassword(e.target.value)}
                      size="small"
                      placeholder="password"
                    />
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle2" gutterBottom>
                  Stream Connection Details
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Stream URL"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      size="small"
                      placeholder="https://example.com/stream/output.m3u8"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Video Device"
                      value={videoDevice}
                      onChange={(e) => setVideoDevice(e.target.value)}
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
                    disabled={isConnecting || !streamUrl || !videoDevice}
                    fullWidth
                    startIcon={isConnecting ? <CircularProgress size={20} /> : <PlayArrow />}
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
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
              /* Stream Controls When Connected */
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Connection Information
                </Typography>
                
                <Card sx={{ mb: 2 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>SSH Host:</strong> {hostIp}:{hostPort}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>SSH User:</strong> {hostUsername}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Stream URL:</strong> {streamUrl}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Video Device:</strong> {videoDevice}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Quality:</strong> {resolution}@{fps}fps
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> <Chip label="Connected" color="success" size="small" />
                    </Typography>
                  </CardContent>
                </Card>
                
                <Button
                  variant="contained"
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
                  sx={{ mt: 1 }}
                >
                  Close
                </Button>
              </Box>
            )}
          </Grid>

          {/* Right Column: Video Player */}
          <Grid item xs={8}>
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              height: '420px',
              border: '1px solid #ccc',
              borderRadius: 1,
              overflow: 'hidden',
              backgroundColor: isConnected ? '#000' : 'transparent',
            }}>
              {/* Video element - always rendered but only visible when connected */}
              <video 
                ref={videoRef}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  display: isConnected ? 'block' : 'none'
                }}
                controls
                playsInline
              />
              
              {/* Placeholder - only visible when not connected */}
              {!isConnected && (
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                    <Videocam sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6">HDMI Stream</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {/* Display error message at the bottom of the form */}
        {connectionError && !isConnected && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {connectionError}
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
} 