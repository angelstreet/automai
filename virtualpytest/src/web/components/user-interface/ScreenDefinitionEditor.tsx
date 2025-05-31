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

  // Add stream status monitoring
  useEffect(() => {
    if (isConnected && avConfig?.stream_url) {
      console.log('[@component:ScreenDefinitionEditor] Attempting to load stream from:', avConfig.stream_url);
    }
  }, [isConnected, avConfig?.stream_url]);

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

  // Take screenshot using FFmpeg HDMI capture via SSH (simplified, no polling)
  const handleTakeScreenshot = async () => {
    if (!avConfig || !isConnected) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Taking HDMI screenshot via FFmpeg from HLS stream');
      
      // Use new stream-based route to avoid device conflict
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot_from_stream', {
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
        throw new Error(`FFmpeg capture failed: ${errorText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        console.log(`[@component:ScreenDefinitionEditor] FFmpeg HDMI screenshot saved: ${result.screenshot_path}`);
        
        // Use the file path from FFmpeg capture
        if (result.screenshot_path && result.screenshot_path !== lastScreenshotPath) {
          setLastScreenshotPath(result.screenshot_path);
        }
        
        // Switch to screenshot preview mode
        setPreviewMode('screenshot');
        
        // Expand the preview if not already expanded
        if (!isExpanded) {
          setIsExpanded(true);
        }
      } else {
        console.error('[@component:ScreenDefinitionEditor] FFmpeg HDMI screenshot failed:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] FFmpeg HDMI screenshot error:', error);
    }
  };

  // Start video capture (simplified - remote system focused on screenshots)
  const handleStartCapture = async () => {
    console.log('[@component:ScreenDefinitionEditor] Video capture not implemented for remote system');
    // The remote system doesn't have video capture, only screenshots
    // Keep this as a placeholder for future implementation
  };

  // Stop video capture (simplified - remote system focused on screenshots)  
  const handleStopCapture = async () => {
    console.log('[@component:ScreenDefinitionEditor] Video capture not implemented for remote system');
    // The remote system doesn't have video capture, only screenshots
    // Keep this as a placeholder for future implementation
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
          width: '550px',
          height: '520px',
          boxShadow: 2,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#000000',
          border: '2px solid #000000',
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
            />
          </Box>
        </Box>
      ) : (
        // Compact view code
        <Box sx={{ 
          width: '150px',
          height: '250px',
          bgcolor: '#000000',
          border: '2px solid #000000',
          borderRadius: 1,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 2,
          transition: 'all 0.3s ease-in-out',
          ...sx 
        }}>
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
              lastScreenshotPath={lastScreenshotPath}
              previewMode={previewMode}
              onScreenshotTaken={handleScreenshotTaken}
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
        </Box>
      )}
    </Box>
  );
} 