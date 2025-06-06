import React from 'react';
import { Box, Typography } from '@mui/material';

interface VerificationImageComparisonThumbnailsProps {
  sourceUrl: string;
  referenceUrl: string;
  resultType: 'PASS' | 'FAIL' | 'ERROR';
  userThreshold?: number;
  matchingResult?: number;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  onImageClick: (sourceUrl: string, referenceUrl: string, userThreshold?: number, matchingResult?: number, resultType?: 'PASS' | 'FAIL' | 'ERROR', imageFilter?: 'none' | 'greyscale' | 'binary') => void;
}

export const VerificationImageComparisonThumbnails: React.FC<VerificationImageComparisonThumbnailsProps> = ({
  sourceUrl,
  referenceUrl,
  resultType,
  userThreshold,
  matchingResult,
  imageFilter,
  onImageClick
}) => {
  // Helper function to build complete URL
  const buildImageUrl = (url: string): string => {
    if (!url) return '';
    // If URL already starts with http/https, use it as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Otherwise, prepend localhost
    return `http://localhost:5009${url}`;
  };

  const handleImageClick = () => {
    console.log('[@component:VerificationImageComparisonThumbnails] Image clicked:', {
      sourceUrl: buildImageUrl(sourceUrl),
      referenceUrl: buildImageUrl(referenceUrl),
      resultType,
      userThreshold,
      matchingResult
    });
    
    onImageClick(
      buildImageUrl(sourceUrl),
      buildImageUrl(referenceUrl),
      userThreshold,
      matchingResult,
      resultType,
      imageFilter
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 0.5, 
      alignItems: 'flex-start',
      padding: '4px',
      border: `1px solid ${
        resultType === 'PASS' ? '#4caf50' : resultType === 'ERROR' ? '#ff9800' : '#f44336'
      }`,
      borderRadius: 1,
      backgroundColor: 'rgba(0,0,0,0.1)',
      width: '100%'
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
          Source
        </Typography>
        <Box sx={{ 
          width: '100%', 
          maxWidth: '200px',
          position: 'relative',
          border: '1px solid #666',
          borderRadius: '4px',
          overflow: 'hidden',
          cursor: 'pointer',
          backgroundColor: '#000'
        }}>
          <img
            src={buildImageUrl(sourceUrl)}
            alt="Source"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '200px',
              objectFit: 'contain',
              display: 'block'
            }}
            onClick={handleImageClick}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              console.log('[@component:VerificationImageComparisonThumbnails] Source image loaded:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                displayWidth: img.width,
                displayHeight: img.height,
                aspectRatio: img.naturalWidth / img.naturalHeight
              });
            }}
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
          Reference
        </Typography>
        <Box sx={{ 
          width: '100%', 
          maxWidth: '200px',
          position: 'relative',
          border: '1px solid #666',
          borderRadius: '4px',
          overflow: 'hidden',
          cursor: 'pointer',
          backgroundColor: '#000'
        }}>
          <img
            src={buildImageUrl(referenceUrl)}
            alt="Reference"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '200px',
              objectFit: 'contain',
              display: 'block'
            }}
            onClick={handleImageClick}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement;
              console.log('[@component:VerificationImageComparisonThumbnails] Reference image loaded:', {
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                displayWidth: img.width,
                displayHeight: img.height,
                aspectRatio: img.naturalWidth / img.naturalHeight
              });
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}; 