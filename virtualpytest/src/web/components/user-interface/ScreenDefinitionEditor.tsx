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
import { VerificationEditor } from './VerificationEditor';

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
  
  // Add state to track stop button click
  const [isStoppingCapture, setIsStoppingCapture] = useState(false);
  
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
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [savedFrameCount, setSavedFrameCount] = useState(0);
  
  // Screenshot loading state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  
  // Poll for frame count during capture - lightweight polling just for frame count
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCapturing && !isSaving) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/capture/status');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.current_frame !== undefined) {
              setSavedFrameCount(data.current_frame);
            }
          }
        } catch (error) {
          // Silently ignore polling errors during capture
        }
      }, 1000); // Check every second
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCapturing, isSaving]);
  
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
  
  // Start video capture - simplified for new architecture
  const handleStartCapture = async () => {
    console.log(`[@component:ScreenDefinitionEditor] handleStartCapture called - viewMode: ${viewMode}, isConnected: ${isConnected}, isCapturing: ${isCapturing}`);
    
    if (!isConnected || isCapturing) {
      console.log(`[@component:ScreenDefinitionEditor] Early return - isConnected: ${isConnected}, isCapturing: ${isCapturing}`);
      return;
    }
    
    // If already in capture mode (viewing saved frames), restart stream first, then start capturing
    if (viewMode === 'capture') {
      console.log('[@component:ScreenDefinitionEditor] Already in capture mode, restarting stream first...');
      setViewMode('stream');
      setLastScreenshotPath(undefined);
      setVideoFramesPath(undefined);
      setCurrentFrame(0);
      setTotalFrames(0);
      setSavedFrameCount(0);
      await restartStream();
      
      // After restart, automatically proceed with capture start
      console.log('[@component:ScreenDefinitionEditor] Stream restarted, now starting capture...');
      // Don't return here, continue with the capture logic below
    }
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Starting video capture...');
      
      // Reset frame count and set capturing state
      setSavedFrameCount(0);
      setIsCapturing(true);
      
      // If in screenshot view, restart stream first
      if (viewMode === 'screenshot') {
        await restartStream();
      }
      
      // Call the capture start API directly
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          device_model: deviceModel,
          video_device: avConfig?.video_device || '/dev/video0'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[@component:ScreenDefinitionEditor] Capture start API error:', errorText);
        setIsCapturing(false);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[@component:ScreenDefinitionEditor] Capture started successfully');
        // Stay in stream view - don't switch to capture view to avoid polling
        // setViewMode('capture'); // Commented out to avoid VideoCapture component polling
        console.log('[@component:ScreenDefinitionEditor] Capture running in background, no polling - wait for user to click stop');
      } else {
        console.error('[@component:ScreenDefinitionEditor] Capture start failed:', data.error);
        setIsCapturing(false);
      }
      
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to start capture:', error);
      setIsCapturing(false);
    }
  };

  // Stop video capture - simplified for new architecture
  const handleStopCapture = async () => {
    if (!isCapturing || isStoppingCapture) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Stopping video capture...');
      
      // Disable the stop button to prevent multiple clicks
      setIsStoppingCapture(true);
      
      // Show saving indicator - keep current frame count until we get actual count
      setIsSaving(true);
      // Don't reset frame count to 0 here - keep showing current count during saving
      
      // Call the capture stop API directly
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/capture/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[@component:ScreenDefinitionEditor] Capture stop API error:', errorText);
      } else {
        const data = await response.json();
        if (data.success) {
          console.log('[@component:ScreenDefinitionEditor] Capture stopped successfully');
          // Update frame count from API response - this is the final count
          const finalFrameCount = data.frames_downloaded || 0;
          setSavedFrameCount(finalFrameCount);
          
          // Set up for viewing captured frames
          if (finalFrameCount > 0) {
            setVideoFramesPath('/tmp/captures'); // Path where capture frames are stored
            setTotalFrames(finalFrameCount);
            setCurrentFrame(0); // Start with first frame
            setViewMode('capture'); // Switch to capture view
            console.log(`[@component:ScreenDefinitionEditor] Switching to capture view with ${finalFrameCount} frames`);
          } else {
            console.log('[@component:ScreenDefinitionEditor] No frames captured, staying in stream view');
          }
        } else {
          console.error('[@component:ScreenDefinitionEditor] Capture stop failed:', data.error);
          // If API fails, set to 0 as fallback
          setSavedFrameCount(0);
        }
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to stop capture:', error);
      // If there's an error, set to 0 as fallback
      setSavedFrameCount(0);
    } finally {
      // Always update local state
      setIsCapturing(false);
      setCaptureStats(null);
      
      // Reset the stopping state
      setIsStoppingCapture(false);
      
      // Keep saving indicator for a moment to show completion
      setTimeout(() => {
        setIsSaving(false);
        // Don't reset savedFrameCount here - keep it for display
      }, 2000);
    }
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
      
      // Clear drag selection when disconnecting
      setSelectedArea(null);
      
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
    
    try {
      // Set loading state
      setIsScreenshotLoading(true);
      // Switch to screenshot view immediately to remove highlight from other icons
      setViewMode('screenshot');
      
      // First stop the stream
      console.log('[@component:ScreenDefinitionEditor] Stopping stream before taking screenshot...');
      await stopStream();
      
      // Now take the screenshot
      console.log('[@component:ScreenDefinitionEditor] Taking screenshot...');
      
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
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
        // View mode already set to screenshot above
        
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
      // Always clear loading state
      setIsScreenshotLoading(false);
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

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    // Clear drag selection when collapsing
    if (isExpanded) {
      setSelectedArea(null);
    }
  };

  // Handle frame change in preview
  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
  };

  // Handle returning to stream view from capture view
  const handleBackToStream = () => {
    console.log('[@component:ScreenDefinitionEditor] Returning to stream view from capture view');
    setViewMode('stream');
    setVideoFramesPath(undefined);
    setCurrentFrame(0);
    setTotalFrames(0);
    setSavedFrameCount(0);
    // Clear drag selection when returning to stream
    setSelectedArea(null);
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
  
  // VerificationEditor integration state
  const [captureImageRef, setCaptureImageRef] = useState<React.RefObject<HTMLImageElement> | undefined>(undefined);
  const [captureImageDimensions, setCaptureImageDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const [captureSourcePath, setCaptureSourcePath] = useState<string | undefined>(undefined);

  // Drag selection state
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Initialize verification image state
  const handleImageLoad = useCallback((ref: React.RefObject<HTMLImageElement>, dimensions: { width: number; height: number }, sourcePath: string) => {
    console.log('[@component:ScreenDefinitionEditor] Image loaded for verification:', { dimensions, sourcePath });
    setCaptureImageRef(ref);
    setCaptureImageDimensions(dimensions);
    setCaptureSourcePath(sourcePath);
  }, []);

  // Handle area selection from drag overlay
  const handleAreaSelected = useCallback((area: { x: number; y: number; width: number; height: number }) => {
    console.log('[@component:ScreenDefinitionEditor] Area selected:', area);
    setSelectedArea(area);
  }, []);

  // Handle clearing selection
  const handleClearSelection = useCallback(() => {
    console.log('[@component:ScreenDefinitionEditor] Clearing selection');
    setSelectedArea(null);
  }, []);

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

    // Show the appropriate component based on viewMode (no special handling for isCapturing)
    switch (viewMode) {
      case 'screenshot':
        return (
          <ScreenshotCapture
            screenshotPath={lastScreenshotPath}
            resolutionInfo={resolutionInfo}
            isCapturing={false}
            isSaving={isSaving || isScreenshotLoading}
            onImageLoad={handleImageLoad}
            selectedArea={selectedArea}
            onAreaSelected={handleAreaSelected}
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
            onBackToStream={handleBackToStream}
            isSaving={isSaving}
            savedFrameCount={savedFrameCount}
            onImageLoad={handleImageLoad}
            selectedArea={selectedArea}
            onAreaSelected={handleAreaSelected}
            {...commonProps}
          />
        );
      
      case 'stream':
      default:
        return (
          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Stream viewer - always visible */}
            <StreamViewer
              streamUrl={streamUrl}
              isStreamActive={streamStatus === 'running' && !isScreenshotLoading}
              {...commonProps}
            />
            
            {/* Screenshot loading overlay */}
            {isScreenshotLoading && (
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                zIndex: 20
              }}>
                <CircularProgress size={40} sx={{ color: '#ffffff', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  Taking screenshot...
                </Typography>
              </Box>
            )}
            
            {/* Recording/Saving overlay - single overlay that shows either recording or saving */}
            {(isCapturing || isSaving) && (
              <Box sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                backgroundColor: isSaving ? 'transparent' : 'rgba(0,0,0,0.7)',
                borderRadius: isSaving ? 0 : 1,
                padding: isSaving ? '2px 4px' : '4px 8px',
                zIndex: 10
              }}>
                {/* Blinking dot - red for recording, green for saving */}
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isSaving ? '#4caf50' : '#f44336',
                  animation: isSaving ? 'saveBlink 0.8s infinite' : 'recordBlink 1s infinite',
                  '@keyframes recordBlink': {
                    '0%, 50%': { opacity: 1 },
                    '51%, 100%': { opacity: 0.3 }
                  },
                  '@keyframes saveBlink': {
                    '0%, 50%': { opacity: 1 },
                    '51%, 100%': { opacity: 0.5 }
                  }
                }} />
                <Typography variant="caption" sx={{ 
                  color: isSaving ? '#4caf50' : 'white', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold',
                  textShadow: isSaving ? '1px 1px 2px rgba(0,0,0,0.7)' : 'none'
                }}>
                  {isSaving ? `Saving ${savedFrameCount}` : `REC ${savedFrameCount}`}
                </Typography>
              </Box>
            )}
          </Box>
        );
    }
  };

  // Clear drag selection when view mode changes away from screenshot/capture
  useEffect(() => {
    if (viewMode === 'stream') {
      setSelectedArea(null);
    }
  }, [viewMode]);

  return (
    <Box sx={{ 
      position: 'fixed',
      bottom: 16,
      left: 16,
      display: 'flex',
      zIndex: 1000,
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      '& @keyframes blink': {
        '0%, 50%': { opacity: 1 },
        '51%, 100%': { opacity: 0.3 }
      }
    }}>
      {isExpanded ? (
        // Expanded view with VerificationEditor side panel
        <Box sx={{
          display: 'flex',
          gap: 0,
          boxShadow: 2,
          borderRadius: 1,
          overflow: 'hidden',
        }}>
          {/* Main Screen Definition Editor Panel */}
          <Box sx={{
            width: '350px',
            height: '520px',
            bgcolor: '#1E1E1E',
            border: '2px solid #1E1E1E',
            borderRadius: '1px 0 0 1px',
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
                {/* Simple connection status - no recording/saving states here */}
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
                      sx={{ 
                        color: (viewMode === 'screenshot' || isScreenshotLoading) ? '#ff4444' : '#ffffff',
                        borderBottom: (viewMode === 'screenshot' || isScreenshotLoading) ? '2px solid #ff4444' : 'none'
                      }}
                      disabled={!isConnected || isCapturing || isScreenshotLoading}
                    >
                      <PhotoCamera />
                    </IconButton>
                  </span>
                </Tooltip>
                
                {isCapturing ? (
                  <Tooltip title="Stop Capture">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={handleStopCapture} 
                        sx={{ 
                          color: (viewMode === 'capture' || isCapturing) ? '#ff4444' : '#ffffff',
                          borderBottom: (viewMode === 'capture' || isCapturing) ? '2px solid #ff4444' : 'none'
                        }}
                        disabled={isStoppingCapture}
                      >
                        <StopCircle />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Start Capture">
                    <span>
                      <IconButton 
                        size="small" 
                        onClick={handleStartCapture} 
                        sx={{ 
                          color: (viewMode === 'capture' || isCapturing) ? '#ff4444' : '#ffffff',
                          borderBottom: (viewMode === 'capture' || isCapturing) ? '2px solid #ff4444' : 'none'
                        }}
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
                      disabled={!isConnected || isCapturing}
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
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={handleToggleExpanded}
                      sx={{ color: '#ffffff' }}
                    >
                      <FullscreenExit />
                    </IconButton>
                  </span>
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

          {/* Verification Editor Side Panel - only show during capture or screenshot modes */}
          {(viewMode === 'screenshot' || viewMode === 'capture') && (
            <VerificationEditor
              isVisible={true}
              isScreenshotMode={viewMode === 'screenshot'}
              isCaptureActive={isCapturing}
              captureImageRef={captureImageRef}
              captureImageDimensions={captureImageDimensions}
              captureSourcePath={captureSourcePath}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              onClearSelection={handleClearSelection}
              sx={{
                backgroundColor: '#1E1E1E',
                borderRadius: '0 1px 1px 0',
                border: '2px solid #1E1E1E',
                borderLeft: 'none',
                color: '#ffffff',
                '& .MuiTypography-root': {
                  color: '#ffffff',
                },
                '& .MuiTextField-root': {
                  '& .MuiInputLabel-root': {
                    color: '#ffffff',
                  },
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
                    '& fieldset': {
                      borderColor: '#333',
                    },
                    '&:hover fieldset': {
                      borderColor: '#555',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#666',
                    },
                  },
                },
                '& .MuiSelect-root': {
                  color: '#ffffff',
                },
                '& .MuiFormControl-root': {
                  '& .MuiInputLabel-root': {
                    color: '#ffffff',
                  },
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
                    '& fieldset': {
                      borderColor: '#333',
                    },
                  },
                },
              }}
            />
          )}
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

          {/* Mode indicator dot */}
          <Box sx={{ 
            position: 'absolute',
            top: 4,
            left: 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 
              viewMode === 'screenshot' || viewMode === 'capture' ? '#ff4444' : 'transparent',
            opacity: 
              viewMode === 'screenshot' || viewMode === 'capture' ? 1 : 0,
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            zIndex: 2
          }} />

          {/* Only the expand button - recording/saving indicators are now overlays within the stream */}
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