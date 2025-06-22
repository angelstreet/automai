import { Box, Typography } from '@mui/material';
import React from 'react';

import { Verification } from '../../types/verification/VerificationTypes';

import { VerificationImageComparisonThumbnails } from './VerificationImageComparisonThumbnails';
import { VerificationTextComparisonDisplay } from './VerificationTextComparisonDisplay';

interface VerificationTestResultsProps {
  verification: Verification;
  testResult: Verification;
  onImageClick: (
    sourceUrl: string,
    referenceUrl: string,
    overlayUrl?: string,
    userThreshold?: number,
    matchingResult?: number,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => void;
  onSourceImageClick: (
    searchedText: string,
    extractedText: string,
    sourceUrl?: string,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    detectedLanguage?: string,
    languageConfidence?: number,
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => void;
}

export const VerificationTestResults: React.FC<VerificationTestResultsProps> = ({
  verification,
  testResult,
  onImageClick,
  onSourceImageClick,
}) => {
  return (
    <Box sx={{ mt: 0 }}>
      {/* Universal Test Result Status Indicator - shows for ALL verification types */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          minWidth: 120,
          padding: '4px 8px',
          borderRadius: 1,
          mb: 1,
          backgroundColor:
            testResult.resultType === 'PASS' || testResult.success
              ? 'rgba(76, 175, 80, 0.1)'
              : testResult.resultType === 'ERROR'
                ? 'rgba(255, 152, 0, 0.1)'
                : 'rgba(244, 67, 54, 0.1)',
          border: `2px solid ${
            testResult.resultType === 'PASS' || testResult.success
              ? '#4caf50'
              : testResult.resultType === 'ERROR'
                ? '#ff9800'
                : '#f44336'
          }`,
        }}
      >
        <Typography
          sx={{
            fontWeight: 'bold',
            fontSize: '0.75rem',
            color:
              testResult.resultType === 'PASS' || testResult.success
                ? '#4caf50'
                : testResult.resultType === 'ERROR'
                  ? '#ff9800'
                  : '#f44336',
          }}
        >
          {testResult.resultType === 'PASS' || testResult.success
            ? 'PASS'
            : testResult.resultType === 'ERROR'
              ? 'ERROR'
              : 'FAIL'}
        </Typography>

        {/* Display message within the same status box */}
        {(testResult.message || testResult.error) && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 500,
              color:
                testResult.resultType === 'PASS' || testResult.success
                  ? '#4caf50'
                  : testResult.resultType === 'ERROR'
                    ? '#ff9800'
                    : '#f44336',
              ml: 1,
            }}
          >
            {testResult.message || testResult.error}
          </Typography>
        )}
      </Box>

      {/* Image comparison thumbnails for image verifications */}
      {verification.verification_type === 'image' &&
        (testResult.sourceImageUrl || testResult.referenceImageUrl) && (
          <VerificationImageComparisonThumbnails
            sourceUrl={testResult.sourceImageUrl || ''}
            referenceUrl={testResult.referenceImageUrl || ''}
            overlayUrl={testResult.resultOverlayUrl}
            resultType={testResult.resultType || (testResult.success ? 'PASS' : 'FAIL')}
            userThreshold={verification.params?.threshold}
            matchingResult={testResult.threshold}
            imageFilter={verification.params?.image_filter || 'none'}
            onImageClick={onImageClick}
          />
        )}

      {/* Text comparison for text verifications */}
      {verification.verification_type === 'text' &&
        (testResult.searchedText || testResult.sourceImageUrl) && (
          <VerificationTextComparisonDisplay
            searchedText={testResult.searchedText || verification.params?.text || ''}
            extractedText={testResult.extractedText || ''}
            sourceUrl={testResult.sourceImageUrl}
            resultType={testResult.resultType || (testResult.success ? 'PASS' : 'FAIL')}
            detectedLanguage={testResult.detectedLanguage}
            languageConfidence={testResult.languageConfidence}
            onSourceImageClick={onSourceImageClick}
          />
        )}
    </Box>
  );
};
