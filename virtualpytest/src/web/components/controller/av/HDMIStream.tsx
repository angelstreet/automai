import {
  Camera as CameraIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Typography,
  TextField,
  Collapse,
  IconButton,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

import { useHdmiStream } from '../../../hooks/useHdmiStream';
import { Host } from '../../../types/common/Host_Types';

import { ScreenshotCapture } from './ScreenshotCapture';
import { StreamViewer } from './StreamViewer';
import { VideoCapture } from './VideoCapture';

interface HDMIStreamProps {
  host: Host;
  isCollapsed?: boolean;
}

export function HDMIStream({ host, isCollapsed = true }: HDMIStreamProps) {
  console.log(`[@component:HDMIStream] Rendering for host: ${host.host_name}`);

  // Local state for stream info
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);

  // Get stream URL from AV controller
  const getStreamUrl = useCallback(async () => {
    try {
      console.log(`[@component:HDMIStream] Getting stream URL for host: ${host.host_name}`);
      setIsLoadingStream(true);

      const response = await fetch('/server/av/get-stream-url', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success && result.stream_url) {
        console.log(`[@component:HDMIStream] Got stream URL: ${result.stream_url}`);
        setStreamUrl(result.stream_url);
        setIsStreamActive(true);
      } else {
        console.error(`[@component:HDMIStream] Failed to get stream URL:`, result.error);
        setStreamUrl('');
        setIsStreamActive(false);
      }
    } catch (error) {
      console.error(`[@component:HDMIStream] Error getting stream URL:`, error);
      setStreamUrl('');
      setIsStreamActive(false);
    } finally {
      setIsLoadingStream(false);
    }
  }, [host.host_name]);

  // Fetch stream URL when component mounts
  useEffect(() => {
    if (host?.controller_configs?.av?.implementation === 'hdmi_stream') {
      getStreamUrl();
    } else {
      setIsLoadingStream(false);
    }
  }, [host, getStreamUrl]);

  // All business logic is in the hook - now with stream info from component
  const {
    // State
    captureMode,
    selectedArea,
    screenshotPath,
    videoFramesPath,
    totalFrames,
    currentFrame,
    referenceName,
    capturedReferenceImage,
    hasCaptured,
    successMessage,
    captureCollapsed,
    referenceText,
    referenceType,
    detectedTextData,
    imageProcessingOptions,
    captureContainerRef,
    videoElementRef,
    canCapture,
    allowSelection,
    layoutConfig,

    // Actions
    setCaptureMode,
    setCurrentFrame,
    setReferenceName,
    setCaptureCollapsed,
    setReferenceText,
    setReferenceType,
    setImageProcessingOptions,
    handleAreaSelected,
    handleClearSelection,
    handleImageLoad,
    handleCaptureReference,
    handleTakeScreenshot,
    handleAutoDetectText,
    validateRegex,
  } = useHdmiStream({ host, streamUrl, isStreamActive });

  // Local UI state
  const [expanded, setExpanded] = useState(!isCollapsed);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '3px',
          '&:hover': {
            background: 'rgba(255,255,255,0.5)',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ p: 0.25, mr: 0.5 }}>
          {expanded ? (
            <ArrowDownIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <ArrowRightIcon sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          HDMI Stream - {host.host_name}
          <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
            ({host.device_model}){' '}
            {!layoutConfig.isMobileModel && (
              <Typography component="span" sx={{ fontSize: '0.7rem' }}>
                [Landscape]
              </Typography>
            )}
            {isLoadingStream && (
              <Typography component="span" sx={{ fontSize: '0.7rem', color: 'orange' }}>
                [Loading...]
              </Typography>
            )}
            {!isLoadingStream && !isStreamActive && (
              <Typography component="span" sx={{ fontSize: '0.7rem', color: 'red' }}>
                [No Stream]
              </Typography>
            )}
            {!isLoadingStream && isStreamActive && (
              <Typography component="span" sx={{ fontSize: '0.7rem', color: 'green' }}>
                [Active]
              </Typography>
            )}
          </Typography>
        </Typography>
      </Box>

      <Collapse in={expanded}>
        <Box>
          {/* =================== CAPTURE SECTION =================== */}
          <Box>
            {/* Capture Section Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => setCaptureCollapsed(!captureCollapsed)}
                sx={{ p: 0.25, mr: 0.5 }}
              >
                {captureCollapsed ? (
                  <ArrowRightIcon sx={{ fontSize: '1rem' }} />
                ) : (
                  <ArrowDownIcon sx={{ fontSize: '1rem' }} />
                )}
              </IconButton>
              <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Capture
              </Typography>
            </Box>

            {/* Collapsible Capture Content */}
            <Collapse in={!captureCollapsed}>
              <Box>
                {/* 1. Capture Container (Reference Image Preview) */}
                <Box>
                  <Box
                    ref={captureContainerRef}
                    sx={{
                      position: 'relative',
                      width: '100%',
                      height: layoutConfig.captureHeight,
                      border: '2px dashed #444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      overflow: 'hidden',
                      mb: 1.5,
                    }}
                  >
                    {capturedReferenceImage ? (
                      <>
                        <img
                          src={capturedReferenceImage}
                          alt="Captured Reference"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            maxHeight: layoutConfig.isMobileModel ? 'none' : '100%',
                          }}
                        />
                        {/* Success message overlay */}
                        {successMessage && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              zIndex: 10,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#4caf50',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textAlign: 'center',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              }}
                            >
                              {successMessage}
                            </Typography>
                          </Box>
                        )}
                      </>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '0.65rem',
                          textAlign: 'center',
                          px: 0.5,
                        }}
                      >
                        {allowSelection ? 'Drag area on main image' : 'No image'}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* 2. Drag Area Info (Selection Info) */}
                <Box sx={{ mb: 0 }}>
                  {selectedArea ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5 }}>
                      <TextField
                        size="small"
                        label="X"
                        type="number"
                        value={Math.round(selectedArea.x)}
                        onChange={(e) => {
                          const newX = parseFloat(e.target.value) || 0;
                          handleAreaSelected({
                            ...selectedArea,
                            x: newX,
                          });
                        }}
                        sx={{
                          height: '28px',
                          '& .MuiInputBase-root': {
                            height: '28px',
                            minHeight: '28px',
                            maxHeight: '28px',
                            overflow: 'hidden',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            height: '100%',
                            boxSizing: 'border-box',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.7rem',
                            transform: 'translate(14px, 6px) scale(1)',
                            '&.Mui-focused, &.MuiFormLabel-filled': {
                              transform: 'translate(14px, -9px) scale(0.75)',
                            },
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        label="Y"
                        type="number"
                        value={Math.round(selectedArea.y)}
                        onChange={(e) => {
                          const newY = parseFloat(e.target.value) || 0;
                          handleAreaSelected({
                            ...selectedArea,
                            y: newY,
                          });
                        }}
                        sx={{
                          height: '28px',
                          '& .MuiInputBase-root': {
                            height: '28px',
                            minHeight: '28px',
                            maxHeight: '28px',
                            overflow: 'hidden',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            height: '100%',
                            boxSizing: 'border-box',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.7rem',
                            transform: 'translate(14px, 6px) scale(1)',
                            '&.Mui-focused, &.MuiFormLabel-filled': {
                              transform: 'translate(14px, -9px) scale(0.75)',
                            },
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        label="Width"
                        type="number"
                        value={Math.round(selectedArea.width)}
                        onChange={(e) => {
                          const newWidth = parseFloat(e.target.value) || 0;
                          handleAreaSelected({
                            ...selectedArea,
                            width: newWidth,
                          });
                        }}
                        sx={{
                          height: '28px',
                          '& .MuiInputBase-root': {
                            height: '28px',
                            minHeight: '28px',
                            maxHeight: '28px',
                            overflow: 'hidden',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            height: '100%',
                            boxSizing: 'border-box',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.7rem',
                            transform: 'translate(14px, 6px) scale(1)',
                            '&.Mui-focused, &.MuiFormLabel-filled': {
                              transform: 'translate(14px, -9px) scale(0.75)',
                            },
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        label="Height"
                        type="number"
                        value={Math.round(selectedArea.height)}
                        onChange={(e) => {
                          const newHeight = parseFloat(e.target.value) || 0;
                          handleAreaSelected({
                            ...selectedArea,
                            height: newHeight,
                          });
                        }}
                        sx={{
                          height: '28px',
                          '& .MuiInputBase-root': {
                            height: '28px',
                            minHeight: '28px',
                            maxHeight: '28px',
                            overflow: 'hidden',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            height: '100%',
                            boxSizing: 'border-box',
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: '0.7rem',
                            transform: 'translate(14px, 6px) scale(1)',
                            '&.Mui-focused, &.MuiFormLabel-filled': {
                              transform: 'translate(14px, -9px) scale(0.75)',
                            },
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}
                    >
                      No area selected
                    </Typography>
                  )}
                </Box>

                {/* 3. Reference Type Selection with Image Processing Options */}
                <Box
                  sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0, flexWrap: 'wrap' }}
                >
                  <RadioGroup
                    row
                    value={referenceType}
                    onChange={(e) => {
                      setReferenceType(e.target.value as 'image' | 'text');
                      // Reset related states when switching types
                      if (e.target.value === 'text') {
                        setReferenceText('');
                        // Reset image processing options when switching to text
                        setImageProcessingOptions({ autocrop: false, removeBackground: false });
                      }
                    }}
                    sx={{
                      gap: 1,
                      '& .MuiFormControlLabel-root': {
                        margin: 0,
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.7rem',
                        },
                      },
                    }}
                  >
                    <FormControlLabel
                      value="image"
                      control={<Radio size="small" />}
                      label="Image"
                    />
                    <FormControlLabel value="text" control={<Radio size="small" />} label="Text" />
                  </RadioGroup>

                  {/* Image Processing Options (only for image type) */}
                  {referenceType === 'image' && (
                    <>
                      <FormControlLabel
                        control={
                          <input
                            type="checkbox"
                            checked={imageProcessingOptions.autocrop}
                            onChange={(e) =>
                              setImageProcessingOptions((prev) => ({
                                ...prev,
                                autocrop: e.target.checked,
                              }))
                            }
                            style={{ transform: 'scale(0.8)' }}
                          />
                        }
                        label="Auto-crop"
                        sx={{
                          margin: 0,
                          '& .MuiFormControlLabel-label': {
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.9)',
                          },
                        }}
                      />
                      <FormControlLabel
                        control={
                          <input
                            type="checkbox"
                            checked={imageProcessingOptions.removeBackground}
                            onChange={(e) =>
                              setImageProcessingOptions((prev) => ({
                                ...prev,
                                removeBackground: e.target.checked,
                              }))
                            }
                            style={{ transform: 'scale(0.8)' }}
                          />
                        }
                        label="Remove background"
                        sx={{
                          margin: 0,
                          '& .MuiFormControlLabel-label': {
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.9)',
                          },
                        }}
                      />
                    </>
                  )}
                </Box>

                {/* 4. Text Input and Auto-Detect (only for text type) */}
                {referenceType === 'text' && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
                    <TextField
                      size="small"
                      label="Text / Regex Pattern"
                      placeholder="Enter text to find or regex pattern"
                      value={referenceText}
                      onChange={(e) => setReferenceText(e.target.value)}
                      error={!!(referenceText && !validateRegex(referenceText))}
                      helperText={
                        referenceText && !validateRegex(referenceText)
                          ? 'Invalid regex pattern'
                          : ''
                      }
                      sx={{
                        flex: 1,
                        '& .MuiInputBase-input': {
                          fontSize: '0.75rem',
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: '0.75rem',
                        },
                        '& .MuiFormHelperText-root': {
                          fontSize: '0.65rem',
                        },
                      }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleAutoDetectText}
                      disabled={!selectedArea || !host.device_model}
                      sx={{
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Auto-Detect
                    </Button>
                  </Box>
                )}

                {/* 5. Detected Text Info (only for text type with detected data) */}
                {referenceType === 'text' && detectedTextData && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.65rem', color: 'text.secondary' }}
                    >
                      Detected: Font Size {detectedTextData.fontSize}px, Confidence{' '}
                      {(detectedTextData.confidence * 100).toFixed(1)}%
                      {detectedTextData.detectedLanguageName && (
                        <>, Language: {detectedTextData.detectedLanguageName}</>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* 6. Reference Name + Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
                  {/* Reference Name Input */}
                  <TextField
                    size="small"
                    placeholder="Reference name"
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                    sx={{
                      flex: 1,
                      '& .MuiInputBase-input': {
                        fontSize: '0.75rem',
                      },
                    }}
                  />

                  {/* Action Buttons */}
                  {referenceType === 'image' && (
                    <Button
                      size="small"
                      startIcon={<CameraIcon sx={{ fontSize: '1rem' }} />}
                      variant="contained"
                      onClick={handleCaptureReference}
                      disabled={!canCapture}
                      sx={{
                        bgcolor: '#1976d2',
                        fontSize: '0.75rem',
                        '&:hover': {
                          bgcolor: '#1565c0',
                        },
                        '&:disabled': {
                          bgcolor: '#333',
                          color: 'rgba(255,255,255,0.3)',
                        },
                      }}
                    >
                      Capture
                    </Button>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<CameraIcon />}
                    onClick={handleTakeScreenshot}
                    size="small"
                    sx={{
                      bgcolor: '#4caf50',
                      fontSize: '0.75rem',
                      '&:hover': {
                        bgcolor: '#45a049',
                      },
                    }}
                  >
                    Screenshot
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={handleClearSelection}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                    }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Box>

          {/* =================== STREAM VIEWER SECTION =================== */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600, mb: 1 }}>
              Stream Viewer
            </Typography>

            {/* Capture Mode Selection */}
            <Box sx={{ mb: 1 }}>
              <RadioGroup
                row
                value={captureMode}
                onChange={(e) =>
                  setCaptureMode(e.target.value as 'stream' | 'screenshot' | 'video')
                }
                sx={{
                  gap: 1,
                  '& .MuiFormControlLabel-root': {
                    margin: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: '0.7rem',
                    },
                  },
                }}
              >
                <FormControlLabel
                  value="stream"
                  control={<Radio size="small" />}
                  label="Live Stream"
                />
                <FormControlLabel
                  value="screenshot"
                  control={<Radio size="small" />}
                  label="Screenshot"
                />
                <FormControlLabel
                  value="video"
                  control={<Radio size="small" />}
                  label="Video Capture"
                />
              </RadioGroup>
            </Box>

            {/* Main Content */}
            <Box
              sx={{
                height: 400,
                border: '1px solid #444',
                borderRadius: 1,
                overflow: 'hidden',
                mb: 1,
              }}
            >
              {captureMode === 'stream' && (
                <StreamViewer
                  streamUrl={streamUrl}
                  onImageLoad={handleImageLoad}
                  onAreaSelected={handleAreaSelected}
                  selectedArea={selectedArea}
                  capturedReferenceImage={capturedReferenceImage}
                  hasCaptured={hasCaptured}
                />
              )}

              {captureMode === 'screenshot' && (
                <ScreenshotCapture
                  imagePath={screenshotPath}
                  onImageLoad={handleImageLoad}
                  onAreaSelected={handleAreaSelected}
                  selectedArea={selectedArea}
                  capturedReferenceImage={capturedReferenceImage}
                  hasCaptured={hasCaptured}
                />
              )}

              {captureMode === 'video' && (
                <VideoCapture
                  videoFramesPath={videoFramesPath}
                  totalFrames={totalFrames}
                  currentFrame={currentFrame}
                  onFrameChange={setCurrentFrame}
                  onImageLoad={handleImageLoad}
                  onAreaSelected={handleAreaSelected}
                  selectedArea={selectedArea}
                  capturedReferenceImage={capturedReferenceImage}
                  hasCaptured={hasCaptured}
                  videoElementRef={videoElementRef}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
