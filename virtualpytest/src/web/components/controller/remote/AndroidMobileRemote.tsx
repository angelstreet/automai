import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Alert } from '@mui/material';

import { useRemoteConnection } from '../../../hooks/controller/useRemoteConnection';
import { AndroidMobileControls } from './AndroidMobileControls';
import { AndroidMobileOverlay } from './AndroidMobileOverlay';
import { AndroidElement } from '../../../types/controller/Remote_Types';

// Simple layout config - create inline since the file doesn't exist
const getRemoteLayout = () => ({
  containerWidth: 300,
  containerHeight: 600
});

export function AndroidMobileRemote({
  onDisconnectComplete,
  sx = {},
}: {
  /** Callback when disconnect is complete */
  onDisconnectComplete?: () => void;
  /** Custom styling */
  sx?: any;
}) {
  // UI state
  const [isDumpingUI, setIsDumpingUI] = useState(false);
  const [dumpError, setDumpError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState('');
  const [selectedElement, setSelectedElement] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [deviceResolution, setDeviceResolution] = useState({ width: 1080, height: 2340 });

  // Auto-dump functionality
  const autoDumpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const screenshotRef = useRef<HTMLImageElement>(null);
  
  // Track if we've already initialized to prevent duplicate calls
  const isInitializedRef = useRef(false);

  // Get layout configuration for android-mobile
  const remoteLayout = getRemoteLayout();

  // Use the extended remote connection hook for Android mobile
  // Since the device is already registered and controllers instantiated,
  // the remote should work immediately without connection setup
  const {
    connectionLoading,
    connectionError,
    androidElements,
    androidApps,
    androidScreenshot,
    handleRemoteCommand,
    handleScreenshotAndDumpUI,
    handleClickElement,
    handleGetApps,
  } = useRemoteConnection('android-mobile');

  // Auto-dump function that triggers after UI interactions
  const scheduleAutoDump = () => {
    if (!showOverlay) return;

    if (autoDumpTimerRef.current) {
      clearTimeout(autoDumpTimerRef.current);
    }

    autoDumpTimerRef.current = setTimeout(() => {
      console.log('[@component:CompactAndroidMobile] Auto-dumping UI elements after action');
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

  // Handle disconnect - updated to work autonomously
  const handleDisconnect = async () => {
    try {
      // Clear overlay when disconnecting
      if (autoDumpTimerRef.current) {
        clearTimeout(autoDumpTimerRef.current);
        autoDumpTimerRef.current = null;
      }
      setShowOverlay(false);
      setDumpError(null);
      
      // Since the remote is autonomous, just call parent disconnect callback
      console.log('[@component:CompactAndroidMobile] Disconnecting autonomous remote');
      
      // Call parent disconnect callback
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:CompactAndroidMobile] Error during disconnect:', error);
      // Still call parent disconnect even if there's an error
      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    }
  };

  // Update device resolution when screenshot is available
  useEffect(() => {
    if (androidScreenshot && screenshotRef.current) {
      setDeviceResolution({ width: 1080, height: 2340 });
    }
  }, [androidScreenshot]);

  // Mark as initialized on mount
  useEffect(() => {
    isInitializedRef.current = true;
    console.log('[@component:CompactAndroidMobile] Autonomous remote initialized');
  }, []);

  // Since the remote is autonomous and controllers are already instantiated,
  // we don't need connection checks - just render the remote interface
  return (
    <Box sx={{ 
      ...sx,
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%' 
    }}>
      <Box sx={{ 
        p: 2, 
        flex: 1, 
        overflow: 'auto',
        // Compact-specific styling - maxWidth and centered
        maxWidth: `${remoteLayout.containerWidth}px`,
        margin: '0 auto',
        width: '100%'
      }}>
        <AndroidMobileControls
          session={{ connected: true, device_ip: 'autonomous' }} // Always connected for autonomous remote
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
          handleReleaseControl={handleDisconnect} // Use same disconnect handler
        />
      </Box>

      {/* AndroidMobileOverlay - positioned outside */}
      {showOverlay && androidElements.length > 0 && (
        <div style={{ 
          position: 'fixed',
          left: '74px',
          top: '186px',
          zIndex: 99999999, // Much higher z-index to ensure it's on top of everything
          pointerEvents: 'all',
          transformOrigin: 'top left',
          transform: 'scale(0.198, 0.195)', // Separate scaleX and scaleY values
          
          background: 'rgba(0,0,0,0.01)' // Add a barely visible background to help with layer creation
        }}>
          <AndroidMobileOverlay
            elements={androidElements}
            screenshotElement={screenshotRef.current}
            deviceWidth={deviceResolution.width}
            deviceHeight={deviceResolution.height}
            isVisible={showOverlay}
            selectedElementId={selectedElement ? selectedElement : undefined}
            onElementClick={handleOverlayElementClick}
          />
        </div>
      )}
    </Box>
  );
} 