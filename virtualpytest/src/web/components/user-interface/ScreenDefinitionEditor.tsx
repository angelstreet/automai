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

  // Additional state for capture management
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | null>(null);
  const [screenshotTimestamp, setScreenshotTimestamp] = useState<number>(0); // Add timestamp for cache busting
  const [videoFramesPath, setVideoFramesPath] = useState<string>('/tmp/capture_1-600');
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<'screenshot' | 'video'>('screenshot');
  
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

  // Manual status update function - no polling
  const updateCaptureStatus = async () => {
    if (sshSessionRef.current?.sessionId) {
      try {
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/get-capture-status', {
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
          setCaptureStats(result);
          
          // Update total frames when capturing
          if (result.frame_count !== totalFrames) {
            setTotalFrames(result.frame_count);
          }
          
          // Update last screenshot path if available
          if (result.last_screenshot && result.last_screenshot !== lastScreenshotPath) {
            setLastScreenshotPath(result.last_screenshot);
          }
          
          // Set capture mode based on what's active
          if (result.is_capturing && previewMode !== 'video') {
            setPreviewMode('video');
          }
        }
        return result;
      } catch (error) {
        console.error('[@component:ScreenDefinitionEditor] Stats update error:', error);
        return null;
      }
    }
    return null;
  };

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
        
        // Get initial status after connection
        await updateCaptureStatus();
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

  // Handle screenshot capture
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
        console.log(`[@component:ScreenDefinitionEditor] Screenshot saved:`, {
          path: result.screenshot_path,
          latest: result.latest_path
        });
        
        // Store the screenshot path
        setLastScreenshotPath(result.screenshot_path);
        
        // Update timestamp to force component to re-render with new image
        setScreenshotTimestamp(Date.now());
        
        // Switch to screenshot preview mode
        setPreviewMode('screenshot');
        
        // Expand the preview if not already expanded
        if (!isExpanded) {
          setIsExpanded(true);
        }
        
        // Update capture status after taking screenshot
        await updateCaptureStatus();
      } else {
        console.error('[@component:ScreenDefinitionEditor] Screenshot failed:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Screenshot error:', error);
    }
  };

  // Start video capture 
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
        setTotalFrames(result.frame_count);
        setCurrentFrame(0);
        setPreviewMode('video');
        console.log('[@component:ScreenDefinitionEditor] Video capture started');
        
        // Update capture status after starting capture
        await updateCaptureStatus();
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
        setTotalFrames(result.frame_count);
        console.log('[@component:ScreenDefinitionEditor] Video capture stopped');
        
        // Update capture status after stopping capture
        await updateCaptureStatus();
      } else {
        console.error('[@component:ScreenDefinitionEditor] Failed to stop capture:', result.error);
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Stop capture error:', error);
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
    
    // Update status when expanding
    if (!isExpanded) {
      updateCaptureStatus();
    }
  };

  // Handle frame change in preview
  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
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
      display: 'flex',
      zIndex: 1000,
    }}>
      {isExpanded ? (
        // Expanded view with grid layout
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '250px 300px',
          gridGap: 0,
          height: '500px',
          boxShadow: 2,
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          {/* Main editor component */}
          <Box sx={{ 
            bgcolor: '#000000',
            border: '2px solid #000000',
            borderRight: 'none',
            display: 'flex',
            flexDirection: 'column'
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

          {/* Preview editor without margin */}
          <CapturePreviewEditor
            mode={previewMode}
            screenshotPath={`/tmp/screenshots/${deviceModel}.jpg?t=${screenshotTimestamp}`}
            videoFramesPath={videoFramesPath}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            onFrameChange={handleFrameChange}
            sx={{
              borderTopRightRadius: 1,
              borderBottomRightRadius: 1,
              borderLeft: 'none',
              ml: 0
            }}
          />
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