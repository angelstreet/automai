import { Box, Typography } from '@mui/material';
import React, { useState, useEffect } from 'react';

interface MonitoringAnalysis {
  blackscreen: boolean;
  freeze: boolean;
  subtitles: boolean;
  errors: boolean;
  language: string;
  confidence: number;
}

interface MonitoringOverlayProps {
  sx?: any;
}

export const MonitoringOverlay: React.FC<MonitoringOverlayProps> = ({ sx }) => {
  const [analysis, setAnalysis] = useState<MonitoringAnalysis | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');

  // Monitor for image URL changes in the RecHostPreview component
  useEffect(() => {
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
  }, [currentImageUrl]);

  // Load analysis data when imageUrl changes
  useEffect(() => {
    if (!currentImageUrl) {
      setAnalysis(null);
      return;
    }

    // Simple: replace .jpg with .json in the image URL
    const jsonUrl = currentImageUrl.replace('.jpg', '.json');

    const loadAnalysis = async () => {
      try {
        const response = await fetch(jsonUrl);
        if (response.ok) {
          const jsonData = await response.json();

          if (jsonData.analysis) {
            setAnalysis({
              blackscreen: jsonData.analysis.blackscreen || false,
              freeze: jsonData.analysis.freeze || false,
              subtitles: jsonData.analysis.subtitles || false,
              errors: jsonData.analysis.errors || false,
              language: jsonData.analysis.language || 'unknown',
              confidence: jsonData.analysis.confidence || 0,
            });
          } else {
            setAnalysis(null);
          }
        } else {
          setAnalysis(null);
        }
      } catch (error) {
        setAnalysis(null);
      }
    };

    loadAnalysis();
  }, [currentImageUrl]);

  // Don't render if no analysis data
  if (!analysis) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        p: 1,
        background: 'linear-gradient(rgba(0,0,0,0.8), transparent)',
        pointerEvents: 'none', // Don't interfere with clicks
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {analysis.blackscreen && (
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

        {analysis.freeze && (
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

        {analysis.errors && (
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

        {analysis.subtitles && (
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
            SUBTITLES: {analysis.language.toUpperCase()}
          </Typography>
        )}

        <Typography
          variant="caption"
          sx={{
            color: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: '1px solid #ffffff',
          }}
        >
          CONFIDENCE: {Math.round(analysis.confidence * 100)}%
        </Typography>
      </Box>
    </Box>
  );
};
