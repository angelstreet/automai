import { Box, Typography, CircularProgress } from '@mui/material';
import React, { useState, useEffect } from 'react';

import { RecordingTimerProps, StreamStatus } from '../../types/screenEditorTypes';
import { formatRecordingTime } from '../../utils/userinterface/screenEditorUtils';

// Separate component for recording timer to avoid parent re-renders
const RecordingTimer: React.FC<RecordingTimerProps> = ({ isCapturing }) => {
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

  return (
    <Typography
      variant="caption"
      sx={{
        color: 'white',
        fontSize: '0.7rem',
        fontWeight: 'bold',
      }}
    >
      REC {formatRecordingTime(recordingTime)}
    </Typography>
  );
};

// Recording overlay - only show red dot when capturing
export const RecordingOverlay: React.FC<{ isCapturing: boolean }> = ({ isCapturing }) => {
  if (!isCapturing) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 8,
        left: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 1,
        padding: '4px 8px',
        zIndex: 10,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#f44336',
          animation: 'recordBlink 1s infinite',
          '@keyframes recordBlink': {
            '0%, 50%': { opacity: 1 },
            '51%, 100%': { opacity: 0.3 },
          },
        }}
      />
      <RecordingTimer isCapturing={isCapturing} />
    </Box>
  );
};

// Screenshot loading overlay
export const LoadingOverlay: React.FC<{ isScreenshotLoading: boolean }> = ({
  isScreenshotLoading,
}) => {
  if (!isScreenshotLoading) return null;

  return (
    <Box
      sx={{
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
        zIndex: 20,
      }}
    >
      <CircularProgress size={40} sx={{ color: '#ffffff', mb: 2 }} />
      <Typography variant="body2" sx={{ color: '#ffffff' }}>
        Taking screenshot...
      </Typography>
    </Box>
  );
};

// Mode indicator dot for compact view
export const ModeIndicatorDot: React.FC<{ viewMode: string }> = ({ viewMode }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 4,
      left: 4,
      width: 8,
      height: 8,
      borderRadius: '50%',
      backgroundColor:
        viewMode === 'screenshot' || viewMode === 'capture' ? '#ff4444' : 'transparent',
      opacity: viewMode === 'screenshot' || viewMode === 'capture' ? 1 : 0,
      boxShadow: '0 0 4px rgba(0,0,0,0.5)',
      zIndex: 2,
    }}
  />
);

// Status indicator for expanded view header
export const StatusIndicator: React.FC<{ streamStatus: StreamStatus }> = ({ streamStatus }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 1,
      padding: '2px 8px',
      width: '70px',
      justifyContent: 'center',
    }}
  >
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor:
          streamStatus === 'running'
            ? '#4caf50'
            : streamStatus === 'stopped'
              ? '#f44336'
              : '#9e9e9e',
      }}
    />
    <Typography
      variant="caption"
      sx={{ color: 'white', fontSize: '0.7rem', width: '40px', textAlign: 'center' }}
    >
      {streamStatus === 'running' ? 'Live' : 'Stopped'}
    </Typography>
  </Box>
);
