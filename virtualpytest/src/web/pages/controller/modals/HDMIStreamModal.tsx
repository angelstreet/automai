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
} from '@mui/material';
import { PlayArrow, Stop, Videocam, VolumeUp, Settings } from '@mui/icons-material';

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

export function HDMIStreamModal({ open, onClose }: HDMIStreamModalProps) {
  // Stream configuration state
  const [streamUrl, setStreamUrl] = useState('');
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(30);
  
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
  
  // Connect to stream
  const handleConnect = async () => {
    if (!streamUrl.trim()) {
      setConnectionError('Please enter a valid stream URL');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[@component:HDMIStreamModal] Connecting to stream:', streamUrl);
      
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
        controllerRef.current.streamUrl = streamUrl;
        controllerRef.current.stats.stream_url = streamUrl;
      }
      
      setIsConnected(true);
      console.log('[@component:HDMIStreamModal] Connected successfully');
      
      // Auto-start streaming after connection
      await handleStartStreaming();
      
    } catch (error: any) {
      console.error('[@component:HDMIStreamModal] Connection failed:', error);
      setConnectionError(error.message || 'Failed to connect to stream');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect from stream
  const handleDisconnect = async () => {
    console.log('[@component:HDMIStreamModal] Disconnecting from stream');
    
    // Stop streaming first
    if (isStreaming) {
      await handleStopStreaming();
    }
    
    // Update controller state
    if (controllerRef.current) {
      controllerRef.current.connected = false;
      controllerRef.current.streamUrl = '';
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
    setStreamStats(null);
    setVideoError(null);
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };
  
  // Start video streaming
  const handleStartStreaming = async () => {
    if (!isConnected) {
      setConnectionError('Not connected to stream');
      return;
    }
    
    setIsVideoLoading(true);
    setVideoError(null);
    
    try {
      console.log('[@component:HDMIStreamModal] Starting video streaming');
      
      // Update controller state
      if (controllerRef.current) {
        controllerRef.current.streaming = true;
        controllerRef.current.stats.is_streaming = true;
        controllerRef.current.stats.stream_quality = resolution;
        controllerRef.current.stats.stream_fps = fps;
      }
      
      // Set video source (in real implementation, this would be handled by the controller)
      if (videoRef.current) {
        videoRef.current.src = streamUrl;
        
        // Handle video events
        videoRef.current.onloadstart = () => {
          console.log('[@component:HDMIStreamModal] Video loading started');
        };
        
        videoRef.current.oncanplay = () => {
          console.log('[@component:HDMIStreamModal] Video can start playing');
          setIsVideoLoading(false);
          videoRef.current?.play().catch(err => {
            console.error('[@component:HDMIStreamModal] Autoplay failed:', err);
            setVideoError('Autoplay failed - click to play manually');
          });
        };
        
        videoRef.current.onerror = (e) => {
          console.error('[@component:HDMIStreamModal] Video error:', e);
          setVideoError('Failed to load video stream');
          setIsVideoLoading(false);
        };
        
        videoRef.current.onended = () => {
          console.log('[@component:HDMIStreamModal] Video ended');
          setIsStreaming(false);
          if (controllerRef.current) {
            controllerRef.current.streaming = false;
            controllerRef.current.stats.is_streaming = false;
          }
        };
      }
      
      setIsStreaming(true);
      
      // Start stats simulation
      startStatsSimulation();
      
    } catch (error: any) {
      console.error('[@component:HDMIStreamModal] Failed to start streaming:', error);
      setVideoError(error.message || 'Failed to start streaming');
      setIsVideoLoading(false);
    }
  };
  
  // Stop video streaming
  const handleStopStreaming = async () => {
    console.log('[@component:HDMIStreamModal] Stopping video streaming');
    
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
    if (isConnected) {
      await handleDisconnect();
    }
    onClose();
  };
  
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
                <Typography variant="h6" gutterBottom>
                  Stream Configuration
                </Typography>
                
                {connectionError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {connectionError}
                  </Alert>
                )}

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

                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={isConnecting || !streamUrl.trim()}
                  fullWidth
                  startIcon={isConnecting ? <CircularProgress size={20} /> : <PlayArrow />}
                >
                  {isConnecting ? 'Connecting...' : 'Connect & Stream'}
                </Button>
              </Box>
            ) : (
              /* Stream Controls & Stats */
              <Box>
                <Typography variant="h6" gutterBottom>
                  Stream Controls
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={isStreaming ? 'STREAMING' : 'CONNECTED'} 
                    color={isStreaming ? 'success' : 'primary'} 
                    icon={isStreaming ? <Videocam /> : <Settings />}
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {!isStreaming ? (
                    <Button
                      variant="contained"
                      onClick={handleStartStreaming}
                      startIcon={<PlayArrow />}
                      sx={{ flex: 1 }}
                    >
                      Start Stream
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={handleStopStreaming}
                      startIcon={<Stop />}
                      sx={{ flex: 1 }}
                    >
                      Stop Stream
                    </Button>
                  )}
                </Box>
                
                {streamStats && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Stream Statistics
                      </Typography>
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
                
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  fullWidth
                >
                  Disconnect
                </Button>
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
                    <Typography variant="h6">No Stream Connected</Typography>
                    <Typography>Enter a stream URL to begin</Typography>
                  </Box>
                </Box>
              )}
              
              {/* Video element */}
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
              />
              
              {/* Stream info overlay */}
              {isStreaming && (
                <Box sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  color: 'white',
                  p: 1,
                  zIndex: 5
                }}>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    {streamUrl}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption">
                      {resolution}@{fps}fps
                    </Typography>
                    <Chip 
                      label="LIVE" 
                      size="small" 
                      color="error" 
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {/* Modal Controls */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={handleCloseModal}>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
} 