import { Box, Typography } from '@mui/material';
import React from 'react';

interface VerificationImageComparisonThumbnailsProps {
  sourceUrl: string;
  referenceUrl: string;
  overlayUrl?: string;
  resultType: 'PASS' | 'FAIL' | 'ERROR';
  userThreshold?: number;
  matchingResult?: number;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  processImageUrl: (url: string) => string;
  getCacheBustedUrl: (url: string) => string;
  onImageClick: (
    sourceUrl: string,
    referenceUrl: string,
    overlayUrl?: string,
    userThreshold?: number,
    matchingResult?: number,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => void;
}

export const VerificationImageComparisonThumbnails: React.FC<
  VerificationImageComparisonThumbnailsProps
> = ({
  sourceUrl,
  referenceUrl,
  overlayUrl,
  resultType,
  userThreshold,
  matchingResult,
  imageFilter,
  processImageUrl,
  getCacheBustedUrl,
  onImageClick,
}) => {
  const handleClick = () => {
    onImageClick(
      sourceUrl,
      referenceUrl,
      overlayUrl,
      userThreshold,
      matchingResult,
      resultType,
      imageFilter,
    );
  };

  const getResultColor = () => {
    switch (resultType) {
      case 'PASS':
        return '#4caf50';
      case 'FAIL':
        return '#f44336';
      case 'ERROR':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  // Get CSS filter based on the selected filter
  const getCSSFilter = (filter?: 'none' | 'greyscale' | 'binary') => {
    switch (filter) {
      case 'greyscale':
        return 'grayscale(100%)';
      case 'binary':
        return 'grayscale(100%) contrast(1000%) brightness(1000%)';
      case 'none':
      default:
        return 'none';
    }
  };

  const processedSourceUrl = processImageUrl(sourceUrl);
  const processedReferenceUrl = processImageUrl(referenceUrl);
  const cacheBustedSourceUrl = getCacheBustedUrl(processedSourceUrl);
  const cacheBustedReferenceUrl = getCacheBustedUrl(processedReferenceUrl);
  const cssFilter = getCSSFilter(imageFilter);

  // Debug logging for filters
  if (imageFilter && imageFilter !== 'none') {
    console.log(
      `[@component:VerificationImageComparisonThumbnails] Applying ${imageFilter} filter dynamically with CSS: ${cssFilter}`,
    );
  }

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
              minHeight: '100px',
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
                display: 'block',
                filter: cssFilter, // Apply dynamic CSS filter
              }}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                console.log(
                  `[@component:VerificationImageComparisonThumbnails] Source image loaded: ${img.naturalWidth}x${img.naturalHeight}, aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(2)}`,
                );
              }}
              onError={() => {
                console.error(
                  '[@component:VerificationImageComparisonThumbnails] Failed to load source image:',
                  sourceUrl,
                );
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
              minHeight: '100px',
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
                display: 'block',
                filter: cssFilter, // Apply dynamic CSS filter
              }}
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                console.log(
                  `[@component:VerificationImageComparisonThumbnails] Reference image loaded: ${img.naturalWidth}x${img.naturalHeight}, aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(2)}`,
                );
              }}
              onError={() => {
                console.error(
                  '[@component:VerificationImageComparisonThumbnails] Failed to load reference image:',
                  referenceUrl,
                );
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Additional Info */}
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        {imageFilter && imageFilter !== 'none' && (
          <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
            Filter: {imageFilter} (CSS)
          </Typography>
        )}
        <Typography variant="caption" sx={{ display: 'block', color: '#999', fontSize: '0.7rem' }}>
          Click to view full size
        </Typography>
      </Box>
    </Box>
  );
};
