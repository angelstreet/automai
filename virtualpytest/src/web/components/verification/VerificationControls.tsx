import React from 'react';
import { Box, TextField } from '@mui/material';

import { NodeVerification } from '../../types/validation/NodeVerification';

// Utility function to extract actual values from parameter definitions
const getParamValue = (param: any, defaultValue: any) => {
  if (typeof param === 'object' && param !== null && 'default' in param) {
    return param.default;
  }
  return param !== undefined ? param : defaultValue;
};

interface VerificationControlsProps {
  verification: NodeVerification;
  index: number;
  onUpdateVerification: (index: number, updates: Partial<NodeVerification>) => void;
}

export const VerificationControls: React.FC<VerificationControlsProps> = ({
  verification,
  index,
  onUpdateVerification,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0, px: 0, mx: 0 }}>
      {verification.id && (
        <TextField
          size="small"
          type="number"
          label="Timeout"
          value={verification.params?.timeout || 1}
          autoComplete="off"
          onChange={(e) =>
            onUpdateVerification(index, {
              params: {
                ...verification.params,
                timeout: parseFloat(e.target.value) || 1,
              },
            })
          }
          sx={{
            width: 80,
            '& .MuiInputBase-input': {
              padding: '4px 8px',
              fontSize: '0.8rem',
            },
          }}
          inputProps={{ min: 1, max: 60, step: 0.5 }}
        />
      )}

      {verification.id && verification.controller_type === 'adb' && verification.requiresInput && (
        <TextField
          size="small"
          label={verification.inputLabel || 'Element Criteria'}
          placeholder={verification.inputPlaceholder || 'text=Button'}
          value={verification.inputValue || ''}
          autoComplete="off"
          onChange={(e) => onUpdateVerification(index, { inputValue: e.target.value })}
          sx={{
            flex: 1,
            '& .MuiInputBase-input': {
              padding: '4px 8px',
              fontSize: '0.8rem',
            },
          }}
        />
      )}

      {verification.id &&
        (verification.controller_type === 'image' || verification.controller_type === 'text') && (
          <TextField
            size="small"
            type="number"
            label="Threshold"
            value={verification.params?.threshold || 0.9}
            autoComplete="off"
            onChange={(e) =>
              onUpdateVerification(index, {
                params: {
                  ...verification.params,
                  threshold: parseFloat(e.target.value) || 0.9,
                },
              })
            }
            sx={{
              width: 80,
              '& .MuiInputBase-input': {
                padding: '4px 8px',
                fontSize: '0.8rem',
              },
            }}
            inputProps={{ min: 0.1, max: 1.0, step: 0.05 }}
          />
        )}

      {verification.id && verification.controller_type === 'text' && (
        <TextField
          size="small"
          type="number"
          label="Confidence"
          value={verification.params?.confidence || 0.8}
          autoComplete="off"
          onChange={(e) =>
            onUpdateVerification(index, {
              params: {
                ...verification.params,
                confidence: parseFloat(e.target.value) || 0.8,
              },
            })
          }
          sx={{
            width: 80,
            '& .MuiInputBase-input': {
              padding: '4px 8px',
              fontSize: '0.8rem',
            },
          }}
          inputProps={{ min: 0.1, max: 1.0, step: 0.05 }}
        />
      )}

      {verification.id &&
        (verification.controller_type === 'image' || verification.controller_type === 'text') && (
          <>
            <TextField
              size="small"
              type="number"
              label="X"
              value={verification.params?.area?.x || 0}
              autoComplete="off"
              onChange={(e) =>
                onUpdateVerification(index, {
                  params: {
                    ...verification.params,
                    area: {
                      ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                      x: parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
              sx={{
                width: 70,
                '& .MuiInputBase-input': {
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                },
              }}
              inputProps={{ min: 0 }}
            />
            <TextField
              size="small"
              type="number"
              label="Y"
              value={verification.params?.area?.y || 0}
              autoComplete="off"
              onChange={(e) =>
                onUpdateVerification(index, {
                  params: {
                    ...verification.params,
                    area: {
                      ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                      y: parseInt(e.target.value) || 0,
                    },
                  },
                })
              }
              sx={{
                width: 70,
                '& .MuiInputBase-input': {
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                },
              }}
              inputProps={{ min: 0 }}
            />
            <TextField
              size="small"
              type="number"
              label="Width"
              value={verification.params?.area?.width || 100}
              autoComplete="off"
              onChange={(e) =>
                onUpdateVerification(index, {
                  params: {
                    ...verification.params,
                    area: {
                      ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                      width: parseInt(e.target.value) || 100,
                    },
                  },
                })
              }
              sx={{
                width: 80,
                '& .MuiInputBase-input': {
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                },
              }}
              inputProps={{ min: 1 }}
            />
            <TextField
              size="small"
              type="number"
              label="Height"
              value={verification.params?.area?.height || 100}
              autoComplete="off"
              onChange={(e) =>
                onUpdateVerification(index, {
                  params: {
                    ...verification.params,
                    area: {
                      ...(verification.params?.area || { x: 0, y: 0, width: 100, height: 100 }),
                      height: parseInt(e.target.value) || 100,
                    },
                  },
                })
              }
              sx={{
                width: 80,
                '& .MuiInputBase-input': {
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                },
              }}
              inputProps={{ min: 1 }}
            />
          </>
        )}
    </Box>
  );
};
