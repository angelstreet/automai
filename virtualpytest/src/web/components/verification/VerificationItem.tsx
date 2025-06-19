import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { NodeVerification } from '../../types/validation/NodeVerification';
import {
  Verification,
  Verifications,
  ModelReferences,
  VerificationTestResult,
} from '../../types/verification/VerificationTypes';
import { VerificationControls } from './VerificationControls';
import { VerificationTestResults } from './VerificationTestResults';

interface VerificationItemProps {
  verification: NodeVerification;
  index: number;
  availableActions: Verifications;
  modelReferences: ModelReferences;
  referencesLoading: boolean;
  testResult?: VerificationTestResult;
  onVerificationSelect: (index: number, actionId: string) => void;
  onReferenceSelect: (index: number, referenceName: string) => void;
  onImageFilterChange: (index: number, filter: 'none' | 'greyscale' | 'binary') => void;
  onTextFilterChange: (index: number, filter: 'none' | 'greyscale' | 'binary') => void;
  onUpdateVerification: (index: number, updates: Partial<NodeVerification>) => void;
  onRemoveVerification: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onImageClick: (
    sourceUrl: string,
    referenceUrl: string,
    userThreshold?: number,
    matchingResult?: number,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => void;
  onSourceImageClick: (sourceUrl: string, resultType: 'PASS' | 'FAIL' | 'ERROR') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export const VerificationItem: React.FC<VerificationItemProps> = ({
  verification,
  index,
  availableActions,
  modelReferences,
  referencesLoading,
  testResult,
  onVerificationSelect,
  onReferenceSelect,
  onImageFilterChange,
  onTextFilterChange,
  onUpdateVerification,
  onRemoveVerification,
  onMoveUp,
  onMoveDown,
  onImageClick,
  onSourceImageClick,
  canMoveUp,
  canMoveDown,
}) => {
  return (
    <Box
      sx={{ mb: 1, px: 0.5, py: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
    >
      {/* Line 1: Verification dropdown */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
          <Select
            value={verification.id}
            onChange={(e) => onVerificationSelect(index, e.target.value)}
            displayEmpty
            size="small"
            MenuProps={{
              PaperProps: {
                sx: {
                  maxHeight: 200,
                  '& .MuiMenuItem-root': {
                    fontSize: '0.8rem',
                    minHeight: '28px',
                    paddingTop: '2px',
                    paddingBottom: '2px',
                    lineHeight: 0.8,
                  },
                },
              },
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
              Object.values(availableActions).forEach((actions) => {
                if (Array.isArray(actions)) {
                  const action = actions.find((a) => a.command === selected);
                  if (action) {
                    selectedLabel = action.command
                      .replace(/_/g, ' ')
                      .replace(/([A-Z])/g, ' $1')
                      .trim();
                  }
                }
              });
              return selectedLabel || selected;
            }}
          >
            {Object.entries(availableActions).map(([category, actions]) => {
              // Ensure actions is an array
              if (!Array.isArray(actions)) {
                console.warn(
                  `[@component:VerificationItem] Invalid actions for category ${category}:`,
                  actions,
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
                ...actions.map((action) => (
                  <MenuItem
                    key={action.command}
                    value={action.command}
                    sx={{ pl: 3, fontSize: '0.7rem', minHeight: '28px' }}
                  >
                    {action.command
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

      {/* Line 3: Reference Image Selector or Manual Input - exclude ADB verifications */}
      {verification.id &&
        (verification.controller_type === 'image' || verification.controller_type === 'text') && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* First Row: Reference selection and test result status */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {verification.id &&
              Object.entries(modelReferences).some(([filename, ref]) => {
                // Check if there are references matching the verification type
                if (verification.controller_type === 'image') {
                  return ref.type === 'image';
                } else if (verification.controller_type === 'text') {
                  return ref.type === 'text';
                }
                return true;
              }) ? (
                <>
                  {/* Reference Dropdown - shows both image and text references */}
                  <FormControl size="small" sx={{ width: 250 }}>
                    <InputLabel>Reference</InputLabel>
                    <Select
                      value={
                        verification.params?.reference_image ||
                        verification.params?.reference_name ||
                        ''
                      }
                      onChange={(e) => onReferenceSelect(index, e.target.value)}
                      label="Reference"
                      size="small"
                      sx={{
                        '& .MuiSelect-select': {
                          fontSize: '0.8rem',
                        },
                      }}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.75rem' }}>
                        <em>Select reference...</em>
                      </MenuItem>
                      {Object.entries(modelReferences)
                        .filter(([filename, ref]) => {
                          // Filter references based on verification type
                          if (verification.controller_type === 'image') {
                            return ref.type === 'image';
                          } else if (verification.controller_type === 'text') {
                            return ref.type === 'text';
                          }
                          return true; // Show all if type is not determined
                        })
                        .map(([filename, ref]) => (
                          <MenuItem key={filename} value={filename} sx={{ fontSize: '0.75rem' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {ref.type === 'image' ? '🖼️' : '📝'}
                              <span>{filename}</span>
                              {ref.type === 'text' && ref.text && (
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
                    </Select>
                  </FormControl>
                </>
              ) : verification.id ? (
                /* Manual input for text/image when no references available */
                <TextField
                  size="small"
                  label={
                    verification.inputLabel ||
                    (verification.controller_type === 'image' ? 'Image Path' : 'Text to Find')
                  }
                  placeholder={
                    verification.inputPlaceholder ||
                    (verification.controller_type === 'image'
                      ? 'Enter image path...'
                      : 'Enter text or regex pattern...')
                  }
                  value={verification.inputValue || ''}
                  autoComplete="off"
                  onChange={(e) => onUpdateVerification(index, { inputValue: e.target.value })}
                  sx={{ width: 250 }}
                />
              ) : null}

              {/* Image Filter Selection - only for image verifications */}
              {verification.controller_type === 'image' && verification.id && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 0.5 }}>
                  <RadioGroup
                    value={verification.params?.image_filter || 'none'}
                    onChange={(e) =>
                      onImageFilterChange(index, e.target.value as 'none' | 'greyscale' | 'binary')
                    }
                    sx={{
                      gap: 0,
                      '& .MuiFormControlLabel-root': {
                        margin: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.65rem',
                          paddingLeft: '2px',
                        },
                        '& .MuiRadio-root': {
                          padding: '2px',
                          '& .MuiSvgIcon-root': {
                            fontSize: '0.9rem',
                          },
                        },
                      },
                    }}
                  >
                    <FormControlLabel value="none" control={<Radio />} label="None" />
                    <FormControlLabel value="greyscale" control={<Radio />} label="Greyscale" />
                    <FormControlLabel value="binary" control={<Radio />} label="Binarization" />
                  </RadioGroup>
                </Box>
              )}

              {/* Text Filter Selection - only for text verifications */}
              {verification.controller_type === 'text' && verification.id && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 0.5 }}>
                  <RadioGroup
                    value={verification.params?.text_filter || 'none'}
                    onChange={(e) =>
                      onTextFilterChange(index, e.target.value as 'none' | 'greyscale' | 'binary')
                    }
                    sx={{
                      gap: 0,
                      '& .MuiFormControlLabel-root': {
                        margin: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.65rem',
                          paddingLeft: '2px',
                        },
                        '& .MuiRadio-root': {
                          padding: '2px',
                          '& .MuiSvgIcon-root': {
                            fontSize: '0.9rem',
                          },
                        },
                      },
                    }}
                  >
                    <FormControlLabel value="none" control={<Radio />} label="None" />
                    <FormControlLabel value="greyscale" control={<Radio />} label="Greyscale" />
                    <FormControlLabel value="binary" control={<Radio />} label="Binarization" />
                  </RadioGroup>
                </Box>
              )}

              {/* Show loading indicator for references */}
              {verification.controller_type === 'image' && referencesLoading && (
                <CircularProgress size={16} />
              )}
            </Box>
          </Box>
        )}

      {/* Test Results Display using extracted component */}
      {testResult && (
        <VerificationTestResults
          verification={verification}
          testResult={testResult}
          onImageClick={onImageClick}
          onSourceImageClick={onSourceImageClick}
        />
      )}
    </Box>
  );
};
