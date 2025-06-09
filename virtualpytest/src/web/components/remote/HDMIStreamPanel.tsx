import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
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
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  PlayArrow,
  Videocam,
  VolumeUp,
  Settings,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { StreamViewer } from '../user-interface/StreamViewer';
import { useRegistration } from '../../contexts/RegistrationContext';

interface HDMIStreamPanelProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: {
    stream_path: string;
    video_device: string;
    resolution?: string;
    fps?: number;
  };
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Compact mode for smaller spaces like NavigationEditor */
  compact?: boolean;
  /** Custom styling */
  sx?: any;
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
  stream_path: string;
  video_device: string;
}

export function HDMIStreamPanel({
  connectionConfig,
  autoConnect = false,
  compact = false,
  sx = {}
}: HDMIStreamPanelProps) {
  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();

  // Stream configuration state
  const [resolution, setResolution] = useState(connectionConfig?.resolution || '1920x1080');
  const [fps, setFps] = useState(connectionConfig?.fps || 30);
  
  // SSH connection form state
  const [sshConnectionForm, setSSHConnectionForm] = useState<SSHConnectionForm>({
    stream_path: connectionConfig?.stream_path || '/path/to/output.m3u8',
    video_device: connectionConfig?.video_device || '/dev/video0',
  });
  
  // Connection and streaming state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  
  // Simulated controller instance
  const controllerRef = useRef<any>(null);

  // Initialize controller
  useEffect(() => {
    if (!controllerRef.current) {
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
          stream_quality: resolution,
          stream_fps: fps
        }
      };
    }
  }, [resolution, fps]);

  // Initialize connection form with provided config
  useEffect(() => {
    if (connectionConfig) {
      setSSHConnectionForm({
        stream_path: connectionConfig.stream_path,
        video_device: connectionConfig.video_device,
      });
      setResolution(connectionConfig.resolution || '1920x1080');
      setFps(connectionConfig.fps || 30);
    }
  }, [connectionConfig]);

  // Auto-connect if config is provided and autoConnect is true
  useEffect(() => {
    if (connectionConfig && autoConnect && !isConnected && !isConnecting) {
      console.log('[@component:HDMIStreamPanel] Auto-connecting with provided config');
      handleConnect();
    }
  }, [connectionConfig, autoConnect, isConnected, isConnecting]);

  // Fetch default values
  useEffect(() => {
    if (!connectionConfig) {
      fetchDefaultValues();
    }
  }, [connectionConfig]);

  const fetchDefaultValues = async () => {
    try {
      const response = await fetch(buildServerUrl('/server/remote/hdmi-stream/defaults'));
      const result = await response.json();
      
      if (result.success && result.defaults) {
        setSSHConnectionForm(prev => ({
          ...prev,
          ...result.defaults
        }));
        console.log('[@component:HDMIStreamPanel] Loaded default SSH connection values');
      }
    } catch (error) {
      console.log('[@component:HDMIStreamPanel] Could not load default values:', error);
    }
  };

  // SSH connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log('[@component:HDMIStreamPanel] Starting HDMI stream connection...');
      
      const response = await fetch(buildServerUrl('/server/take-control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_model: 'hdmi_stream',
          ...sshConnectionForm
        }),
      });

      const result = await response.json();
      console.log('[@component:HDMIStreamPanel] Connection response:', result);

      if (result.success) {
        console.log('[@component:HDMIStreamPanel] Successfully connected to HDMI stream');
        setIsConnected(true);
        setConnectionError(null);
        
        if (controllerRef.current) {
          controllerRef.current.connected = true;
          controllerRef.current.streaming = true;
          controllerRef.current.streamUrl = `SSH: ${sshConnectionForm.stream_path}`;
          controllerRef.current.sshConnection = { ...sshConnectionForm };
          controllerRef.current.stats.stream_url = `SSH: ${sshConnectionForm.stream_path}`;
          controllerRef.current.stats.is_streaming = true;
          controllerRef.current.stats.stream_quality = resolution;
          controllerRef.current.stats.stream_fps = fps;
        }
        
        startStatsSimulation();
      } else {
        const errorMsg = result.error || 'Failed to connect to HDMI stream';
        console.error('[@component:HDMIStreamPanel] Connection failed:', errorMsg);
        setConnectionError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Connection failed - network or server error';
      console.error('[@component:HDMIStreamPanel] Exception during connection:', err);
      setConnectionError(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect from stream
  const handleDisconnect = async () => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('[@component:HDMIStreamPanel] Disconnecting HDMI stream...');
      const response = await fetch(buildServerUrl('/server/release-control'), {
            method: 'POST',
      });
      
      console.log('[@component:HDMIStreamPanel] Disconnection successful');
    } catch (err: any) {
      console.error('[@component:HDMIStreamPanel] Disconnect error:', err);
    } finally {
      // Always reset state
      setIsConnected(false);
      setStreamStats(null);
      setIsConnecting(false);
      console.log('[@component:HDMIStreamPanel] Session state reset');
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
        
        setTimeout(updateStats, 1000);
      }
    };
    
    setTimeout(updateStats, 1000);
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

  // Connection status display
  if (!isConnected) {
    return (
      <Box sx={{ 
        p: compact ? 1 : 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        ...sx 
      }}>
        <Typography variant={compact ? "body2" : "h6"} color="textSecondary" gutterBottom>
          HDMI Stream Not Connected
        </Typography>
        {connectionConfig ? (
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={isConnecting}
            size={compact ? "small" : "medium"}
          >
            {isConnecting ? <CircularProgress size={16} /> : 'Connect & Stream'}
          </Button>
        ) : (
          <Typography variant="caption" color="textSecondary" textAlign="center">
            Configure SSH connection parameters to enable HDMI streaming
          </Typography>
        )}
        {connectionError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, textAlign: 'center' }}>
            {connectionError}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: compact ? 1 : 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'auto',
      ...sx 
    }}>
      {/* Stream Control Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant={compact ? "subtitle2" : "h6"} gutterBottom>
          HDMI Stream Viewer
        </Typography>

        {/* Status chips */}
        <Box sx={{ mb: 2 }}>
          <Chip 
            label="Connected" 
            color="success" 
            icon={<Settings />} 
            size="small"
            sx={{ mr: 1 }}
          />
          <Chip 
            label="Streaming" 
            color="primary" 
            icon={<Videocam />} 
            size="small"
          />
        </Box>
                
        {/* Stream Statistics */}
        {streamStats && (
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: compact ? 1 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
              <Typography variant="subtitle2" gutterBottom>
                Stream Statistics
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Connection:</strong> SSH
              </Typography>
              {controllerRef.current?.sshConnection && (
                <>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>SSH Host:</strong> {controllerRef.current.sshConnection.video_device}
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

        {/* Stream Display Area */}
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: compact ? '200px' : '300px',
          border: '1px solid #ccc',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: '#e8f5e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2
        }}>
          <Box sx={{ textAlign: 'center', color: 'success.main', p: 2 }}>
            <Settings sx={{ fontSize: compact ? 32 : 48, mb: 1 }} />
            <Typography variant={compact ? "body2" : "body1"} gutterBottom>
              SSH Connection Active
            </Typography>
            {controllerRef.current?.sshConnection && (
              <>
                <Typography variant="caption" display="block">
                  Device: {controllerRef.current.sshConnection.video_device}
                </Typography>
                <Typography variant="caption" display="block">
                  Output: {controllerRef.current.sshConnection.stream_path}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Disconnect button */}
      <Button 
        variant="contained" 
        color="error"
        onClick={handleDisconnect}
        disabled={isConnecting}
        size="small"
        fullWidth
        sx={{ mt: 1 }}
      >
        {isConnecting ? <CircularProgress size={16} /> : 'Disconnect'}
      </Button>
    </Box>
  );
} 