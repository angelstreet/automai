import { Box, Typography } from '@mui/material';
import React from 'react';

interface RestartAnalysis {
  blackscreen: boolean;
  freeze: boolean;
  subtitles: boolean;
  errors: boolean;
  text: string;
  language?: string;
  timestamp: string; // YYYYMMDDHHMMSS format
  audio?: {
    has_audio: boolean;
    volume_percentage: number;
  };
}

interface RestartOverlayProps {
  sx?: any;
  analysis?: RestartAnalysis; // Analysis data with timestamp
  timestamp?: string; // Optional override timestamp
}

// Format timestamp from YYYYMMDDHHMMSS to readable format
const formatTimestamp = (timestamp: string): string => {
  if (!timestamp || timestamp.length !== 14) return timestamp;

  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(4, 6);
  const day = timestamp.slice(6, 8);
  const hour = timestamp.slice(8, 10);
  const minute = timestamp.slice(10, 12);
  const second = timestamp.slice(12, 14);

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
};

export const RestartOverlay: React.FC<RestartOverlayProps> = ({ sx, analysis, timestamp }) => {
  // Use provided timestamp or extract from analysis
  const displayTimestamp = timestamp || analysis?.timestamp;

  return (
    <>
      {/* Timestamp overlay - top right */}
      {displayTimestamp && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 20,
            p: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 1,
            pointerEvents: 'none', // Don't interfere with clicks
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            }}
          >
            {formatTimestamp(displayTimestamp)}
          </Typography>
        </Box>
      )}

      {/* Analysis overlay - left aligned */}
      {analysis && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 20,
            p: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 1,
            pointerEvents: 'none', // Don't interfere with clicks
            minWidth: 200,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            ...sx,
          }}
        >
          {/* Blackscreen */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#ffffff', mr: 1 }}>
              Blackscreen:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: analysis.blackscreen ? '#ff4444' : '#ffffff',
                fontWeight: analysis.blackscreen ? 'bold' : 'normal',
              }}
            >
              {analysis.blackscreen ? 'Yes' : 'No'}
            </Typography>
          </Box>

          {/* Freeze */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#ffffff', mr: 1 }}>
              Freeze:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: analysis.freeze ? '#ff4444' : '#ffffff',
                fontWeight: analysis.freeze ? 'bold' : 'normal',
              }}
            >
              {analysis.freeze ? 'Yes' : 'No'}
            </Typography>
          </Box>

          {/* Audio */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#ffffff', mr: 1 }}>
              Audio:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: analysis.audio?.has_audio ? '#00ff00' : '#ff4444',
                fontWeight: analysis.audio?.has_audio ? 'bold' : 'normal',
              }}
            >
              {analysis.audio?.has_audio ? 'Yes' : 'No'}
              {analysis.audio?.has_audio && (
                <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                  ({analysis.audio.volume_percentage}%)
                </Typography>
              )}
            </Typography>
          </Box>

          {/* Subtitles */}
          <Box sx={{ mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#ffffff', mr: 1 }}>
                Subtitles:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: analysis.subtitles ? '#00ff00' : '#ffffff',
                  fontWeight: analysis.subtitles ? 'bold' : 'normal',
                }}
              >
                {analysis.subtitles ? 'Yes' : 'No'}
                {analysis.subtitles && analysis.language && (
                  <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                    ({analysis.language})
                  </Typography>
                )}
              </Typography>
            </Box>
            {analysis.subtitles && analysis.text && (
              <Typography variant="body2" sx={{ color: '#ffffff', ml: 0, mt: 0.5 }}>
                Text:{' '}
                <Typography component="span" sx={{ color: '#cccccc' }}>
                  {analysis.text}
                </Typography>
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </>
  );
};
