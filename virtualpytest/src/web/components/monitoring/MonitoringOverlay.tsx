import { Box, Typography } from '@mui/material';
import React from 'react';

interface MonitoringAnalysis {
  blackscreen: boolean;
  freeze: boolean;
  subtitles: boolean;
  subtitles_trend?: {
    current: boolean;
    last_3_frames: boolean[];
    count_in_last_3: number;
    no_subtitles_for_3_frames: boolean;
  };
  errors: boolean;
  text: string;
  language?: string;
  audio?: {
    has_audio: boolean;
    volume_percentage: number;
  };
}

interface ErrorTrendData {
  blackscreenConsecutive: number;
  freezeConsecutive: number;
  audioLossConsecutive: number;
  hasWarning: boolean;
  hasError: boolean;
}

interface MonitoringOverlayProps {
  sx?: any;
  overrideAnalysis?: MonitoringAnalysis; // Override with pre-loaded analysis
  errorTrendData?: ErrorTrendData | null; // Error trend analysis from hook
  showSubtitles?: boolean; // Whether to show subtitle information in overlay
}

export const MonitoringOverlay: React.FC<MonitoringOverlayProps> = ({
  sx,
  overrideAnalysis,
  errorTrendData,
  showSubtitles = false,
}) => {
  // Pure display component - only use props, no fetching
  const analysis = overrideAnalysis;

  // Always render overlay with empty state when no analysis

  return (
    <>
      {/* Main analysis overlay - left aligned */}
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
              color: analysis?.blackscreen ? '#ff4444' : '#ffffff',
              fontWeight: analysis?.blackscreen ? 'bold' : 'normal',
            }}
          >
            {analysis?.blackscreen ? 'Yes' : 'No'}
            {analysis?.blackscreen && errorTrendData && (
              <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                ({errorTrendData.blackscreenConsecutive})
              </Typography>
            )}
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
              color: analysis?.freeze ? '#ff4444' : '#ffffff',
              fontWeight: analysis?.freeze ? 'bold' : 'normal',
            }}
          >
            {analysis?.freeze ? 'Yes' : 'No'}
            {analysis?.freeze && errorTrendData && (
              <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                ({errorTrendData.freezeConsecutive})
              </Typography>
            )}
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
              color: analysis?.audio?.has_audio ? '#00ff00' : '#ff4444',
              fontWeight: analysis?.audio?.has_audio ? 'bold' : 'normal',
            }}
          >
            {analysis?.audio?.has_audio ? 'Yes' : 'No'}
            {analysis?.audio?.has_audio && (
              <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                ({analysis.audio.volume_percentage}%)
              </Typography>
            )}
            {!analysis?.audio?.has_audio && errorTrendData && (
              <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                ({errorTrendData.audioLossConsecutive})
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Subtitles - only shown when explicitly requested */}
        {showSubtitles && (
          <Box sx={{ mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: '#ffffff', mr: 1 }}>
                Subtitles:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: analysis?.subtitles ? '#00ff00' : '#ffffff',
                  fontWeight: analysis?.subtitles ? 'bold' : 'normal',
                }}
              >
                {analysis?.subtitles ? 'Yes' : 'No'}
                {analysis?.subtitles && analysis?.language && (
                  <Typography component="span" variant="body2" sx={{ color: '#cccccc', ml: 1 }}>
                    ({analysis.language})
                  </Typography>
                )}
              </Typography>
            </Box>
            {analysis?.subtitles && analysis?.text && (
              <Typography variant="body2" sx={{ color: '#ffffff', ml: 0, mt: 0.5 }}>
                Text:{' '}
                <Typography component="span" sx={{ color: '#cccccc' }}>
                  {analysis.text}
                </Typography>
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Warning indicator - top right for 1-2 consecutive errors */}
      {errorTrendData?.hasWarning && !errorTrendData?.hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 66, // 50px more from right edge to avoid online status
            zIndex: 20,
            p: 1,
            backgroundColor: 'rgba(255, 165, 0, 0.8)', // Orange
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
            WARNING
          </Typography>
        </Box>
      )}

      {/* Error indicator - top right for 3+ consecutive errors */}
      {errorTrendData?.hasError && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 66, // 50px more from right edge to avoid online status
            zIndex: 20,
            p: 1,
            backgroundColor: 'rgba(255, 68, 68, 0.8)', // Red
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
            ERROR
          </Typography>
        </Box>
      )}
    </>
  );
};
