import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PlayArrow,
  Stop,
  Refresh,
} from '@mui/icons-material';
import { StreamViewer } from './StreamViewer';
import { CapturePreviewEditor } from './CapturePreviewEditor';

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
  frame_count: number;
  uptime_seconds: number;
  capture_time_seconds?: number;
  last_screenshot?: string;
}

// Update interface for strongly typed screenshot handler
interface ScreenshotResponse {
  success: boolean;
  screenshot_path: string;
  message: string;
  error?: string;
}

export function ScreenDefinitionEditor({
  deviceConfig,
  deviceModel,
  autoConnect = false,
  onDisconnectComplete,
  sx = {}
}: ScreenDefinitionEditorProps) {
  // Connection state - simplified
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStats, setCaptureStats] = useState<CaptureStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Extract AV config for easier access
  const avConfig = deviceConfig?.av?.parameters;

  // Additional state for capture management
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | null>(null);
  const [videoFramesPath, setVideoFramesPath] = useState<string>('/tmp/capture_1-600');
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<'screenshot' | 'video'>('screenshot');
  
  // Stream status state - without polling
  const [streamStatus, setStreamStatus] = useState<'running' | 'stopped' | 'unknown'>('running');
  
  // Video capture state
  const [captureFrames, setCaptureFrames] = useState<string[]>([]);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check for existing remote connection ONCE (no loops)
  useEffect(() => {
    const checkRemoteConnection = async () => {
      try {
        // Simple check if android_mobile_controller exists
        const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/config', {
          method: 'GET',
        });
        
        if (response.ok) {
          console.log('[@component:ScreenDefinitionEditor] Remote system is available');
          setIsConnected(true);
          setConnectionError(null);
        } else {
          setIsConnected(false);
          setConnectionError('Remote control system not available');
        }
      } catch (error) {
        setIsConnected(false);
        setConnectionError('Remote control system not available');
      }
    };

    // Check once on mount, no loops
    checkRemoteConnection();
  }, []);

  // Initial check for stream status - only once, no polling
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!isConnected) return;
      
      try {
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/status');
        if (!response.ok) {
          console.error('[@component:ScreenDefinitionEditor] Initial stream status check failed');
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          setStreamStatus(data.is_active ? 'running' : 'stopped');
        }
      } catch (error) {
        console.error('[@component:ScreenDefinitionEditor] Failed to check initial stream status:', error);
      }
    };

    if (isConnected) {
      checkInitialStatus();
    }
  }, [isConnected]);
  
  // Clean up capture timer on unmount
  useEffect(() => {
    return () => {
      if (captureTimerRef.current) {
        clearInterval(captureTimerRef.current);
      }
    };
  }, []);

  // Disconnect from device using remote routes
  const handleDisconnect = async () => {
    console.log('[@component:ScreenDefinitionEditor] Disconnecting from device via remote routes');
    
    try {
      // Stop capture if active
      if (isCapturing) {
        await handleStopCapture();
      }

      // Release control via remote routes (same as CompactAndroidMobile)
      const response = await fetch('http://localhost:5009/api/virtualpytest/android-mobile/release-control', {
        method: 'POST',
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('[@component:ScreenDefinitionEditor] Control released successfully via remote routes');
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Error during disconnect:', error);
    }
    
    // Reset all state
    setIsConnected(false);
    setIsCapturing(false);
    setCaptureStats(null);
    setIsExpanded(false);
    setConnectionError(null);
    
    // Notify parent component
    if (onDisconnectComplete) {
      onDisconnectComplete();
    }
  };

  // Take screenshot using FFmpeg HDMI capture via SSH
  const handleTakeScreenshot = async () => {
    if (!avConfig || !isConnected) return;
    
    try {
      // First stop the stream if it's running
      await stopStream();
      
      console.log('[@component:ScreenDefinitionEditor] Taking high-res screenshot...');
      
      // Use direct screenshot endpoint
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_model: deviceModel,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Screenshot failed: ${errorText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        console.log(`[@component:ScreenDefinitionEditor] Screenshot saved: ${result.screenshot_path}`);
        
        // Use the file path from capture
        setLastScreenshotPath(result.screenshot_path);
        
        // Switch to screenshot preview mode
        setPreviewMode('screenshot');
        
        // Expand the preview if not already expanded
        if (!isExpanded) {
          setIsExpanded(true);
        }
      } else {
        console.error('[@component:ScreenDefinitionEditor] Screenshot failed:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Screenshot error:', error);
    }
  };

  // Start video capture (10 fps for 30s max)
  const handleStartCapture = async () => {
    if (!avConfig || !isConnected || isCapturing) return;
    
    try {
      // First stop the stream if it's running
      await stopStream();
      
      console.log('[@component:ScreenDefinitionEditor] Starting video capture (10 fps)...');
      setIsCapturing(true);
      setCaptureFrames([]);
      
      // Create a timestamp for this capture session
      const captureSessionId = Date.now();
      
      // Set up a timer to capture at 10 fps (100ms interval)
      let frameCount = 0;
      const maxFrames = 300; // 30 seconds at 10 fps
      
      captureTimerRef.current = setInterval(async () => {
        try {
          const frameResponse = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              device_model: `${deviceModel}_frame_${frameCount.toString().padStart(4, '0')}`,
            }),
          });
          
          if (frameResponse.ok) {
            const frameResult = await frameResponse.json();
            if (frameResult.success) {
              setCaptureFrames(prev => [...prev, frameResult.screenshot_path]);
              frameCount++;
              
              // Update preview if this is our first frame
              if (frameCount === 1) {
                setLastScreenshotPath(frameResult.screenshot_path);
                setPreviewMode('screenshot');
              }
            }
          }
          
          // Stop if we've reached max frames
          if (frameCount >= maxFrames) {
            handleStopCapture();
          }
        } catch (error) {
          console.error('[@component:ScreenDefinitionEditor] Frame capture error:', error);
        }
      }, 100); // 10 fps = 100ms interval
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Start capture error:', error);
      setIsCapturing(false);
    }
  };

  // Stop video capture
  const handleStopCapture = async () => {
    if (!isCapturing) return;
    
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    
    console.log(`[@component:ScreenDefinitionEditor] Capture stopped with ${captureFrames.length} frames`);
    setIsCapturing(false);
    
    // Set video frames path (if we have frames)
    if (captureFrames.length > 0) {
      setVideoFramesPath(`/tmp/captures/${Date.now()}`);
      setTotalFrames(captureFrames.length);
      setCurrentFrame(0);
      setPreviewMode('video');
    }
  };

  // Stop stream
  const stopStream = async () => {
    try {
      console.log('[@component:ScreenDefinitionEditor] Stopping stream...');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/stop', {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error('[@component:ScreenDefinitionEditor] Failed to stop stream:', await response.text());
        return false;
      }
      
      const data = await response.json();
      if (data.success) {
        setStreamStatus('stopped');
        console.log('[@component:ScreenDefinitionEditor] Stream stopped successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Stop stream error:', error);
      return false;
    }
  };

  // Restart stream
  const restartStream = async () => {
    try {
      console.log('[@component:ScreenDefinitionEditor] Restarting stream...');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/restart', {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error('[@component:ScreenDefinitionEditor] Failed to restart stream:', await response.text());
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setStreamStatus('running');
        console.log('[@component:ScreenDefinitionEditor] Stream restarted successfully');
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Restart stream error:', error);
    }
  };

  // Monitor capture statistics - removed polling, using simpler initial stats
  const startStatsMonitoring = () => {
    // Set initial stats without polling
    setCaptureStats({
      is_connected: true,
      is_capturing: false,
      frame_count: 0,
      uptime_seconds: 0,
    });
  };

  // Toggle expanded mode
  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle frame change in preview
  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
  };

  // Add type safety to the onScreenshotTaken handler
  const handleScreenshotTaken = (path: string) => {
    setLastScreenshotPath(path);
    setPreviewMode('screenshot');
  };

  // Handle stream control
  const handleStreamControl = async () => {
    try {
      const endpoint = streamStatus === 'running' ? 'stop' : 'restart';
      
      console.log(`[@component:ScreenDefinitionEditor] ${endpoint === 'stop' ? 'Stopping' : 'Starting'} stream...`);
      
      const response = await fetch(`http://localhost:5009/api/virtualpytest/screen-definition/stream/${endpoint}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error(`[@component:ScreenDefinitionEditor] Stream control failed:`, await response.text());
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setStreamStatus(endpoint === 'stop' ? 'stopped' : 'running');
        console.log(`[@component:ScreenDefinitionEditor] Stream ${endpoint === 'stop' ? 'stopped' : 'restarted'} successfully`);
      }
    } catch (error) {
      console.error(`[@component:ScreenDefinitionEditor] Stream control failed:`, error);
    }
  };

  // If not connected, show connection status
  if (!isConnected) {
    return (
      <Box sx={{ 
        position: 'fixed',
        bottom: 16,
        left: 16,
        width: '240px',
        height: connectionError ? 'auto' : '150px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: connectionError ? 'error.main' : 'divider',
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
          <Typography variant="caption" color="textSecondary" textAlign="center">
            {connectionError}
          </Typography>
        ) : (
          <Typography variant="caption" color="textSecondary" textAlign="center">
            No AV config
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
      display: 'flex',
      zIndex: 1000,
    }}>
      {isExpanded ? (
        // Expanded view with integrated StreamViewer and CapturePreviewEditor
        <Box sx={{
          width: '350px',
          height: '520px',
          boxShadow: 2,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#1E1E1E',
          border: '2px solid #1E1E1E',
        }}>
          {/* Header with controls */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: '1px solid #333'
          }}>
            {/* Left-aligned items with status indicator first */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {/* Status indicator */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 1,
                padding: '2px 8px',
                marginRight: 1
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: streamStatus === 'running' ? '#4caf50' : streamStatus === 'stopped' ? '#f44336' : '#9e9e9e'
                }} />
                <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem' }}>
                  {streamStatus === 'running' ? 'Live' : 'Stopped'}
                </Typography>
              </Box>

              <Tooltip title="Take Screenshot">
                <IconButton 
                  size="small" 
                  onClick={handleTakeScreenshot} 
                  sx={{ color: '#ffffff' }}
                  disabled={!isConnected || isCapturing}
                >
                  <PhotoCamera />
                </IconButton>
              </Tooltip>
              
              {isCapturing ? (
                <Tooltip title="Stop Capture">
                  <IconButton 
                    size="small" 
                    onClick={handleStopCapture} 
                    sx={{ color: '#ffffff' }}
                  >
                    <StopCircle />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Start Capture (10fps)">
                  <IconButton 
                    size="small" 
                    onClick={handleStartCapture} 
                    sx={{ color: '#ffffff' }}
                    disabled={!isConnected || streamStatus !== 'stopped'}
                  >
                    <VideoCall />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Restart Stream">
                <IconButton 
                  size="small" 
                  onClick={restartStream} 
                  sx={{ color: '#ffffff' }}
                  disabled={!isConnected || streamStatus === 'running' || isCapturing}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
            
            {/* Right-aligned minimize button */}
            <Box>
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
          </Box>

          {/* Integrated StreamViewer with CapturePreviewEditor */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            height: 'calc(100% - 48px)'
          }}>
            <StreamViewer 
              streamUrl={avConfig?.stream_url}
              isConnected={isConnected}
              width="100%"
              height="100%"
              lastScreenshotPath={lastScreenshotPath}
              previewMode={previewMode}
              onScreenshotTaken={handleScreenshotTaken}
              isCompactView={false}
              streamStatus={streamStatus}
            />
          </Box>
        </Box>
      ) : (
        // Compact view - completely clean with just the StreamViewer and expand button
        <Box sx={{ 
          width: '150px',
          height: '250px',
          bgcolor: '#1E1E1E',
          border: '2px solid #1E1E1E',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 2,
        }}>
          {/* Clean StreamViewer with no controls */}
          <StreamViewer 
            streamUrl={avConfig?.stream_url}
            isConnected={isConnected}
            width="100%"
            height="100%"
            lastScreenshotPath={lastScreenshotPath}
            previewMode={previewMode}
            onScreenshotTaken={handleScreenshotTaken}
            isCompactView={true}
            streamStatus={streamStatus}
          />

          {/* Only the expand button */}
          <IconButton 
            size="small" 
            onClick={handleToggleExpanded}
            sx={{ 
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: '#ffffff',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)'
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