import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

import VideoCapture from '../controller/av/VideoCapture';
import { useMonitoring } from '../../hooks/monitoring/useMonitoring';
import { MonitoringFrame } from './types/MonitoringTypes';

interface MonitoringPlayerProps {
  hostIp?: string;
  hostPort?: string;
  deviceId?: string;
  model?: string;
}

export const MonitoringPlayer: React.FC<MonitoringPlayerProps> = ({
  hostIp,
  hostPort,
  deviceId,
  model,
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [selectedArea, setSelectedArea] = useState<any>(null);

  const { frames, isLoading, error, refreshFrames, analyzeFrame } = useMonitoring(
    hostIp,
    hostPort,
    deviceId,
  );

  // Handle frame navigation
  const handleFrameChange = useCallback(
    (frameIndex: number) => {
      setCurrentFrameIndex(frameIndex);

      // Auto-analyze frame when navigated to
      if (frames[frameIndex] && !frames[frameIndex].analysis) {
        analyzeFrame(frames[frameIndex].filename);
      }
    },
    [frames, analyzeFrame],
  );

  // Handle image load for VideoCapture
  const handleImageLoad = useCallback(
    (
      ref: React.RefObject<HTMLImageElement>,
      dimensions: { width: number; height: number },
      sourcePath: string,
    ) => {
      console.log('[@component:MonitoringPlayer] Image loaded:', {
        dimensions,
        sourcePath,
      });
    },
    [],
  );

  // Handle area selection for drag overlay
  const handleAreaSelected = useCallback((area: any) => {
    setSelectedArea(area);
    console.log('[@component:MonitoringPlayer] Area selected:', area);
  }, []);

  // Get current frame data
  const currentFrame = frames[currentFrameIndex];
  const currentImageUrl = currentFrame?.imageUrl || '';

  // Auto-refresh frames periodically
  useEffect(() => {
    if (hostIp && deviceId) {
      const interval = setInterval(() => {
        refreshFrames();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [hostIp, deviceId, refreshFrames]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with refresh button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          borderBottom: '1px solid #333',
        }}
      >
        <Typography variant="h6" sx={{ color: '#ffffff' }}>
          AI Monitoring
        </Typography>

        <Button
          startIcon={<RefreshIcon />}
          onClick={refreshFrames}
          disabled={isLoading}
          size="small"
          sx={{ color: '#ffffff' }}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* AI Analysis Overlay */}
      {currentFrame?.analysis && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            p: 1,
            background: 'linear-gradient(rgba(0,0,0,0.8), transparent)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {currentFrame.analysis.blackscreen && (
              <Typography
                variant="caption"
                sx={{
                  color: '#ff4444',
                  backgroundColor: 'rgba(255,68,68,0.2)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid #ff4444',
                }}
              >
                BLACKSCREEN
              </Typography>
            )}

            {currentFrame.analysis.freeze && (
              <Typography
                variant="caption"
                sx={{
                  color: '#ffaa00',
                  backgroundColor: 'rgba(255,170,0,0.2)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid #ffaa00',
                }}
              >
                FREEZE
              </Typography>
            )}

            {currentFrame.analysis.errors && (
              <Typography
                variant="caption"
                sx={{
                  color: '#ff0000',
                  backgroundColor: 'rgba(255,0,0,0.2)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid #ff0000',
                }}
              >
                ERROR DETECTED
              </Typography>
            )}

            {currentFrame.analysis.subtitles && (
              <Typography
                variant="caption"
                sx={{
                  color: '#00ff00',
                  backgroundColor: 'rgba(0,255,0,0.2)',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  border: '1px solid #00ff00',
                }}
              >
                SUBTITLES: {currentFrame.analysis.language.toUpperCase()}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Video player using existing VideoCapture component */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <VideoCapture
          currentFrame={currentFrameIndex}
          totalFrames={frames.length}
          onFrameChange={handleFrameChange}
          onImageLoad={handleImageLoad}
          selectedArea={selectedArea}
          onAreaSelected={handleAreaSelected}
          isCapturing={isLoading}
          videoFramePath={currentImageUrl}
          model={model}
          sx={{ width: '100%', height: '100%' }}
        />
      </Box>
    </Box>
  );
};
