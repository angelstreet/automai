import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';

interface VerificationTestResult {
  success: boolean;
  message?: string;
  error?: string;
  threshold?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  sourceImageUrl?: string;
  referenceImageUrl?: string;
  extractedText?: string;
  searchedText?: string;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  detectedLanguage?: string;
  languageConfidence?: number;
  ocrConfidence?: number;
}

interface VerificationResultsDisplayProps {
  testResults: VerificationTestResult[];
  verifications: any[];
  passCondition?: 'all' | 'any';
  onPassConditionChange?: (condition: 'all' | 'any') => void;
  showPassConditionSelector?: boolean;
  compact?: boolean;
}

export const VerificationResultsDisplay: React.FC<VerificationResultsDisplayProps> = ({
  testResults,
  verifications,
  passCondition = 'all',
  onPassConditionChange,
  showPassConditionSelector = true,
  compact = false,
}) => {
  if (testResults.length === 0) {
    return null;
  }

  const finalPassed = passCondition === 'all'
    ? testResults.every(result => result.success || result.resultType === 'PASS')
    : testResults.some(result => result.success || result.resultType === 'PASS');

  return (
    <Box>
      {/* Individual Test Results */}
      {!compact && (
        <Box sx={{ mb: 2 }}>
          {testResults.map((result, index) => (
            <Box key={index} sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {/* Verification Label */}
                <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                  {verifications[index]?.label || verifications[index]?.id || `Verification ${index + 1}`}
                </Typography>
                
                {/* Result Indicator */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  minWidth: 120,
                  padding: '4px 8px',
                  borderRadius: 1,
                  backgroundColor: result.resultType === 'PASS' 
                    ? 'rgba(76, 175, 80, 0.1)' 
                    : result.resultType === 'ERROR' 
                      ? 'rgba(255, 152, 0, 0.1)' 
                      : 'rgba(244, 67, 54, 0.1)',
                  border: `1px solid ${
                    result.resultType === 'PASS' 
                      ? '#4caf50' 
                      : result.resultType === 'ERROR' 
                        ? '#ff9800' 
                        : '#f44336'
                  }`
                }}>
                  <Box sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: result.resultType === 'PASS' 
                      ? '#4caf50' 
                      : result.resultType === 'ERROR' 
                        ? '#ff9800' 
                        : '#f44336'
                  }} />
                  <Typography variant="caption" sx={{ 
                    fontSize: '0.7rem',
                    color: result.resultType === 'PASS' 
                      ? '#4caf50' 
                      : result.resultType === 'ERROR' 
                        ? '#ff9800' 
                        : '#f44336',
                    fontWeight: 600
                  }}>
                    {result.resultType || (result.success ? 'PASS' : 'FAIL')}
                  </Typography>
                  
                  {/* Show threshold for image verifications */}
                  {verifications[index]?.controller_type === 'image' && result.threshold !== undefined && (
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      ml: 0.5
                    }}>
                      {(result.threshold * 100).toFixed(1)}%
                    </Typography>
                  )}
                  
                  {/* Show OCR confidence for text verifications */}
                  {verifications[index]?.controller_type === 'text' && result.ocrConfidence !== undefined && (
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      ml: 0.5
                    }}>
                      {result.ocrConfidence.toFixed(1)}%
                    </Typography>
                  )}
                </Box>
              </Box>
              
              {/* Show message if available */}
              {(result.message || result.error) && (
                <Typography variant="caption" sx={{ 
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  display: 'block'
                }}>
                  {result.message || result.error}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Pass Condition Selector and Final Result */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2 }}>
        {showPassConditionSelector && onPassConditionChange && (
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={passCondition}
              onChange={(e) => onPassConditionChange(e.target.value as 'all' | 'any')}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '30px',
                '& .MuiSelect-select': {
                  padding: '5px 10px',
                }
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All must pass</MenuItem>
              <MenuItem value="any" sx={{ fontSize: '0.75rem' }}>Any can pass</MenuItem>
            </Select>
          </FormControl>
        )}
        
        {/* Final Result indicator */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          p: 1,
          borderRadius: 1,
          backgroundColor: finalPassed 
            ? 'rgba(76, 175, 80, 0.1)' 
            : 'rgba(244, 67, 54, 0.1)',
          border: `1px solid ${finalPassed ? '#4caf50' : '#f44336'}`
        }}>
          <Typography sx={{ 
            fontWeight: 'bold',
            color: finalPassed ? '#4caf50' : '#f44336',
            fontSize: compact ? '0.8rem' : '1rem'
          }}>
            Final Result: {finalPassed ? 'PASS' : 'FAIL'}
          </Typography>
          {!compact && (
            <Typography sx={{ 
              ml: 1,
              color: finalPassed ? '#4caf50' : '#f44336',
              fontSize: '0.9rem'
            }}>
              ({testResults.filter(r => r.success || r.resultType === 'PASS').length}/{testResults.length} passed)
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}; 