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
  const [sourceImageDimensions, setSourceImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [referenceImageDimensions, setReferenceImageDimensions] = useState<{width: number, height: number} | null>(null);

  const handleSourceImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setSourceImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    console.log('[@component:VerificationImageComparisonDialog] Source image loaded:', {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      aspectRatio: img.naturalWidth / img.naturalHeight
    });
  };

  const handleReferenceImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setReferenceImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    console.log('[@component:VerificationImageComparisonDialog] Reference image loaded:', {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      aspectRatio: img.naturalWidth / img.naturalHeight
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#2E2E2E',
          color: '#ffffff',
          maxWidth: '95vw',
          maxHeight: '95vh'
        }
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem', textAlign: 'center' }}>
        {userThreshold !== undefined || matchingResult !== undefined ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {userThreshold !== undefined && (
                <Typography component="span" sx={{ fontSize: '0.9rem' }}>
                  Threshold: {(userThreshold * 100).toFixed(1)}%
                </Typography>
              )}
              {matchingResult !== undefined && (
                <Typography component="span" sx={{ 
                  fontSize: '0.9rem',
                  color: resultType === 'PASS' ? '#4caf50' : '#f44336',
                  fontWeight: 600
                }}>
                  Matching: {(matchingResult * 100).toFixed(1)}%
                </Typography>
              )}
              {resultType && (
                <Typography component="span" sx={{ 
                  color: resultType === 'PASS' ? '#4caf50' : 
                        resultType === 'ERROR' ? '#ff9800' : '#f44336',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }}>
                  [{resultType}]
                </Typography>
              )}
            </Box>
            {imageFilter && imageFilter !== 'none' && (
              <Typography component="span" sx={{ 
                color: '#90caf9',
                fontWeight: 500,
                fontSize: '0.8rem'
              }}>
                Filter: {imageFilter}
              </Typography>
            )}
            {/* Show image dimensions for debugging */}
            {(sourceImageDimensions || referenceImageDimensions) && (
              <Box sx={{ display: 'flex', gap: 2, fontSize: '0.7rem', color: '#ccc' }}>
                {sourceImageDimensions && (
                  <Typography component="span" sx={{ fontSize: '0.7rem' }}>
                    Source: {sourceImageDimensions.width}×{sourceImageDimensions.height}
                  </Typography>
                )}
                {referenceImageDimensions && (
                  <Typography component="span" sx={{ fontSize: '0.7rem' }}>
                    Reference: {referenceImageDimensions.width}×{referenceImageDimensions.height}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography component="span">
              {referenceUrl ? 'Image Comparison' : 'Text Verification'}
            </Typography>
            {resultType && (
              <Typography component="span" sx={{ 
                color: resultType === 'PASS' ? '#4caf50' : 
                      resultType === 'ERROR' ? '#ff9800' : '#f44336',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                [{resultType}]
              </Typography>
            )}
          </Box>
        )}
      </DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'flex-start', // Changed from 'flex-start' to allow different heights
          justifyContent: 'center',
          width: '100%'
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            flex: 1,
            maxWidth: referenceUrl ? '50%' : '100%' // Take full width if no reference
          }}>
            {referenceUrl && (
              <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1, color: '#ffffff' }}>
                Source
              </Typography>
            )}
            <Box sx={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              border: '2px solid #666',
              borderRadius: '8px',
              backgroundColor: '#000', // Black background to show image bounds
              overflow: 'hidden'
            }}>
              <img
                src={sourceUrl}
                alt="Source Image"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  height: 'auto', // Let height adjust to maintain aspect ratio
                  objectFit: 'contain',
                  display: 'block'
                }}
                onLoad={handleSourceImageLoad}
              />
            </Box>
          </Box>
          {referenceUrl && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              flex: 1,
              maxWidth: '50%'
            }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1, color: '#ffffff' }}>
                Reference
              </Typography>
              <Box sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                border: '2px solid #666',
                borderRadius: '8px',
                backgroundColor: '#000', // Black background to show image bounds
                overflow: 'hidden'
              }}>
                <img
                  src={referenceUrl}
                  alt="Reference Image"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    height: 'auto', // Let height adjust to maintain aspect ratio
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  onLoad={handleReferenceImageLoad}
                />
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          size="small"
          sx={{
            borderColor: '#666',
            color: '#ffffff',
            fontSize: '0.75rem',
            '&:hover': {
              borderColor: '#888',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 