import { PlayArrow, Pause } from '@mui/icons-material';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import React, { useMemo } from 'react';

import { getStreamViewerLayout } from '../../config/layoutConfig';
import { useMonitoring } from '../../hooks/monitoring/useMonitoring';
import { Host, Device } from '../../types/common/Host_Types';
import { RecHostPreview } from '../rec/RecHostPreview';

import { MonitoringOverlay } from './MonitoringOverlay';

interface MonitoringPlayerProps {
  host: Host;
  device?: Device;
  initializeBaseUrl?: (host: Host, device: Device) => Promise<boolean>;
  generateThumbnailUrl?: (host: Host, device: Device) => string | null;
}

export const MonitoringPlayer: React.FC<MonitoringPlayerProps> = ({
  host,
  device,
  initializeBaseUrl,
  generateThumbnailUrl,
}) => {
  // Use the monitoring hook for all state management
  const {
    frames,
    currentIndex,
    currentFrameUrl,
    selectedFrameAnalysis,
    isHistoricalFrameLoaded,
    isPlaying,
    handlePlayPause,
    handleSliderChange,
    handleHistoricalFrameLoad,
    subtitleTrendData,
  } = useMonitoring({ host, device });

  // Use the same layout configuration as HLSVideoPlayer for perfect alignment
  const layoutConfig = useMemo(() => {
    return getStreamViewerLayout(device?.device_model);
  }, [device?.device_model]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        '& .MuiCard-root': {
          height: '100%',
          borderRadius: 0,
          border: 'none',
        },
        '& img': {
          width: layoutConfig.isMobileModel ? 'auto' : '100%',
          height: layoutConfig.isMobileModel ? '100%' : 'auto',
          objectFit: layoutConfig.objectFit || 'contain',
        },
      }}
    >
      {/* RecHostPreview for live feed */}
      <RecHostPreview
        host={host}
        device={device}
        initializeBaseUrl={initializeBaseUrl}
        generateThumbnailUrl={generateThumbnailUrl}
        hideHeader={true}
      />

      {/* Override image if viewing historical frame */}
      {frames.length > 0 && currentIndex < frames.length - 1 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'black',
            zIndex: 1,
            opacity: isHistoricalFrameLoaded ? 1 : 0, // Only show when loaded
            transition: 'opacity 150ms ease-in-out', // Smooth transition
          }}
        >
          <Box
            component="img"
            src={currentFrameUrl}
            alt={`Frame ${currentIndex + 1}`}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: layoutConfig.isMobileModel ? 'auto' : '100%',
              height: layoutConfig.isMobileModel ? '100%' : 'auto',
              objectFit: layoutConfig.objectFit || 'contain',
              objectPosition: 'top center', // Center horizontally, anchor to top - matches RecHostPreview
              opacity: 1,
              transition: 'opacity 300ms ease-in-out',
              cursor: 'pointer',
            }}
            onLoad={handleHistoricalFrameLoad}
            draggable={false}
          />
        </Box>
      )}

      {/* Monitoring overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000000, // Same as AndroidMobileOverlay click animation, but appears after in DOM
          pointerEvents: 'none', // Don't block clicks to underlying remote controls
        }}
      >
        <MonitoringOverlay
          overrideImageUrl={
            frames.length > 0 && currentIndex < frames.length - 1 && isHistoricalFrameLoaded
              ? currentFrameUrl
              : undefined
          }
          overrideAnalysis={
            frames.length > 0 && currentIndex < frames.length - 1 && isHistoricalFrameLoaded
              ? selectedFrameAnalysis || undefined
              : undefined
          }
          subtitleTrendData={subtitleTrendData}
        />
      </Box>

      {/* Timeline controls */}
      {frames.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            p: 1,
            zIndex: 1000010, // Much higher than AndroidMobileOverlay (1000000)
          }}
        >
          {/* Play/Pause button */}
          <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
            <IconButton
              size="medium"
              onClick={handlePlayPause}
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
          <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontSize: '0.8rem',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {currentIndex + 1} / {frames.length}
            </Typography>
          </Box>

          {/* Timeline scrubber */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: '80px',
              right: '80px',
            }}
          >
            <Slider
              value={currentIndex}
              min={0}
              max={Math.max(0, frames.length - 1)}
              onChange={handleSliderChange}
              sx={{
                color: '#ffffff',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
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
