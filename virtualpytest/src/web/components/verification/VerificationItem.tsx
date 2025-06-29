import {
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { Box, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import React from 'react';

import {
  Verification,
  Verifications,
  ModelReferences,
} from '../../types/verification/Verification_Types';

import { VerificationControls } from './VerificationControls';
import { VerificationTestResults } from './VerificationTestResults';

interface VerificationItemProps {
  verification: Verification;
  index: number;
  availableVerifications: Verifications;
  modelReferences: ModelReferences;
  referencesLoading: boolean;
  testResult?: Verification;
  onVerificationSelect: (index: number, command: string) => void;
  onReferenceSelect: (index: number, referenceName: string) => void;
  onImageFilterChange: (index: number, filter: 'none' | 'greyscale' | 'binary') => void;
  onTextFilterChange: (index: number, filter: 'none' | 'greyscale' | 'binary') => void;
  onUpdateVerification: (index: number, updates: Partial<Verification>) => void;
  onRemoveVerification: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
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
  processImageUrl: (url: string) => string;
  getCacheBustedUrl: (url: string) => string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const VerificationItem: React.FC<VerificationItemProps> = ({
  verification,
  index,
  availableVerifications,
  modelReferences,
  referencesLoading: _referencesLoading,
  testResult,
  onVerificationSelect,
  onReferenceSelect,
  onImageFilterChange: _onImageFilterChange,
  onTextFilterChange: _onTextFilterChange,
  onUpdateVerification,
  onRemoveVerification,
  onMoveUp,
  onMoveDown,
  onImageClick,
  onSourceImageClick,
  processImageUrl,
  getCacheBustedUrl,
  canMoveUp,
  canMoveDown,
}) => {
  return (
    <Box
      sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      {/* Line 1: Verification dropdown */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
          <InputLabel>Verification</InputLabel>
          <Select
            value={verification.command}
            onChange={(e) => onVerificationSelect(index, e.target.value)}
            label="Verification"
            size="small"
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
              },
            }}
          >
            <MenuItem value="" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
              Select a verification...
            </MenuItem>
            {Object.entries(availableVerifications).map(([category, verifications]) =>
              verifications.map((verif) => (
                <MenuItem key={verif.command} value={verif.command} sx={{ fontSize: '0.75rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>[{category}]</span>
                    <span>{verif.command}</span>
                  </Box>
                </MenuItem>
              )),
            )}
          </Select>
        </FormControl>

        {/* Move buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <IconButton
            size="small"
            onClick={() => onMoveUp(index)}
            disabled={!canMoveUp}
            sx={{ p: 0.25, minWidth: 0, width: 20, height: 16 }}
          >
            <KeyboardArrowUpIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onMoveDown(index)}
            disabled={!canMoveDown}
            sx={{ p: 0.25, minWidth: 0, width: 20, height: 16 }}
          >
            <KeyboardArrowDownIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        </Box>

        {/* Remove button */}
        <IconButton
          size="small"
          onClick={() => onRemoveVerification(index)}
          sx={{ p: 0.25, minWidth: 0, width: 20, height: 20 }}
        >
          <CloseIcon sx={{ fontSize: '0.8rem' }} />
        </IconButton>
      </Box>

      {/* Line 2: Reference dropdowns - conditional based on verification type */}
      {verification.command && verification.verification_type === 'text' && (
        <FormControl size="small" sx={{ width: 250 }}>
          <InputLabel>Text Reference</InputLabel>
          <Select
            value={verification.params?.reference_name || ''}
            onChange={(e) => onReferenceSelect(index, e.target.value)}
            label="Text Reference"
            size="small"
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
              },
            }}
          >
            {Object.entries(modelReferences)
              .filter(([_internalKey, ref]) => ref.type === 'text')
              .map(([internalKey, ref]) => (
                <MenuItem key={internalKey} value={internalKey} sx={{ fontSize: '0.75rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    📝 <span>{ref.name || internalKey}</span>
                  </Box>
                </MenuItem>
              ))}
            {Object.entries(modelReferences).filter(([_internalKey, ref]) => ref.type === 'text')
              .length === 0 && (
              <MenuItem disabled value="" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                No text references available
              </MenuItem>
            )}
          </Select>
        </FormControl>
      )}

      {verification.command && verification.verification_type === 'image' && (
        <FormControl size="small" sx={{ width: 250 }}>
          <InputLabel>Image Reference</InputLabel>
          <Select
            value={verification.params?.image_path || verification.params?.reference_name || ''}
            onChange={(e) => onReferenceSelect(index, e.target.value)}
            label="Image Reference"
            size="small"
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
              },
            }}
          >
            {Object.entries(modelReferences)
              .filter(([_internalKey, ref]) => ref.type === 'image')
              .map(([internalKey, ref]) => (
                <MenuItem key={internalKey} value={internalKey} sx={{ fontSize: '0.75rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    🖼️ <span>{ref.name || internalKey}</span>
                  </Box>
                </MenuItem>
              ))}
            {Object.entries(modelReferences).filter(([_internalKey, ref]) => ref.type === 'image')
              .length === 0 && (
              <MenuItem disabled value="" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                No image references available
              </MenuItem>
            )}
          </Select>
        </FormControl>
      )}

      {/* Verification Controls */}
      <VerificationControls
        verification={verification}
        onUpdateVerification={onUpdateVerification}
        index={index}
      />

      {/* Test Results Display using extracted component */}
      {testResult && (
        <VerificationTestResults
          verification={verification}
          testResult={testResult}
          onImageClick={onImageClick}
          onSourceImageClick={onSourceImageClick}
          processImageUrl={processImageUrl}
          getCacheBustedUrl={getCacheBustedUrl}
        />
      )}
    </Box>
  );
};
