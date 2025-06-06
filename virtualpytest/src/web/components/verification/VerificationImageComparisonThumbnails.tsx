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
  const handleClick = () => {
    onImageClick(sourceUrl, referenceUrl, userThreshold, matchingResult, resultType, imageFilter);
  };

  const getResultColor = () => {
    switch (resultType) {
      case 'PASS': return '#4caf50';
      case 'FAIL': return '#f44336';
      case 'ERROR': return '#ff9800';
      default: return '#757575';
    }
  };

  // Add cache-busting parameters to force browser to reload images
  const getCacheBustedUrl = (url: string) => {
    if (!url) return url;
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  };

  const cacheBustedSourceUrl = getCacheBustedUrl(sourceUrl);
  const cacheBustedReferenceUrl = getCacheBustedUrl(referenceUrl);

  return (
    <Box 
      onClick={handleClick}
      sx={{ 
        cursor: 'pointer',
        border: `2px solid ${getResultColor()}`,
        borderRadius: 1,
        padding: 1,
      }}
    >
      
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        {/* Source Image */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            Source
          </Typography>
          <Box 
            sx={{ 
              width: '100%',
              maxWidth: '200px',
              height: 'auto',
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
              backgroundColor: '#000', // Black background to show image bounds clearly
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100px'
            }}
          >
            <img
              src={cacheBustedSourceUrl}
              alt="Source"
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain', // Maintain aspect ratio
                display: 'block'
              }}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                console.log(`[@component:VerificationImageComparisonThumbnails] Source image loaded: ${img.naturalWidth}x${img.naturalHeight}, aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(2)}`);
              }}
              onError={(e) => {
                console.error('[@component:VerificationImageComparisonThumbnails] Failed to load source image:', sourceUrl);
              }}
            />
          </Box>
        </Box>

        {/* Reference Image */}
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
            Reference
          </Typography>
          <Box 
            sx={{ 
              width: '100%',
              maxWidth: '200px',
              height: 'auto',
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
              backgroundColor: '#000', // Black background to show image bounds clearly
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100px'
            }}
          >
            <img
              src={cacheBustedReferenceUrl}
              alt="Reference"
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain', // Maintain aspect ratio
                display: 'block'
              }}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                console.log(`[@component:VerificationImageComparisonThumbnails] Reference image loaded: ${img.naturalWidth}x${img.naturalHeight}, aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(2)}`);
              }}
              onError={(e) => {
                console.error('[@component:VerificationImageComparisonThumbnails] Failed to load reference image:', referenceUrl);
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Additional Info */}
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        {imageFilter && imageFilter !== 'none' && (
          <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
            Filter: {imageFilter}
          </Typography>
        )}
        <Typography variant="caption" sx={{ display: 'block', color: '#999', fontSize: '0.7rem' }}>
          Click to view full size
        </Typography>
      </Box>
    </Box>
  );
}; 