import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';

interface VerificationImageComparisonDialogProps {
  open: boolean;
  sourceUrl: string;
  referenceUrl: string;
  userThreshold?: number;
  matchingResult?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  imageFilter?: 'none' | 'greyscale' | 'binary';
  onClose: () => void;
}

export const VerificationImageComparisonDialog: React.FC<VerificationImageComparisonDialogProps> = ({
  open,
  sourceUrl,
  referenceUrl,
  userThreshold,
  matchingResult,
  resultType,
  imageFilter,
  onClose
}) => {
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

  // Get the filtered image URL based on the selected filter
  const getFilteredImageUrl = (url: string, filter?: 'none' | 'greyscale' | 'binary') => {
    if (!url || !filter || filter === 'none') return url;
    
    // Remove file extension and add filter suffix
    const lastDotIndex = url.lastIndexOf('.');
    if (lastDotIndex === -1) return url;
    
    const baseUrl = url.substring(0, lastDotIndex);
    const extension = url.substring(lastDotIndex);
    
    const filterSuffix = filter === 'greyscale' ? '_greyscale' : '_binary';
    return `${baseUrl}${filterSuffix}${extension}`;
  };

  const filteredSourceUrl = getFilteredImageUrl(sourceUrl, imageFilter);
  const filteredReferenceUrl = getFilteredImageUrl(referenceUrl, imageFilter);

  // Debug logging for filtered images
  if (imageFilter && imageFilter !== 'none') {
    console.log(`[@component:VerificationImageComparisonDialog] Using ${imageFilter} filter:`);
    console.log(`[@component:VerificationImageComparisonDialog] Source: ${sourceUrl} -> ${filteredSourceUrl}`);
    console.log(`[@component:VerificationImageComparisonDialog] Reference: ${referenceUrl} -> ${filteredReferenceUrl}`);
  }

  const cacheBustedSourceUrl = getCacheBustedUrl(filteredSourceUrl);
  const cacheBustedReferenceUrl = getCacheBustedUrl(filteredReferenceUrl);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Image Verification Comparison
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {resultType && (
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: getResultColor(), 
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  border: `2px solid ${getResultColor()}`,
                  borderRadius: 1
                }}
              >
                {resultType}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ padding: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.2, height: '100%', minHeight: '400px' }}>
          {/* Source Image */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
              Source Image
            </Typography>
            <Box 
              sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0
              }}
            >
              <img
                src={cacheBustedSourceUrl}
                alt="Source"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0
                }}
                onError={(e) => {
                  console.error('[@component:VerificationImageComparisonDialog] Failed to load source image:', sourceUrl);
                }}
              />
            </Box>
          </Box>

          {/* Reference Image */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
              Reference Image
            </Typography>
            <Box 
              sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0
              }}
            >
              <img
                src={cacheBustedReferenceUrl}
                alt="Reference"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0
                }}
                onError={(e) => {
                  console.error('[@component:VerificationImageComparisonDialog] Failed to load reference image:', referenceUrl);
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 