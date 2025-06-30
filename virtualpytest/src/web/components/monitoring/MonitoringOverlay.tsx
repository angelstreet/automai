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
  language: string;
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
  const [analysis, setAnalysis] = useState<MonitoringAnalysis | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');

  // Monitor for image URL changes in the RecHostPreview component
  useEffect(() => {
    // Use override URL if provided, otherwise auto-detect
    if (overrideImageUrl) {
      if (overrideImageUrl !== currentImageUrl) {
        setCurrentImageUrl(overrideImageUrl);
      }
      return; // Don't set up auto-detection when overriding
    }

    const detectImageUrl = () => {
      // Find the current screenshot image in RecHostPreview
      const imgElement = document.querySelector('[alt="Current screenshot"]') as HTMLImageElement;
      if (imgElement && imgElement.src && imgElement.src !== currentImageUrl) {
        setCurrentImageUrl(imgElement.src);
      }
    };

    // Check immediately
    detectImageUrl();

    // Set up interval to check for changes
    const interval = setInterval(detectImageUrl, 1000);

    return () => clearInterval(interval);
  }, [currentImageUrl, overrideImageUrl]);

  // Load analysis data when imageUrl changes
  useEffect(() => {
    // Use override analysis if provided
    if (overrideAnalysis) {
      setAnalysis(overrideAnalysis);
      return;
    }

    const loadAnalysis = async () => {
      if (!currentImageUrl) return;

      // Wait 300ms for JSON analysis to be created
      await new Promise((resolve) => setTimeout(resolve, 300));

      // If we're loading a thumbnail image, look for the corresponding thumbnail JSON
      const jsonUrl = currentImageUrl.includes('_thumbnail')
        ? currentImageUrl.replace('.jpg', '.json')
        : currentImageUrl.replace('.jpg', '_thumbnail.json');

      try {
        const response = await fetch(jsonUrl);
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data.analysis || null);
        } else {
          // JSON not available yet, keep previous analysis or show empty
          setAnalysis(null);
        }
      } catch {
        // JSON not available, show empty analysis
        setAnalysis(null);
      }
    };

    loadAnalysis();
  }, [currentImageUrl, overrideAnalysis]);

  // Always render overlay (don't check if analysis exists)
  if (!analysis) {
    return null; // Only null if analysis state is not initialized
  }

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
              color: analysis.blackscreen ? '#ff4444' : '#ffffff',
              fontWeight: analysis.blackscreen ? 'bold' : 'normal',
            }}
          >
            {analysis.blackscreen ? 'Yes' : 'No'}
          </Typography>
          {analysis.confidence > 0 && (
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
              color: analysis.freeze ? '#ff4444' : '#ffffff',
              fontWeight: analysis.freeze ? 'bold' : 'normal',
            }}
          >
            {analysis.freeze ? 'Yes' : 'No'}
          </Typography>
          {analysis.confidence > 0 && (
            <Typography variant="caption" sx={{ color: '#cccccc', ml: 1 }}>
              ({Math.round(analysis.confidence * 100)}%)
            </Typography>
          )}
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
                mr: 1,
              }}
            >
              {analysis.subtitles ? 'Yes' : 'No'}
            </Typography>
            {subtitleTrendData && (
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                ({subtitleTrendData.framesAnalyzed - subtitleTrendData.noSubtitlesStreak}/
                {subtitleTrendData.framesAnalyzed} frames)
              </Typography>
            )}
          </Box>
          {analysis.subtitles && (
            <Typography variant="caption" sx={{ color: '#cccccc', ml: 2 }}>
              {analysis.language !== 'unknown' && analysis.language !== 'detected'
                ? analysis.language.charAt(0).toUpperCase() + analysis.language.slice(1)
                : 'Unknown'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Subtitle Trend Warning - center of screen */}
      {subtitleTrendData?.showRedIndicator && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 25,
            p: 2,
            backgroundColor: 'rgba(255, 68, 68, 0.9)',
            borderRadius: 2,
            border: '2px solid #ff4444',
            pointerEvents: 'none',
            textAlign: 'center',
            minWidth: 250,
          }}
        >
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold', mb: 1 }}>
            ⚠️ NO SUBTITLES DETECTED
          </Typography>
          <Typography variant="body2" sx={{ color: '#ffffff' }}>
            No subtitles found in last {subtitleTrendData.framesAnalyzed} frames
          </Typography>
          <Typography variant="caption" sx={{ color: '#ffffff', opacity: 0.8 }}>
            Check if content has speech/dialogue
          </Typography>
        </Box>
      )}

      {/* Error indicator - top right, but away from online status */}
      {(analysis.blackscreen || analysis.freeze) && (
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
