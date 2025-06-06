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

  const getResultColor = () => {
    switch (resultType) {
      case 'PASS': return '#4caf50';
      case 'FAIL': return '#f44336';
      case 'ERROR': return '#ff9800';
      default: return '#757575';
    }
  };

  const handleSourceImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setSourceImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    console.log(`[@component:VerificationImageComparisonDialog] Source image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
  };

  const handleReferenceImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setReferenceImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    console.log(`[@component:VerificationImageComparisonDialog] Reference image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
  };

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
            {matchingResult !== undefined && (
              <Typography variant="subtitle2" sx={{ color: '#666' }}>
                Confidence: {(matchingResult * 100).toFixed(1)}%
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ padding: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, height: '100%', minHeight: '400px' }}>
          {/* Source Image */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
              Source Image
            </Typography>
            <Box 
              sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ddd',
                borderRadius: 1,
                backgroundColor: '#f9f9f9',
                minHeight: '300px',
                overflow: 'hidden'
              }}
            >
              <img
                src={sourceUrl}
                alt="Source"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                onLoad={handleSourceImageLoad}
                onError={(e) => {
                  console.error('[@component:VerificationImageComparisonDialog] Failed to load source image:', sourceUrl);
                }}
              />
            </Box>
            {sourceImageDimensions && (
              <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', color: '#666' }}>
                Dimensions: {sourceImageDimensions.width} × {sourceImageDimensions.height}
                <br />
                Aspect Ratio: {(sourceImageDimensions.width / sourceImageDimensions.height).toFixed(2)}
              </Typography>
            )}
          </Box>

          {/* Reference Image */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
              Reference Image
            </Typography>
            <Box 
              sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ddd',
                borderRadius: 1,
                backgroundColor: '#f9f9f9',
                minHeight: '300px',
                overflow: 'hidden'
              }}
            >
              <img
                src={referenceUrl}
                alt="Reference"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
                onLoad={handleReferenceImageLoad}
                onError={(e) => {
                  console.error('[@component:VerificationImageComparisonDialog] Failed to load reference image:', referenceUrl);
                }}
              />
            </Box>
            {referenceImageDimensions && (
              <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', color: '#666' }}>
                Dimensions: {referenceImageDimensions.width} × {referenceImageDimensions.height}
                <br />
                Aspect Ratio: {(referenceImageDimensions.width / referenceImageDimensions.height).toFixed(2)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Additional Information */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Verification Details:
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
            {userThreshold !== undefined && (
              <Typography variant="body2">
                <strong>Threshold:</strong> {(userThreshold * 100).toFixed(1)}%
              </Typography>
            )}
            {matchingResult !== undefined && (
              <Typography variant="body2">
                <strong>Match Confidence:</strong> {(matchingResult * 100).toFixed(1)}%
              </Typography>
            )}
            {imageFilter && imageFilter !== 'none' && (
              <Typography variant="body2">
                <strong>Image Filter:</strong> {imageFilter}
              </Typography>
            )}
            {sourceImageDimensions && referenceImageDimensions && (
              <Typography variant="body2">
                <strong>Dimensions Match:</strong> {
                  sourceImageDimensions.width === referenceImageDimensions.width && 
                  sourceImageDimensions.height === referenceImageDimensions.height 
                    ? 'Yes' : 'No'
                }
              </Typography>
            )}
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