import React from 'react';
import { Box, TextField } from '@mui/material';

import { Verification } from '../../types/verification/VerificationTypes';

interface VerificationControlsProps {
  verification: Verification;
  index: number;
  onUpdateVerification: (index: number, updates: Partial<Verification>) => void;
}

export const VerificationControls: React.FC<VerificationControlsProps> = ({
  verification,
  index,
  onUpdateVerification,
}) => {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0, px: 0, mx: 0 }}>
      {verification.command && (
        <TextField
          size="small"
          type="number"
          label="Timeout"
          value={verification.params?.timeout !== undefined ? verification.params.timeout : 1}
          autoComplete="off"
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            onUpdateVerification(index, {
              params: {
                ...verification.params,
                timeout: isNaN(value) ? 1 : value,
              },
            });
          }}
          sx={{
            width: 80,
            '& .MuiInputBase-input': {
              padding: '4px 8px',
              fontSize: '0.8rem',
            },
          }}
          inputProps={{ min: 0, max: 60, step: 0.5 }}
        />
      )}

      {verification.command &&
        (verification.verification_type === 'image' ||
          verification.verification_type === 'text') && (
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

      {verification.command && verification.verification_type === 'text' && (
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

      {verification.command &&
        (verification.verification_type === 'image' ||
          verification.verification_type === 'text') && (
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
