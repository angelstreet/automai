import { Box, Typography } from '@mui/material';
import React from 'react';

import { useRegistration } from '../../hooks/useRegistration';
import { buildHostImageUrl } from '../../utils/buildUrlUtils';

interface ImageComparisonThumbnailsProps {
  sourceUrl: string;
  referenceUrl: string;
  resultType: 'PASS' | 'FAIL' | 'ERROR';
  userThreshold?: number;
  matchingResult?: number;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  onImageClick: () => void;
}

export const ImageComparisonThumbnails: React.FC<ImageComparisonThumbnailsProps> = ({
  sourceUrl,
  referenceUrl,
  resultType,
  onImageClick,
}) => {
  // Use registration context to get selected host
  const { selectedHost } = useRegistration();

  // Process image URLs with HTTP to HTTPS proxy logic (same as ScreenshotCapture)
  const processImageUrl = (url: string): string => {
    if (!url) return '';

    console.log(`[@component:ImageComparisonThumbnails] Processing image URL: ${url}`);

    // Handle data URLs (base64) - return as is
    if (url.startsWith('data:')) {
      console.log('[@component:ImageComparisonThumbnails] Using data URL');
      return url;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (url.startsWith('http:')) {
      console.log('[@component:ImageComparisonThumbnails] HTTP URL detected, using proxy');
      const proxyUrl = `/server/av/proxy-image?url=${encodeURIComponent(url)}`;
      console.log(`[@component:ImageComparisonThumbnails] Generated proxy URL: ${proxyUrl}`);
      return proxyUrl;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (url.startsWith('https:')) {
      console.log('[@component:ImageComparisonThumbnails] Using HTTPS URL directly');
      return url;
    }

    // For relative paths or other formats, use directly
    console.log('[@component:ImageComparisonThumbnails] Using URL directly');
    return url;
  };

  // Use centralized image URL builder with HTTP proxy support
  const buildImageUrl = (url: string): string => {
    // First process through HTTP proxy logic
    const processedUrl = processImageUrl(url);
    
    // Then apply buildHostImageUrl logic for relative paths if needed
    return buildHostImageUrl(selectedHost, processedUrl);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        alignItems: 'center',
        padding: '4px',
        border: `1px solid ${
          resultType === 'PASS' ? '#4caf50' : resultType === 'ERROR' ? '#ff9800' : '#f44336'
        }`,
        borderRadius: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        width: '100%',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
          Source
        </Typography>
        <img
          src={buildImageUrl(sourceUrl)}
          alt="Source"
          style={{
            width: '100%',
            maxWidth: '200px',
            height: '150px',
            objectFit: 'contain',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={onImageClick}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
          Reference
        </Typography>
        <img
          src={buildImageUrl(referenceUrl)}
          alt="Reference"
          style={{
            width: '100%',
            maxWidth: '200px',
            height: '150px',
            objectFit: 'contain',
            border: '1px solid #666',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
          onClick={onImageClick}
        />
      </Box>
    </Box>
  );
};
