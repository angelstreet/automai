import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PhotoCamera,
  VideoCall,
  StopCircle,
  Fullscreen,
  FullscreenExit,
  Settings,
  Videocam,
} from '@mui/icons-material';
import { StreamViewer } from './StreamViewer';

interface ScreenDefinitionEditorProps {
  /** Device configuration with AV parameters */
  deviceConfig?: {
    av?: {
      parameters: {
        fps: number;
        host_ip: string;
        host_port: string;
        resolution: string;
        stream_url: string;
        stream_path: string;
        video_device: string;
        host_password: string;
        host_username: string;
        connection_timeout: number;
      };
    };
  };
  /** Device model for resource path */
  deviceModel: string;
  /** Whether to auto-connect when device is selected */
  autoConnect?: boolean;
  /** Callback when disconnection is complete */
  onDisconnectComplete?: () => void;
  /** Custom styling */
  sx?: any;
}

interface CaptureStats {
  is_connected: boolean;
  is_capturing: boolean;
  capture_count: number;
  uptime_seconds: number;
}

export function ScreenDefinitionEditor({
  deviceConfig,
  deviceModel,
  autoConnect = false,
  onDisconnectComplete,
  sx = {}
}: ScreenDefinitionEditorProps) {
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStats, setCaptureStats] = useState<CaptureStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // SSH session ref (dedicated session, separate from remote)
  const sshSessionRef = useRef<any>(null);

  // Extract AV config for easier access
  const avConfig = deviceConfig?.av?.parameters;

  // Add debugging logs
  useEffect(() => {
    if (avConfig) {
      console.log('[@component:ScreenDefinitionEditor] AV Config:', {
        stream_url: avConfig.stream_url,
        video_device: avConfig.video_device,
        host_ip: avConfig.host_ip
      });
    }
  }, [avConfig]);

  // Auto-connect when config is available and autoConnect is true
  useEffect(() => {
    if (avConfig && autoConnect && !isConnected && !isConnecting) {
      console.log('[@component:ScreenDefinitionEditor] Auto-connecting to device for screen capture');
      handleConnect();
    }
  }, [avConfig, autoConnect, isConnected, isConnecting]);

  // Add stream status monitoring
  useEffect(() => {
    if (isConnected && avConfig?.stream_url) {
      console.log('[@component:ScreenDefinitionEditor] Attempting to load stream from:', avConfig.stream_url);
    }
  }, [isConnected, avConfig?.stream_url]);

  // Connect to device via dedicated SSH session
  const handleConnect = async () => {
    if (!avConfig) {
      setConnectionError('No AV configuration available');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      console.log(`[@component:ScreenDefinitionEditor] Connecting to ${avConfig.host_ip} for screen capture`);
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_ip: avConfig.host_ip,
          host_username: avConfig.host_username,
          host_password: avConfig.host_password,
          host_port: avConfig.host_port,
          video_device: avConfig.video_device,
          device_model: deviceModel,
        }),
      });

      const result = await response.json();

      if (result.success) {
        sshSessionRef.current = {
          connected: true,
          sessionId: result.session_id,
          config: avConfig,
        };
        
        setIsConnected(true);
        console.log('[@component:ScreenDefinitionEditor] SSH connection established for screen capture');
        
        // Start stats monitoring
        startStatsMonitoring();
        
      } else {
        setConnectionError(result.error || 'Failed to establish connection');
      }
      
    } catch (error: any) {
      console.error('[@component:ScreenDefinitionEditor] Connection failed:', error);
      setConnectionError(error.message || 'Failed to establish connection');
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Disconnect from device
  const handleDisconnect = async () => {
    console.log('[@component:ScreenDefinitionEditor] Disconnecting from device');
    
    try {
      // Stop capture if active
      if (isCapturing) {
        await handleStopCapture();
      }

      // Close SSH session
      if (sshSessionRef.current?.sessionId) {
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: sshSessionRef.current.sessionId,
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          console.log('[@component:ScreenDefinitionEditor] SSH session closed successfully');
        }
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Error during disconnect:', error);
    }
    
    // Reset state
    sshSessionRef.current = null;
    setIsConnected(false);
    setIsCapturing(false);
    setCaptureStats(null);
    setIsExpanded(false);
    
    // Notify parent component
    if (onDisconnectComplete) {
      onDisconnectComplete();
    }
  };

  // Take screenshot
  const handleTakeScreenshot = async () => {
    if (!sshSessionRef.current?.sessionId) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Taking screenshot');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sshSessionRef.current.sessionId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[@component:ScreenDefinitionEditor] Screenshot saved: ${result.screenshot_path}`);
        // TODO: Update UI to show screenshot was taken
      } else {
        console.error('[@component:ScreenDefinitionEditor] Screenshot failed:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Screenshot error:', error);
    }
  };

  // Start video capture (10fps, rolling 50s = 500 frames max)
  const handleStartCapture = async () => {
    if (!sshSessionRef.current?.sessionId) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Starting video capture');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/start-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sshSessionRef.current.sessionId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsCapturing(true);
        console.log('[@component:ScreenDefinitionEditor] Video capture started');
      } else {
        console.error('[@component:ScreenDefinitionEditor] Failed to start capture:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Start capture error:', error);
    }
  };

  // Stop video capture
  const handleStopCapture = async () => {
    if (!sshSessionRef.current?.sessionId) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Stopping video capture');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stop-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sshSessionRef.current.sessionId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsCapturing(false);
        console.log('[@component:ScreenDefinitionEditor] Video capture stopped');
      } else {
        console.error('[@component:ScreenDefinitionEditor] Failed to stop capture:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Stop capture error:', error);
    }
  };

  // Monitor capture statistics
  const startStatsMonitoring = () => {
    const updateStats = () => {
      if (sshSessionRef.current?.connected) {
        // Simulate stats for now - will be replaced with real data from server
        setCaptureStats(prev => ({
          is_connected: true,
          is_capturing: isCapturing,
          capture_count: (prev?.capture_count || 0) + (isCapturing ? 10 : 0),
          uptime_seconds: (prev?.uptime_seconds || 0) + 1,
        }));
        
        setTimeout(updateStats, 1000);
      }
    };
    
    setTimeout(updateStats, 1000);
  };

  // Toggle expanded mode
  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // If not connected, show connection status
  if (!isConnected) {
    return (
      <Box sx={{ 
        position: 'fixed',
        bottom: 16,
        left: 16,
        width: '200px',
        height: '150px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 2,
        zIndex: 1000,
        ...sx 
      }}>
        <Typography variant="caption" color="textSecondary" textAlign="center" gutterBottom>
          Screen Definition
        </Typography>
        {avConfig ? (
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={isConnecting}
            size="small"
          >
            {isConnecting ? <CircularProgress size={16} /> : 'Connect'}
          </Button>
        ) : (
          <Typography variant="caption" color="textSecondary" textAlign="center">
            No AV config
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
      position: 'fixed',
      bottom: 16,
      left: 16,
      width: isExpanded ? '250px' : '150px',
      height: isExpanded ? '500px' : '250px',
      bgcolor: '#000000',
      border: '2px solid #000000',
      borderRadius: 1,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 2,
      zIndex: 1000,
      transition: 'all 0.3s ease-in-out',
      ...sx 
    }}>
      {isExpanded ? (
        <Box sx={{ 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#000000'
        }}>
          {/* Minimal header with just the essential buttons */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            p: 1,
            borderBottom: '1px solid #333'
          }}>
            <Tooltip title="Take Screenshot">
              <IconButton size="small" onClick={handleTakeScreenshot} sx={{ color: '#ffffff' }}>
                <PhotoCamera />
              </IconButton>
            </Tooltip>
            
            {!isCapturing ? (
              <Tooltip title="Start Capture">
                <IconButton size="small" onClick={handleStartCapture} sx={{ color: '#ffffff' }}>
                  <VideoCall />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Stop Capture">
                <IconButton size="small" onClick={handleStopCapture} sx={{ color: '#ffffff' }}>
                  <StopCircle />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Minimize">
              <IconButton 
                size="small" 
                onClick={handleToggleExpanded}
                sx={{ color: '#ffffff' }}
              >
                <FullscreenExit />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Stream taking all remaining space */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <StreamViewer 
              streamUrl={avConfig?.stream_url}
              isConnected={isConnected}
              width="100%"
              height="100%"
            />
          </Box>
        </Box>
      ) : (
        // Compact view code stays the same
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          bgcolor: '#000000',
          display: 'flex'
        }}>
          <StreamViewer 
            streamUrl={avConfig?.stream_url}
            isConnected={isConnected}
            width="100%"
            height="100%"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />

          <IconButton 
            size="small" 
            onClick={handleToggleExpanded}
            sx={{ 
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#ffffff',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.9)'
              }
            }}
          >
            <Fullscreen sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
} 