import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { getVerificationEditorLayout } from '../../../config/layoutConfig';

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

// Separate component for recording timer to avoid parent re-renders
const RecordingTimer: React.FC<{ isCapturing: boolean }> = ({ isCapturing }) => {
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCapturing) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCapturing]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Typography variant="caption" sx={{ 
      color: 'white', 
      fontSize: '0.7rem', 
      fontWeight: 'bold'
    }}>
      REC {formatRecordingTime(recordingTime)}
    </Typography>
  );
};

export function ScreenDefinitionEditor({
  deviceConfig,
  deviceModel,
  autoConnect = false,
  onDisconnectComplete,
  sx = {}
}: ScreenDefinitionEditorProps) {
  // Debug parent component re-renders
  useEffect(() => {
    console.log('[@component:ScreenDefinitionEditor] Component mounted/re-rendered with props:', {
      deviceModel,
      autoConnect,
      hasDeviceConfig: !!deviceConfig,
      hasOnDisconnectComplete: !!onDisconnectComplete
    });
  });

  // Memoize layout configs to prevent new object references
  const compactLayoutConfig = useMemo(() => ({
    minHeight: deviceModel === 'android_mobile' ? '300px' : '250px',
    aspectRatio: deviceModel === 'android_mobile' ? '3/5' : '8/5',
    objectFit: 'cover' as const,
    isMobileModel: deviceModel === 'android_mobile',
  }), [deviceModel]);

  // Get verification editor layout config for parent container sizing
  const verificationEditorLayout = useMemo(() => {
    const config = getVerificationEditorLayout(deviceModel);
    console.log('[@component:ScreenDefinitionEditor] Verification editor layout config:', {
      deviceModel,
      config
    });
    return config;
  }, [deviceModel]);

  // Connection state - simplified
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Additional state for capture management
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | undefined>(undefined);
  const [videoFramesPath, setVideoFramesPath] = useState<string | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [viewMode, setViewMode] = useState<'stream' | 'screenshot' | 'capture'>('stream');
  
  // Memoize sx props to prevent new object references
  const streamViewerSx = useMemo(() => ({
    width: '100%',
    height: '100%',
    display: viewMode === 'stream' ? 'block' : 'none'
  }), [viewMode]);
  
  // Memoize deviceResolution to prevent new object references
  const deviceResolution = useMemo(() => ({ width: 1080, height: 2340 }), []);
  
  // Memoize onTap callback to prevent new function references
  const handleTap = useCallback((x: number, y: number) => {
    console.log(`🎯 [TEST] Tapped at device coordinates: ${x}, ${y}`);
  }, []);
  
  // Stream status state - without polling
  const [streamStatus, setStreamStatus] = useState<'running' | 'stopped' | 'unknown'>('running');
  
  // Video capture state - simplified for new timestamp-only logic
  const [captureFrames, setCaptureFrames] = useState<string[]>([]);
  
  // Capture timing state - core of new simple logic
  const [captureStartTime, setCaptureStartTime] = useState<Date | null>(null);
  const [captureEndTime, setCaptureEndTime] = useState<Date | null>(null);
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [savedFrameCount, setSavedFrameCount] = useState(0);
  
  // Capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStoppingCapture, setIsStoppingCapture] = useState(false);
  
  // Remove obsolete capture stats and polling
  const [captureStats, setCaptureStats] = useState<any>(null);
  
  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Debug key state changes that might cause re-renders
  useEffect(() => {
    console.log('[@component:ScreenDefinitionEditor] viewMode changed:', viewMode);
  }, [viewMode]);

  useEffect(() => {
    console.log('[@component:ScreenDefinitionEditor] isExpanded changed:', isExpanded);
  }, [isExpanded]);

  useEffect(() => {
    console.log('[@component:ScreenDefinitionEditor] isCapturing changed:', isCapturing);
  }, [isCapturing]);
  
  // Extract AV config for easier access
  const avConfig = deviceConfig?.av?.parameters;
  
  // Screenshot loading state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  
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
          console.log('[@component:ScreenDefinitionEditor] Initial stream status check failed, assuming stream is running...');
          // Assume stream is running instead of trying to restart it
          setStreamStatus('running');
          return;
        }
        
        const data = await response.json();
        if (data.success) {
          if (data.is_active) {
            setStreamStatus('running');
          } else {
            // Check if SSH is active before attempting restart
            if (data.ssh_active === false) {
              console.log('[@component:ScreenDefinitionEditor] Stream is stopped but SSH is not active. Marking stream as running without restart.');
              setStreamStatus('running');
            } else {
              setStreamStatus('stopped');
              // Automatically attempt to restart if stream is stopped and SSH is active
              console.log('[@component:ScreenDefinitionEditor] Stream is stopped, attempting automatic restart...');
              // setTimeout(() => restartStream(), 1000); // Commented out automatic restart
            }
          }
        } else {
          // If we can't determine status, assume stream is running instead of trying to restart
          console.log('[@component:ScreenDefinitionEditor] Stream status unknown, assuming stream is running...');
          setStreamStatus('running');
        }
      } catch (error) {
        // Just set status to running and don't attempt restart
        console.log('[@component:ScreenDefinitionEditor] Stream status check unavailable, assuming stream is running...');
        setStreamStatus('running');
      }
    };

    if (isConnected) {
      checkInitialStatus();
    }
  }, [isConnected]);
  
  // Start video capture - new simple logic: just record timestamp and show LED
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
      setCaptureStartTime(null);
      setCaptureEndTime(null);
      await restartStream();
      
      // After restart, automatically proceed with capture start
      console.log('[@component:ScreenDefinitionEditor] Stream restarted, now starting capture...');
    }
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Starting video capture (timestamp tracking only)...');
      
      // Record capture start time in Zurich timezone
      const startTime = new Date();
      setCaptureStartTime(startTime);
      setCaptureEndTime(null); // Clear end time
      
      console.log('[@component:ScreenDefinitionEditor] Capture start time:', startTime.toISOString());
      
      // Reset frame count and set capturing state (just for UI)
      setSavedFrameCount(0);
      setIsCapturing(true);
      
      // If in screenshot view, restart stream first
      if (viewMode === 'screenshot') {
        await restartStream();
      }
      
      // No backend API calls - host handles capture automatically
      console.log('[@component:ScreenDefinitionEditor] Capture started - host will handle frame capture automatically');
      console.log('[@component:ScreenDefinitionEditor] Showing red LED, staying in stream view');
      
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to start capture:', error);
      setIsCapturing(false);
      setCaptureStartTime(null);
    }
  };

  // Stop video capture - new simple logic: calculate duration and switch to video view
  const handleStopCapture = async () => {
    if (!isCapturing || isStoppingCapture) return;
    
    try {
      console.log('[@component:ScreenDefinitionEditor] Stopping video capture (timestamp tracking only)...');
      
      // Record capture end time
      const endTime = new Date();
      setCaptureEndTime(endTime);
      
      console.log('[@component:ScreenDefinitionEditor] Capture end time:', endTime.toISOString());
      
      // Calculate duration and expected frame count (1 frame per second)
      let expectedFrames = 0;
      if (captureStartTime) {
        const durationMs = endTime.getTime() - captureStartTime.getTime();
        const durationSeconds = Math.floor(durationMs / 1000);
        expectedFrames = Math.max(1, durationSeconds); // At least 1 frame
        console.log(`[@component:ScreenDefinitionEditor] Capture duration: ${durationSeconds}s, expected frames: ${expectedFrames}`);
      }
      
      // Disable the stop button to prevent multiple clicks
      setIsStoppingCapture(true);
      
      // No backend API calls - just local state management
      console.log('[@component:ScreenDefinitionEditor] Capture stopped - no backend calls needed');
      
      // Set up for viewing captured frames
      if (expectedFrames > 0) {
        setSavedFrameCount(expectedFrames);
        setVideoFramesPath('/tmp/captures'); // Not used, but kept for compatibility
        setTotalFrames(expectedFrames);
        setCurrentFrame(0); // Start with first frame
        setViewMode('capture'); // Switch to capture view
        console.log(`[@component:ScreenDefinitionEditor] Switching to capture view with ${expectedFrames} frames`);
      } else {
        console.log('[@component:ScreenDefinitionEditor] No frames expected (duration too short), staying in stream view');
      }
      
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to stop capture:', error);
      // Use expected frames as fallback
      if (captureStartTime) {
        const endTime = new Date();
        const durationMs = endTime.getTime() - captureStartTime.getTime();
        const expectedFrames = Math.max(1, Math.floor(durationMs / 1000));
        setSavedFrameCount(expectedFrames);
        if (expectedFrames > 0) {
          setVideoFramesPath('/tmp/captures');
          setTotalFrames(expectedFrames);
          setCurrentFrame(0);
          setViewMode('capture');
        }
      }
    } finally {
      // Always update local state
      setIsCapturing(false);
      setCaptureStats(null);
      
      // Reset the stopping state
      setIsStoppingCapture(false);
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

  // Take screenshot using direct host URL construction
  const handleTakeScreenshot = async () => {
    if (!isConnected) return;
    
    try {
      setIsScreenshotLoading(true);
      setViewMode('screenshot');
      
      console.log('[@component:ScreenDefinitionEditor] Generating Zurich timezone timestamp for screenshot...');
      
      // Generate timestamp in Zurich timezone (Europe/Zurich) in format: YYYYMMDDHHMMSS
      const now = new Date();
      const zurichTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Zurich"}));
      
      // Format: YYYYMMDDHHMMSS (no separators)
      const year = zurichTime.getFullYear();
      const month = String(zurichTime.getMonth() + 1).padStart(2, '0');
      const day = String(zurichTime.getDate()).padStart(2, '0');
      const hours = String(zurichTime.getHours()).padStart(2, '0');
      const minutes = String(zurichTime.getMinutes()).padStart(2, '0');
      const seconds = String(zurichTime.getSeconds()).padStart(2, '0');
      
      const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      
      console.log('[@component:ScreenDefinitionEditor] Using Zurich timestamp:', timestamp);
      
      const hostUrl = `https://${avConfig?.host_ip}:444/stream/captures/capture_${timestamp}.jpg`;
      
      console.log('[@component:ScreenDefinitionEditor] Built host screenshot URL:', hostUrl);
      
      // Add 300ms delay before displaying the screenshot to account for real-time stream capture
      console.log('[@component:ScreenDefinitionEditor] Adding 600ms delay before displaying screenshot...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Set the host URL directly - no file transfer needed
      setLastScreenshotPath(hostUrl);
      setStreamStatus('stopped');
      
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Screenshot operation failed:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  };

  // Restart stream - simplified to just reload the player
  const restartStream = async () => {
    try {
      console.log('[@component:ScreenDefinitionEditor] Reloading stream in player...');
      
      // Simply switch to stream view and let the StreamViewer component handle reloading
      setStreamStatus('running');
      setViewMode('stream');
      setLastScreenshotPath(undefined);
      setVideoFramesPath(undefined);
      setCurrentFrame(0);
      setTotalFrames(0);
      setSavedFrameCount(0);
      
      // Log the stream URL that will be used
      if (avConfig?.stream_url) {
        console.log(`[@component:ScreenDefinitionEditor] Stream URL: ${avConfig.stream_url}`);
      } else if (avConfig?.host_ip) {
        const streamUrl = `https://${avConfig.host_ip}:444/stream/output.m3u8`;
        console.log(`[@component:ScreenDefinitionEditor] Stream URL: ${streamUrl}`);
      }
      
      console.log('[@component:ScreenDefinitionEditor] Stream player will reload automatically');
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Error during stream reload:', error);
    }
  };

  const handleToggleExpanded = async () => {
    // If we're collapsing and currently in capture or screenshot view, restart stream
    if (isExpanded && (viewMode === 'capture' || viewMode === 'screenshot')) {
      console.log('[@component:ScreenDefinitionEditor] Collapsing from capture/screenshot view, restarting stream...');
      await restartStream();
    }
    
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

  // VerificationEditor integration state
  const [captureImageRef, setCaptureImageRef] = useState<React.RefObject<HTMLImageElement> | undefined>(undefined);
  const [captureImageDimensions, setCaptureImageDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const [captureSourcePath, setCaptureSourcePath] = useState<string | undefined>(undefined);

  // Drag selection state
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Compute the real stream URL based on config
  const getStreamUrl = useCallback(() => {
    if (avConfig?.stream_url) {
      // Use the configured stream URL if available
      return avConfig.stream_url;
    } else if (avConfig?.host_ip) {
      // Try HTTPS URL first, but note that it might need to be HTTP depending on the server config
      return `https://${avConfig.host_ip}:444/stream/output.m3u8`;
    }
    return undefined;
  }, [avConfig]);

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

  // Clear drag selection when view mode changes away from screenshot/capture
  useEffect(() => {
    if (viewMode === 'stream') {
      setSelectedArea(null);
    }
  }, [viewMode]);

  return (
    <Box sx={{ 
      position: 'fixed',
      bottom: 0,
      left: 0,
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
            width: verificationEditorLayout.width,
            height: verificationEditorLayout.height,
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
              {/* Stream viewer - always rendered at top level to prevent unmount/remount */}
              <StreamViewer
                key="main-stream-viewer"
                streamUrl={getStreamUrl()}
                isStreamActive={streamStatus === 'running' && !isScreenshotLoading}
                isCapturing={isCapturing}
                model={deviceModel}
                layoutConfig={!isExpanded ? compactLayoutConfig : undefined}
                enableClick={true}
                deviceResolution={deviceResolution}
                deviceId={avConfig?.host_ip ? `${avConfig.host_ip}:5555` : undefined}
                onTap={handleTap}
                sx={streamViewerSx}
              />
              
              {/* Other components rendered on top when needed */}
              {viewMode === 'screenshot' && (
                <ScreenshotCapture
                  screenshotPath={lastScreenshotPath}
                  resolutionInfo={resolutionInfo}
                  isCapturing={false}
                  isSaving={isSaving || isScreenshotLoading}
                  onImageLoad={handleImageLoad}
                  selectedArea={selectedArea}
                  onAreaSelected={handleAreaSelected}
                  model={deviceModel}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 5
                  }}
                />
              )}
              
              {viewMode === 'capture' && (
                <VideoCapture
                  deviceModel={deviceModel}
                  videoDevice={avConfig?.video_device}
                  hostIp={avConfig?.host_ip}
                  hostPort={avConfig?.host_port}
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
                  captureStartTime={captureStartTime}
                  captureEndTime={captureEndTime}
                  isCapturing={isCapturing}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 5
                  }}
                />
              )}
              
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
              
              {/* Recording overlay - only show red dot when capturing */}
              {isCapturing && (
                <Box sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 1,
                  padding: '4px 8px',
                  zIndex: 10
                }}>
                  <Box sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#f44336',
                    animation: 'recordBlink 1s infinite',
                    '@keyframes recordBlink': {
                      '0%, 50%': { opacity: 1 },
                      '51%, 100%': { opacity: 0.3 }
                    }
                  }} />
                  <RecordingTimer isCapturing={isCapturing} />
                </Box>
              )}
            </Box>
          </Box>

          {/* Verification Editor Side Panel - only show during capture or screenshot modes */}
          {(viewMode === 'screenshot' || viewMode === 'capture') && (
            <VerificationEditor
              model={deviceModel}
              isVisible={true}
              isScreenshotMode={viewMode === 'screenshot'}
              isCaptureActive={isCapturing}
              captureImageRef={captureImageRef}
              captureImageDimensions={captureImageDimensions}
              captureSourcePath={captureSourcePath}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              onClearSelection={handleClearSelection}
              screenshotPath={lastScreenshotPath}
              videoFramesPath={videoFramesPath}
              totalFrames={totalFrames}
              currentFrame={currentFrame}
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
          width: deviceModel === 'android_mobile' ? '180px' : '400px', // Wider for landscape models
          height: deviceModel === 'android_mobile' ? '300px' : '250',
          bgcolor: '#1E1E1E',
          border: '2px solid #1E1E1E',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 2,
        }}>
          {/* Stream viewer - always rendered to prevent unmount/remount */}
          <StreamViewer
            key="compact-stream-viewer"
            streamUrl={getStreamUrl()}
            isStreamActive={streamStatus === 'running' && !isScreenshotLoading}
            isCapturing={isCapturing}
            model={deviceModel}
            layoutConfig={compactLayoutConfig}
            enableClick={true}
            deviceResolution={deviceResolution}
            deviceId={avConfig?.host_ip ? `${avConfig.host_ip}:5555` : undefined}
            onTap={handleTap}
            sx={streamViewerSx}
          />
          
          {/* Other components rendered on top when needed */}
          {viewMode === 'screenshot' && (
            <ScreenshotCapture
              screenshotPath={lastScreenshotPath}
              resolutionInfo={resolutionInfo}
              isCapturing={false}
              isSaving={isSaving || isScreenshotLoading}
              onImageLoad={handleImageLoad}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              model={deviceModel}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 5
              }}
            />
          )}
          
          {viewMode === 'capture' && (
            <VideoCapture
              deviceModel={deviceModel}
              videoDevice={avConfig?.video_device}
              hostIp={avConfig?.host_ip}
              hostPort={avConfig?.host_port}
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
              captureStartTime={captureStartTime}
              captureEndTime={captureEndTime}
              isCapturing={isCapturing}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 5
              }}
            />
          )}

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

