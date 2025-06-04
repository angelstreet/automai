import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRemoteConnection } from '../../hooks/remote/useRemoteConnection';
import { AndroidMobileCore } from './AndroidMobileCore';
import { AndroidMobileOverlay } from './AndroidMobileOverlay';
import { AndroidElement } from '../../types/remote/types';
import { BaseConnectionConfig } from '../../types/remote/remoteTypes';

interface CompactAndroidMobileProps {
  /** Optional pre-configured connection parameters */
  connectionConfig?: BaseConnectionConfig;
  /** Whether to auto-connect on mount if config is provided */
  autoConnect?: boolean;
  /** Custom styling */
  sx?: any;
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
}

export function CompactAndroidMobile({
  connectionConfig,
  autoConnect = false,
  sx = {},
  onDisconnectComplete,
}: CompactAndroidMobileProps) {
  // UI state
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [deviceResolution, setDeviceResolution] = useState({ width: 1080, height: 2340 });

  // Auto-dump functionality
  const [isAutoDumpScheduled, setIsAutoDumpScheduled] = useState(false);
  const autoDumpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotRef = useRef<HTMLImageElement>(null);
  
  // Track if we've already initialized to prevent duplicate calls
  const isInitializedRef = useRef(false);
  // Track if we've already attempted auto-connection to prevent retries
  const connectionAttemptedRef = useRef(false);

  // Use the extended remote connection hook for Android mobile
  const {
    session,
    connectionForm,
    setConnectionForm,
    connectionLoading,
    connectionError,
    androidElements,
    androidApps,
    androidScreenshot,
    deviceId,
    handleTakeControl,
    handleReleaseControl,
    handleRemoteCommand,
    handleScreenshotAndDumpUI,
    handleClickElement,
    handleGetApps,
    clearElements,
    fetchDefaultValues,
  } = useRemoteConnection('android-mobile');

  // Initialize connection form with provided config or fetch defaults
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      if (connectionConfig) {
        console.log('[@component:CompactAndroidMobile] Initializing with provided config');
        setConnectionForm({
          host_ip: connectionConfig.host_ip,
          host_port: connectionConfig.host_port || '22',
          host_username: connectionConfig.host_username,
          host_password: connectionConfig.host_password,
          device_ip: connectionConfig.device_ip,
          device_port: connectionConfig.device_port || '5555',
        });
      } else {
        console.log('[@component:CompactAndroidMobile] No config provided, fetching defaults');
        fetchDefaultValues();
      }
    }
  }, [connectionConfig, fetchDefaultValues, setConnectionForm]);

  // Auto-connect when config is provided
  useEffect(() => {
    const hasRequiredFields = connectionForm.host_ip && 
                             connectionForm.host_username && 
                             connectionForm.host_password && 
                             connectionForm.device_ip;
                             
    if (autoConnect && 
        connectionConfig && 
        !session.connected && 
        !connectionLoading && 
        isInitializedRef.current && 
        hasRequiredFields && 
        !connectionAttemptedRef.current) {
      console.log('[@component:CompactAndroidMobile] Auto-connecting to Android Mobile...');
      handleTakeControl();
      connectionAttemptedRef.current = true;
    }
  }, [autoConnect, connectionConfig, session.connected, connectionLoading, handleTakeControl, connectionForm]);

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    if (!showOverlay) return;

    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    setIsAutoDumpScheduled(true);

    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:CompactAndroidMobile] Auto-dumping UI elements after action');
      setIsAutoDumpScheduled(false);
      handleDumpUIWithLoading();
    }, 1200);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
      }
    };
  }, []);

  // Enhanced dump UI handler with loading state
  const handleDumpUIWithLoading = async () => {
    setIsDumpingUI(true);
    setDumpError(null);
    try {
      await handleScreenshotAndDumpUI();
      console.log('[@component:CompactAndroidMobile] Screenshot and UI dump completed, elements found:', androidElements.length);
      setShowOverlay(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to take screenshot and dump UI';
      setDumpError(errorMessage);
      console.error('[@component:CompactAndroidMobile] Screenshot and UI dump failed:', error);
    } finally {
      setIsDumpingUI(false);
    }
  };

  // Handle element click from overlay
  const handleOverlayElementClick = async (element: AndroidElement) => {
    console.log(`[@component:CompactAndroidMobile] Received overlay click for element ID ${element.id}`);
    
    try {
      await handleClickElement(element);
      setSelectedElement(element.id.toString());
      scheduleAutoDump();
    } catch (error: any) {
      console.error('[@component:CompactAndroidMobile] Element click failed:', error);
      setDumpError(`Element click failed: ${error.message}`);
    }
  };

  // Create a function to only hide the overlay without clearing elements
  const handleClearOverlay = () => {
    console.log('[@component:CompactAndroidMobile] Clearing overlay only, preserving element selection');
    setShowOverlay(false);
    // Note: We're NOT calling clearElements() here so the dropdown selection is preserved
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      // Clear overlay when disconnecting
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
        autoDumpTimerRef.current = null;
        setIsAutoDumpScheduled(false);
      }
      setShowOverlay(false);
      setDumpError(null);
      
      await handleReleaseControl();
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:CompactAndroidMobile] Release control failed:', error);
    }
  };

  // Update device resolution when screenshot is available
  useEffect(() => {
    if (androidScreenshot && screenshotRef.current) {
      setDeviceResolution({ width: 1080, height: 2340 });
    }
  }, [androidScreenshot]);

  // Auto-show overlay when elements are available
  useEffect(() => {
    console.log(`[@component:CompactAndroidMobile] Elements updated: ${androidElements.length} elements`);
    if (androidElements.length > 0) {
      console.log(`[@component:CompactAndroidMobile] Auto-showing overlay for ${androidElements.length} elements`);
      setShowOverlay(true);
    }
  }, [androidElements]);

  // For compact view, show loading or remote directly
  if (!session.connected) {
    // If auto-connecting or has config, show minimal loading state
    if (autoConnect && connectionConfig) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          ...sx 
        }}>
          {connectionLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="info.main">
                Connecting...
              </Typography>
            </Box>
          ) : connectionError ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="error" gutterBottom>
                Connection Failed
              </Typography>
              <Button
                variant="outlined"
                onClick={handleTakeControl}
                disabled={connectionLoading}
                size="small"
              >
                Retry
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Initializing...
            </Typography>
          )}
        </Box>
      );
    }
    
    // Manual connection display (when no auto-connect)
    return (
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        ...sx 
      }}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Android Mobile Not Connected
        </Typography>
        
        {connectionLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="info.main">
              Connecting...
            </Typography>
          </Box>
        ) : connectionConfig ? (
          <Button
            variant="contained"
            onClick={handleTakeControl}
            disabled={connectionLoading}
            size="small"
            sx={{ mb: 2 }}
          >
            Connect
          </Button>
        ) : (
          <Typography variant="caption" color="warning.main" textAlign="center" sx={{ mb: 2 }}>
            No device configuration
          </Typography>
        )}
        
        {connectionError && (
          <Box sx={{ 
            mt: 1, 
            p: 1, 
            bgcolor: 'error.light', 
            borderRadius: 1, 
            maxWidth: '100%',
            wordBreak: 'break-word'
          }}>
            <Typography variant="caption" color="error" textAlign="center">
              {connectionError}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Connected state - Use AndroidMobileCore with compact style
  return (
    <Box sx={{ 
      ...sx,
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%' 
    }}>
      {/* Connection Status */}
      {!session.connected ? (
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 2,
          flex: 1,
          justifyContent: 'center'
        }}>
          <Typography variant="h6" textAlign="center">
            {connectionConfig ? 'Auto-connecting...' : 'No Connection'}
          </Typography>
          
          {connectionConfig ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">
                Connecting to Android Mobile
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary" textAlign="center">
              No device configuration provided for auto-connect
            </Typography>
          )}

          {connectionError && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {connectionError}
            </Alert>
          )}
        </Box>
      ) : (
        <Box sx={{ 
          p: 2, 
          flex: 1, 
          overflow: 'auto',
          // Compact-specific styling - maxWidth and centered
          maxWidth: '250px',
          margin: '0 auto',
          width: '100%'
        }}>
          <AndroidMobileCore
            session={session}
            connectionLoading={connectionLoading}
            connectionError={connectionError}
            dumpError={dumpError}
            androidApps={androidApps}
            androidElements={androidElements}
            isDumpingUI={isDumpingUI}
            selectedApp={selectedApp}
            selectedElement={selectedElement}
            setSelectedApp={setSelectedApp}
            setSelectedElement={setSelectedElement}
            handleGetApps={handleGetApps}
            handleDumpUIWithLoading={handleDumpUIWithLoading}
            clearElements={handleClearOverlay}
            handleRemoteCommand={handleRemoteCommand}
            handleOverlayElementClick={handleOverlayElementClick}
            onDisconnect={handleDisconnect}
            handleReleaseControl={handleReleaseControl}
          />
        </Box>
      )}

      {/* AndroidMobileOverlay - positioned outside */}
      {showOverlay && androidElements.length > 0 && (
        <div style={{ 
          position: 'fixed',
          left: '83px',
          top: '170px',
          zIndex: 99999999, // Much higher z-index to ensure it's on top of everything
          pointerEvents: 'all',
          transformOrigin: 'top left',
          transform: 'scale(0.2, 0.2)', // Separate scaleX and scaleY values
          
          background: 'rgba(0,0,0,0.01)' // Add a barely visible background to help with layer creation
        }}>
          <AndroidMobileOverlay
            elements={androidElements}
            screenshotElement={screenshotRef.current}
            deviceWidth={deviceResolution.width}
            deviceHeight={deviceResolution.height}
            isVisible={showOverlay}
            selectedElementId={selectedElement ? parseInt(selectedElement) : undefined}
            onElementClick={handleOverlayElementClick}
          />
        </div>
      )}
    </Box>
  );
} 