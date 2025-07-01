import { Box, Typography } from '@mui/material';
import React, { useState, useEffect } from 'react';

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
  confidence: number;
}

interface SubtitleTrendData {
  showRedIndicator: boolean;
  currentHasSubtitles: boolean;
  framesAnalyzed: number;
  noSubtitlesStreak: number;
}

interface MonitoringOverlayProps {
  sx?: any;
  overrideImageUrl?: string; // Override the auto-detected image URL
  overrideAnalysis?: MonitoringAnalysis; // Override with pre-loaded analysis
  subtitleTrendData?: SubtitleTrendData | null; // Subtitle trend analysis from hook
}

export const MonitoringOverlay: React.FC<MonitoringOverlayProps> = ({
  sx,
  overrideImageUrl,
  overrideAnalysis,
  subtitleTrendData,
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
          </Typography>
          {analysis && analysis.confidence > 0 && (
            <Typography variant="caption" sx={{ color: '#cccccc', ml: 1 }}>
              ({Math.round(analysis.confidence * 100)}%)
            </Typography>
          )}
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
          </Typography>
          {analysis && analysis.confidence > 0 && (
            <Typography variant="caption" sx={{ color: '#cccccc', ml: 1 }}>
              ({Math.round(analysis.confidence * 100)}%)
            </Typography>
          )}
        </Box>
      </Box>

      {/* Error indicator - top right, but away from online status */}
      {(analysis?.blackscreen || analysis?.freeze) && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 66, // 50px more from right edge to avoid online status
            zIndex: 20,
            p: 1,
            backgroundColor: 'rgba(255, 68, 68, 0.8)',
            borderRadius: 1,
            pointerEvents: 'none',
          }}
        >
          <Typography variant="caption" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
            ERROR DETECTED
          </Typography>
        </Box>
      )}
    </>
  );
};
