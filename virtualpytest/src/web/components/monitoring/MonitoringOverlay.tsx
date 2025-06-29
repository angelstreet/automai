import React from 'react';
import { Box, Typography } from '@mui/material';
import { FrameAnalysis } from './types/MonitoringTypes';

interface MonitoringOverlayProps {
  analysis: FrameAnalysis;
  frameNumber: number;
  timestamp: number;
}

export const MonitoringOverlay: React.FC<MonitoringOverlayProps> = ({
  analysis,
  frameNumber,
  timestamp,
}) => {
  const borderColor =
    analysis.status === 'ok' ? '#4CAF50' : analysis.status === 'issue' ? '#F44336' : '#FF9800';

  return (
    <>
      {/* Status Border */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: `3px solid ${borderColor}`,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />

      {/* Analysis Text Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: 1,
          borderRadius: 1,
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          zIndex: 10,
          minWidth: 180,
          maxWidth: 250,
        }}
      >
        <Typography
          variant="caption"
          component="div"
          sx={{ fontWeight: 'bold', mb: 0.5, color: borderColor }}
        >
          #{frameNumber} - {analysis.status.toUpperCase()}
        </Typography>

        <Typography variant="caption" component="div" sx={{ fontSize: '0.65rem' }}>
          Subtitles: {analysis.subtitles.truncatedText}
        </Typography>

        <Typography variant="caption" component="div" sx={{ fontSize: '0.65rem' }}>
          Language:{' '}
          {analysis.language.language === 'unknown'
            ? 'Unknown'
            : analysis.language.language.toUpperCase()}
        </Typography>

        {analysis.freeze.detected && (
          <Typography
            variant="caption"
            component="div"
            sx={{ color: '#FF9800', fontSize: '0.65rem' }}
          >
            Freeze: {analysis.freeze.consecutiveFrames} frames
          </Typography>
        )}

        {analysis.blackscreen.detected && (
          <Typography
            variant="caption"
            component="div"
            sx={{ color: '#FF9800', fontSize: '0.65rem' }}
          >
            Blackscreen: {analysis.blackscreen.consecutiveFrames} frames
          </Typography>
        )}

        {analysis.errors.detected && (
          <Typography
            variant="caption"
            component="div"
            sx={{ color: '#F44336', fontSize: '0.65rem' }}
          >
            Error: {analysis.errors.errorType}
          </Typography>
        )}
      </Box>

      {/* Timestamp */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: 0.5,
          borderRadius: 0.5,
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          zIndex: 10,
        }}
      >
        {new Date(timestamp * 1000).toLocaleTimeString()}
      </Box>
    </>
  );
};
