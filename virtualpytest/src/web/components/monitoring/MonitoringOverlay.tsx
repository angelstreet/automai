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
        <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1, fontWeight: 'bold' }}>
          AI Analysis
        </Typography>

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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: '#ffffff', mr: 1 }}>
            Subtitles:
          </Typography>
          {analysis.subtitles ? (
            <>
              <Typography variant="body2" sx={{ color: '#00ff00', fontWeight: 'bold' }}>
                {analysis.language.charAt(0).toUpperCase() + analysis.language.slice(1)}
              </Typography>
              {analysis.confidence > 0 && (
                <Typography variant="caption" sx={{ color: '#cccccc', ml: 1 }}>
                  ({Math.round(analysis.confidence * 100)}%)
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              No
            </Typography>
          )}
        </Box>
      </Box>

      {/* Error indicator - top right */}
      {(analysis.blackscreen || analysis.freeze || analysis.errors) && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
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
