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
import { ScreenshotCapture } from './ScreenshotCapture';
import { VideoCapture } from './VideoCapture';

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
  device_resolution?: {
    width: number;
    height: number;
  };
  capture_resolution?: string;
  stream_resolution?: string;
  stream_was_active?: boolean;
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
  
  // Log stream URL for debugging
  useEffect(() => {
    if (avConfig) {
      console.log('[@component:ScreenDefinitionEditor] Stream URL config:', avConfig.stream_url);
      console.log('[@component:ScreenDefinitionEditor] Host IP:', avConfig.host_ip);
    }
  }, [avConfig]);

  // Additional state for capture management
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | undefined>(undefined);
  const [videoFramesPath, setVideoFramesPath] = useState<string | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [viewMode, setViewMode] = useState<'stream' | 'screenshot' | 'capture'>('stream');
  
  // Stream status state - without polling
  const [streamStatus, setStreamStatus] = useState<'running' | 'stopped' | 'unknown'>('running');
  
  // Video capture state
  const [captureFrames, setCaptureFrames] = useState<string[]>([]);
  const captureTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [resolutionInfo, setResolutionInfo] = useState<{
    device: { width: number; height: number } | null;
    capture: string | null;
    stream: string | null;
  }>({
    device: null,
    capture: null,
    stream: null,
  });
  
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
        // Add a small delay to make sure SSH connection is ready
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/status');
        if (!response.ok) {
          console.log('[@component:ScreenDefinitionEditor] Initial stream status check failed, attempting restart...');
          // Try to restart stream if status check fails
          await restartStream();
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          if (data.is_active) {
            setStreamStatus('running');
          } else {
            setStreamStatus('stopped');
            // Automatically attempt to restart if stream is stopped
            console.log('[@component:ScreenDefinitionEditor] Stream is stopped, attempting automatic restart...');
            setTimeout(() => restartStream(), 1000);
          }
        } else {
          // Default to stopped and try restart
          setStreamStatus('stopped');
          console.log('[@component:ScreenDefinitionEditor] Stream status unknown, attempting restart...');
          setTimeout(() => restartStream(), 1000);
        }
      } catch (error) {
        // Just set a default status and attempt restart
        console.log('[@component:ScreenDefinitionEditor] Stream status check unavailable, attempting restart...');
        setStreamStatus('stopped');
        setTimeout(() => restartStream(), 1000);
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

  // Start video capture - simplified for new architecture
  const handleStartCapture = async () => {
    if (!isConnected || isCapturing) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Starting video capture...');
      
      // Set capturing state and view mode first, so the VideoCapture component will be displayed immediately
      setIsCapturing(true);
      setViewMode('capture');
      setCaptureFrames([]);
      
      // The VideoCapture component will auto-start capture when mounted
      console.log('[@component:ScreenDefinitionEditor] Switched to VideoCapture component which will auto-start');
      
      // Start stats monitoring
      startStatsMonitoring();
      
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to start capture:', error);
      setIsCapturing(false);
    }
  };

  // Stop video capture - simplified for new architecture
  const handleStopCapture = async () => {
    if (!isCapturing) return;
    
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    
    // VideoCapture component handles the actual stop action through its own Stop button
    // We'll just set our local state to reflect the stopped state
    setIsCapturing(false);
    setCaptureStats(null);
    
    // Return to stream view after stopping
    setViewMode('stream');
    
    console.log('[@component:ScreenDefinitionEditor] Video capture stopped');
  };

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      setIsConnected(false);
      setConnectionError(null);
      setStreamStatus('unknown');
      
      // Clean up any active captures
      if (isCapturing) {
        await handleStopCapture();
      }
      
      // Reset states
      setLastScreenshotPath(undefined);
      setVideoFramesPath(undefined);
      setCurrentFrame(0);
      setTotalFrames(0);
      setViewMode('stream');
      
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
      
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Disconnect error:', error);
    }
  };

  // Take screenshot using the screenshot API
  const handleTakeScreenshot = async () => {
    if (!isConnected) return;
    
    // Set capturing state to show loading indicator
    setIsCapturing(true);
    
    try {
      // First stop the stream
      console.log('[@component:ScreenDefinitionEditor] Stopping stream before taking screenshot...');
      await stopStream();
      
      // Now take the screenshot
      console.log('[@component:ScreenDefinitionEditor] Taking screenshot...');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot_from_stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          device_model: deviceModel,
          video_device: avConfig?.video_device || '/dev/video0'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[@component:ScreenDefinitionEditor] Screenshot API error:', errorText);
        return;
      }
      
      const data: ScreenshotResponse = await response.json();
      
      if (data.success) {
        console.log('[@component:ScreenDefinitionEditor] Screenshot taken successfully:', data.screenshot_path);
        setLastScreenshotPath(data.screenshot_path);
        setViewMode('screenshot');
        
        // Update resolution info
        if (data.device_resolution) {
          setResolutionInfo(prev => ({
            ...prev,
            device: data.device_resolution!,
            capture: data.capture_resolution || null,
            stream: data.stream_resolution || null,
          }));
        }
        
        // Ensure stream status is set to stopped to enable the restart button
        setStreamStatus('stopped');
      } else {
        console.error('[@component:ScreenDefinitionEditor] Screenshot failed:', data.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Screenshot request failed:', error);
    } finally {
      // Always clear the capturing state when done
      setIsCapturing(false);
    }
  };

  // Stop stream
  const stopStream = async () => {
    try {
      console.log('[@component:ScreenDefinitionEditor] Stopping stream...');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/stop', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStreamStatus('stopped');
          console.log('[@component:ScreenDefinitionEditor] Stream stopped successfully');
        }
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to stop stream:', error);
    }
  };

  // Restart stream
  const restartStream = async () => {
    try {
      console.log('[@component:ScreenDefinitionEditor] Restarting stream...');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/restart', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('[@component:ScreenDefinitionEditor] Stream restart API call successful');
          setStreamStatus('running');
          setViewMode('stream');
          setLastScreenshotPath(undefined);
          
          // Log that we're displaying the stream
          if (avConfig?.stream_url) {
            console.log(`[@component:ScreenDefinitionEditor] Showing stream URL: ${avConfig.stream_url}`);
            console.log('[@component:ScreenDefinitionEditor] If stream still not visible, check browser console for video element errors');
          } else {
            console.error('[@component:ScreenDefinitionEditor] No stream URL available in config');
          }
        } else {
          console.error('[@component:ScreenDefinitionEditor] Stream restart API returned failure:', data);
        }
      } else {
        console.error('[@component:ScreenDefinitionEditor] Stream restart API HTTP error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to restart stream:', error);
    }
  };

  // Start monitoring capture stats
  const startStatsMonitoring = () => {
    // Simplified stats monitoring for new architecture
    const interval = setInterval(() => {
      setCaptureStats(prev => ({
        is_connected: isConnected,
        is_capturing: isCapturing,
        frame_count: prev ? prev.frame_count + 1 : 1,
        uptime_seconds: prev ? prev.uptime_seconds + 1 : 1,
      }));
    }, 1000);
    
    captureTimerRef.current = interval;
  };

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
    setViewMode('screenshot');
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
        
        // If we're restarting the stream, set view mode to stream and clear screenshot
        if (endpoint === 'restart') {
          setViewMode('stream');
          setLastScreenshotPath(undefined);
        }
        
        console.log(`[@component:ScreenDefinitionEditor] Stream ${endpoint === 'stop' ? 'stopped' : 'restarted'} successfully`);
      }
    } catch (error) {
      console.error(`[@component:ScreenDefinitionEditor] Stream control failed:`, error);
    }
  };

  // Compute the real stream URL based on config
  const getStreamUrl = useCallback(() => {
    if (avConfig?.stream_url) {
      // Use the configured stream URL if available
      return avConfig.stream_url;
    } else if (avConfig?.host_ip) {
      // Try HTTPS URL first, but note that it might need to be HTTP depending on the server config
      return `https://${avConfig.host_ip}:444/stream/output.m3u8`;
      // Alternative: return `http://${avConfig.host_ip}:444/stream/output.m3u8`;
    }
    return undefined;
  }, [avConfig]);
  
  // Use the computed stream URL in the render function
  const renderViewComponent = () => {
    const commonProps = {
      sx: { width: '100%', height: '100%' }
    };
    
    // Get the proper stream URL
    const streamUrl = getStreamUrl();
    
    // Log the actual URL being used
    if (viewMode === 'stream') {
      console.log(`[@component:ScreenDefinitionEditor] Using stream URL: ${streamUrl}`);
    }

    // When capturing a screenshot, show the ScreenshotCapture with isCapturing=true
    if (isCapturing && viewMode !== 'capture') {
      return (
        <ScreenshotCapture
          isCapturing={true}
          {...commonProps}
        />
      );
    }

    // Otherwise, show the appropriate component based on viewMode
    switch (viewMode) {
      case 'screenshot':
        return (
          <ScreenshotCapture
            screenshotPath={lastScreenshotPath}
            resolutionInfo={resolutionInfo}
            isCapturing={false}
            {...commonProps}
          />
        );
      
      case 'capture':
        return (
          <VideoCapture
            deviceModel={deviceModel}
            videoDevice={avConfig?.video_device}
            videoFramesPath={videoFramesPath}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            onFrameChange={handleFrameChange}
            {...commonProps}
          />
        );
      
      case 'stream':
      default:
        return (
          <StreamViewer
            streamUrl={streamUrl}
            isStreamActive={streamStatus === 'running'}
            {...commonProps}
          />
        );
    }
  };


  return (
    <Box sx={{ 
      position: 'fixed',
      bottom: 16,
      left: 16,
      display: 'flex',
      zIndex: 1000,
    }}>
      {isExpanded ? (
        // Expanded view - exact same layout as before but using new components
        <Box sx={{
          width: '350px',
          height: '520px',
          boxShadow: 2,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#1E1E1E',
          border: '2px solid #1E1E1E',
        }}>
          {/* Header with controls - fixed width sections to prevent flickering */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            borderBottom: '1px solid #333',
            height: '48px'
          }}>
            {/* Left section - status indicator */}
            <Box sx={{ 
              width: '80px', 
              display: 'flex', 
              justifyContent: 'flex-start'
            }}>
              {/* Status indicator with fixed width */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 1,
                padding: '2px 8px',
                width: '70px',
                justifyContent: 'center'
              }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: streamStatus === 'running' ? '#4caf50' : streamStatus === 'stopped' ? '#f44336' : '#9e9e9e'
                }} />
                <Typography variant="caption" sx={{ color: 'white', fontSize: '0.7rem', width: '40px', textAlign: 'center' }}>
                  {streamStatus === 'running' ? 'Live' : 'Stopped'}
                </Typography>
              </Box>
            </Box>
            
            {/* Center section - action buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1, 
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1
            }}>
              <Tooltip title="Take Screenshot">
                <span>
                  <IconButton 
                    size="small" 
                    onClick={handleTakeScreenshot} 
                    sx={{ color: '#ffffff' }}
                    disabled={!isConnected || isCapturing}
                  >
                    <PhotoCamera />
                  </IconButton>
                </span>
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
                <Tooltip title="Start Capture">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={handleStartCapture} 
                      sx={{ color: '#ffffff' }}
                      disabled={!isConnected}
                    >
                      <VideoCall />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              
              <Tooltip title="Restart Stream">
                <span>
                  <IconButton 
                    size="small" 
                    onClick={restartStream} 
                    sx={{ color: '#ffffff' }}
                    disabled={!isConnected || streamStatus === 'running' || isCapturing}
                  >
                    <Refresh />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            
            {/* Right section - minimize button */}
            <Box sx={{ 
              width: '40px', 
              display: 'flex', 
              justifyContent: 'flex-end'
            }}>
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

          {/* Main viewing area using new component architecture */}
          <Box sx={{ 
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            height: 'calc(100% - 48px)'
          }}>
            {renderViewComponent()}
          </Box>
        </Box>
      ) : (
        // Compact view - exact same layout as before
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
          {/* View component in compact mode */}
          {renderViewComponent()}

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