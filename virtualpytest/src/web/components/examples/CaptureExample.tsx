import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { CapturePreviewEditor } from '../user-interface/CapturePreviewEditor';
import { useCapture } from '../../hooks/useCapture';

interface CaptureExampleProps {
  deviceModel?: string;
  videoDevice?: string;
}

export function CaptureExample({ 
  deviceModel = 'android_mobile', 
  videoDevice = '/dev/video0' 
}: CaptureExampleProps) {
  const {
    captureStatus,
    isCapturing,
    isLoading,
    error,
    lastCaptureResult,
    startCapture,
    stopCapture,
    clearError,
    clearLastResult,
  } = useCapture(deviceModel, videoDevice);

  const handleStartCapture = async () => {
    console.log('[@component:CaptureExample] Starting capture...');
    await startCapture();
  };

  const handleStopCapture = async () => {
    console.log('[@component:CaptureExample] Stopping capture...');
    await stopCapture();
  };

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2, color: '#ffffff' }}>
        Capture Example - Rolling 30s Buffer
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 3, color: '#cccccc' }}>
        This demonstrates the rolling capture feature that captures 10 FPS for a maximum of 30 seconds (300 frames).
        When you click START, a red blinking STOP button will appear. Click STOP to end capture and download frames.
      </Typography>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Last Capture Result */}
      {lastCaptureResult && (
        <Alert 
          severity="success" 
          onClose={clearLastResult}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            <strong>Capture Complete!</strong><br />
            Downloaded: {lastCaptureResult.framesDownloaded} frames<br />
            Duration: {lastCaptureResult.captureDuration}s<br />
            Location: {lastCaptureResult.localCaptureDir}
          </Typography>
        </Alert>
      )}

      {/* Capture Preview Editor */}
      <Box sx={{ 
        border: '1px solid #333333',
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: '#000000'
      }}>
        <CapturePreviewEditor
          mode="capture"
          captureStatus={captureStatus}
          onStartCapture={handleStartCapture}
          onStopCapture={handleStopCapture}
          isCapturing={isLoading}
          sx={{
            width: '100%',
            height: 500,
          }}
        />
      </Box>

      {/* Debug Info */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1a', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: '#666666', display: 'block', mb: 1 }}>
          Debug Info:
        </Typography>
        <Typography variant="caption" sx={{ color: '#999999', fontFamily: 'monospace' }}>
          Device: {deviceModel} | Video Device: {videoDevice}<br />
          Status: {isCapturing ? 'Capturing' : 'Ready'} | Loading: {isLoading ? 'Yes' : 'No'}<br />
          Duration: {captureStatus.duration}s / {captureStatus.max_duration}s | FPS: {captureStatus.fps}
        </Typography>
      </Box>
    </Box>
  );
}

export default CaptureExample; 