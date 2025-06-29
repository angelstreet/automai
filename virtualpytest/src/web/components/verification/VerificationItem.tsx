import {
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
} from '@mui/material';
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
  onSourceImageClick: (sourceUrl: string, resultType: 'PASS' | 'FAIL' | 'ERROR') => void;
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
          <Select
            value={typeof verification.command === 'string' ? verification.command : ''}
            onChange={(e) => onVerificationSelect(index, e.target.value)}
            displayEmpty
            size="small"
            MenuProps={{
              PaperProps: {
                sx: {
                  '& .MuiMenuItem-root': {
                    fontSize: '0.8rem',
                    minHeight: '28px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    lineHeight: 0.8,
                  },
                },
              },
              disablePortal: true,
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              variant: 'menu',
              disableAutoFocus: true,
              disableEnforceFocus: true,
            }}
            sx={{
              '& .MuiSelect-select': {
                fontSize: '0.8rem',
                paddingTop: '4px',
                paddingBottom: '2px',
              },
            }}
            renderValue={(selected) => {
              if (!selected) {
                return <em style={{ fontSize: '0.8rem' }}>Select verification...</em>;
              }
              // Find the selected verification to display its command as label
              let selectedLabel = '';
              Object.values(availableVerifications).forEach((verifications) => {
                if (Array.isArray(verifications)) {
                  const verification = verifications.find((v) => v.command === selected);
                  if (verification) {
                    selectedLabel = verification.command
                      .replace(/_/g, ' ')
                      .replace(/([A-Z])/g, ' $1')
                      .trim();
                  }
                }
              });
              return selectedLabel || selected;
            }}
          >
            {Object.entries(availableVerifications).map(([category, verifications]) => {
              // Ensure verifications is an array
              if (!Array.isArray(verifications)) {
                console.warn(
                  `[@component:VerificationItem] Invalid verifications for category ${category}:`,
                  verifications,
                );
                return null;
              }

              return [
                <MenuItem
                  key={`header-${category}`}
                  disabled
                  sx={{ fontWeight: 'bold', fontSize: '0.65rem', minHeight: '24px' }}
                >
                  {category.replace(/_/g, ' ').toUpperCase()}
                </MenuItem>,
                ...verifications.map((verification) => (
                  <MenuItem
                    key={verification.command}
                    value={verification.command}
                    sx={{ pl: 3, fontSize: '0.7rem', minHeight: '28px' }}
                  >
                    {verification.command
                      .replace(/_/g, ' ')
                      .replace(/([A-Z])/g, ' $1')
                      .trim()}
                  </MenuItem>
                )),
              ];
            })}
          </Select>
        </FormControl>

        <IconButton
          size="small"
          onClick={() => onMoveUp(index)}
          disabled={!canMoveUp}
          sx={{ opacity: !canMoveUp ? 0.3 : 1 }}
        >
          <KeyboardArrowUpIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={() => onMoveDown(index)}
          disabled={!canMoveDown}
          sx={{ opacity: !canMoveDown ? 0.3 : 1 }}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>

        <IconButton size="small" onClick={() => onRemoveVerification(index)} color="error">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Line 2: Parameter controls using extracted component */}
      <VerificationControls
        verification={verification}
        index={index}
        onUpdateVerification={onUpdateVerification}
      />

      {/* Line 3: Reference selector for text/image, nothing for ADB */}
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
              .filter(([_filename, ref]) => ref.type === 'text')
              .map(([filename, ref]) => (
                <MenuItem key={filename} value={filename} sx={{ fontSize: '0.75rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    📝 <span>{filename}</span>
                    {ref.text && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: 'text.secondary',
                          ml: 0.5,
                          maxWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ({ref.text})
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            {Object.entries(modelReferences).filter(([_filename, ref]) => ref.type === 'text')
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
              .filter(([_filename, ref]) => ref.type === 'image')
              .map(([filename, _ref]) => (
                <MenuItem key={filename} value={filename} sx={{ fontSize: '0.75rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    🖼️ <span>{filename}</span>
                  </Box>
                </MenuItem>
              ))}
            {Object.entries(modelReferences).filter(([_filename, ref]) => ref.type === 'image')
              .length === 0 && (
              <MenuItem disabled value="" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                No image references available
              </MenuItem>
            )}
          </Select>
        </FormControl>
      )}

      {/* Test Results Display using extracted component */}
      {testResult && (
        <VerificationTestResults
          verification={verification}
          testResult={testResult}
          processImageUrl={processImageUrl}
          getCacheBustedUrl={getCacheBustedUrl}
          onImageClick={onImageClick}
          onSourceImageClick={onSourceImageClick}
        />
      )}
    </Box>
  );
};
