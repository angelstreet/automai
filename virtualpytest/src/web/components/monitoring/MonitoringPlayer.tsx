import { PlayArrow, Pause, Analytics } from '@mui/icons-material';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import React, { useRef, useEffect } from 'react';
import { getStreamViewerLayout } from '../../config/layoutConfig';
import { MonitoringOverlay } from './MonitoringOverlay';
import { useMonitoring } from '../../hooks/monitoring/useMonitoring';
import { Host, Device } from '../../types/common/Host_Types';

interface MonitoringPlayerProps {
  host: Host;
  device?: Device;
  isControlActive: boolean;
  model?: string;
  sx?: any;
}

export const MonitoringPlayer: React.FC<MonitoringPlayerProps> = ({
  host,
  device,
  isControlActive,
  model,
  sx = {},
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const layoutConfig = getStreamViewerLayout(model);

  const {
    monitoringState,
    startMonitoring,
    stopMonitoring,
    toggleMonitoring,
    goToFrame,
    nextFrame,
    previousFrame,
    isPlaying,
    togglePlayback,
    currentFrame,
    canGoNext,
    canGoPrevious,
  } = useMonitoring({
    host,
    deviceId: device?.device_id || 'device1',
    isControlActive,
  });

  // Auto-start monitoring when control is active
  useEffect(() => {
    if (isControlActive && !monitoringState.isActive) {
      startMonitoring();
    }
  }, [isControlActive, monitoringState.isActive, startMonitoring]);

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const frame = newValue as number;
    goToFrame(frame);
  };

  // Process image URL for proxy if needed (same as VideoCapture)
  const imageUrl = currentFrame?.imagePath
    ? `/server/av/proxyImage?url=${encodeURIComponent(currentFrame.imagePath)}`
    : '';

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000000',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...sx,
      }}
    >
      {/* Header - show monitoring status */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderBottom: '1px solid #333',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Status indicator */}
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: monitoringState.isActive ? '#4caf50' : '#f44336',
              marginRight: 1,
            }}
          />
          <Typography variant="caption" sx={{ color: '#ffffff', fontSize: '10px' }}>
            AI MONITORING {monitoringState.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Typography>
          {monitoringState.isProcessing && (
            <Typography variant="caption" sx={{ color: '#ffeb3b', fontSize: '10px', ml: 1 }}>
              PROCESSING...
            </Typography>
          )}
        </Box>

        {/* Frame count and current status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {currentFrame?.analysis && (
            <Typography
              variant="caption"
              sx={{
                color: currentFrame.analysis.status === 'ok' ? '#4caf50' : '#f44336',
                fontSize: '10px',
                fontWeight: 'bold',
              }}
            >
              {currentFrame.analysis.status.toUpperCase()}
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '10px' }}>
            {monitoringState.totalFrames} frames
          </Typography>
        </Box>
      </Box>

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
        }}
      >
        {/* Current frame image */}
        {currentFrame && imageUrl && (
          <>
            <img
              ref={imageRef}
              src={imageUrl}
              alt={`Monitoring Frame ${currentFrame.frameNumber}`}
              style={{
                maxWidth: layoutConfig.isMobileModel ? 'auto' : '100%',
                maxHeight: '100%',
                width: layoutConfig.isMobileModel ? 'auto' : '100%',
                height: 'auto',
                objectFit: layoutConfig.objectFit,
                backgroundColor: 'transparent',
              }}
              draggable={false}
              onError={(e) => {
                console.error('[@component:MonitoringPlayer] Failed to load image:', imageUrl);
                // Set transparent fallback
                (e.target as HTMLImageElement).src =
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
              }}
            />

            {/* AI Analysis Overlay */}
            <MonitoringOverlay
              analysis={currentFrame.analysis}
              frameNumber={currentFrame.frameNumber}
              timestamp={currentFrame.timestamp}
            />
          </>
        )}

        {/* No frames available */}
        {monitoringState.totalFrames === 0 && !monitoringState.isProcessing && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666666',
            }}
          >
            <Analytics sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body2">
              {monitoringState.isActive
                ? 'Waiting for captured frames...'
                : 'AI Monitoring Inactive'}
            </Typography>
            {!isControlActive && (
              <Typography variant="caption" sx={{ mt: 1, opacity: 0.7 }}>
                Take control to start monitoring
              </Typography>
            )}
          </Box>
        )}

        {/* Error state */}
        {monitoringState.error && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'white',
              backgroundColor: 'rgba(255, 0, 0, 0.8)',
              padding: 2,
              borderRadius: 1,
              zIndex: 20,
            }}
          >
            <Typography variant="body2">Error: {monitoringState.error}</Typography>
          </Box>
        )}
      </Box>

      {/* Playback controls - only show when we have frames */}
      {monitoringState.totalFrames > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            p: 1,
            backgroundColor: 'transparent',
            zIndex: 15,
          }}
        >
          {/* Play/Pause button */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              zIndex: 20,
            }}
          >
            <IconButton
              size="medium"
              onClick={togglePlayback}
              disabled={monitoringState.totalFrames <= 1}
              sx={{
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Box>

          {/* Frame counter */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 20,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontSize: '0.8rem',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {monitoringState.currentFrameIndex + 1} / {monitoringState.totalFrames}
            </Typography>
          </Box>

          {/* Scrubber */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: '80px',
              right: '80px',
              zIndex: 20,
            }}
          >
            <Slider
              value={monitoringState.currentFrameIndex}
              min={0}
              max={Math.max(0, monitoringState.totalFrames - 1)}
              onChange={handleSliderChange}
              disabled={monitoringState.totalFrames <= 1}
              sx={{
                color: '#ffffff',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                  '&:hover': {
                    boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
                  },
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#fff',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: 'rgba(255,255,255,0.3)',
                },
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
