import {
  GridView as HeatmapIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  PlayArrow,
  Pause,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert as MuiAlert,
  Slider,
  IconButton,
  LinearProgress,
  Chip,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Popper,
  Fade,
} from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';

import { useHeatmap, HeatmapData, HeatmapImage } from '../hooks/pages/useHeatmap';
import { MonitoringOverlay } from '../components/monitoring/MonitoringOverlay';

const Heatmap: React.FC = () => {
  const {
    getHeatmapData,
    generateHeatmap,
    checkGenerationStatus,
    cancelGeneration,
    isGenerating,
    currentGeneration,
  } = useHeatmap();

  // Data state
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeline player state (following VideoCapture.tsx pattern)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  // AI Analysis state
  const [analysisExpanded, setAnalysisExpanded] = useState(true); // Expanded by default

  // Tooltip state
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [tooltipDelay, setTooltipDelay] = useState<NodeJS.Timeout | null>(null);
  const [tooltipImage, setTooltipImage] = useState<HeatmapImage | null>(null);

  // Tooltip handlers
  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>, image: HeatmapImage) => {
    console.log('[@Heatmap] Mouse enter triggered for:', image.host_name);

    // Clear any existing delay
    if (tooltipDelay) {
      clearTimeout(tooltipDelay);
    }

    // Set a delay before showing tooltip
    const delay = setTimeout(() => {
      const target = event.currentTarget;
      console.log('[@Heatmap] Setting tooltip anchor:', target);

      setTooltipAnchor(target);
      setTooltipImage(image);
      setTooltipOpen(true);

      console.log('[@Heatmap] Tooltip should now be open');
    }, 300); // 300ms delay (under 1s as requested)

    setTooltipDelay(delay);
  };

  const handleMouseLeave = () => {
    // Clear delay if mouse leaves before tooltip shows
    if (tooltipDelay) {
      clearTimeout(tooltipDelay);
      setTooltipDelay(null);
    }

    // Hide tooltip and clear anchor
    setTooltipOpen(false);
    setTooltipAnchor(null);
    setTooltipImage(null);
  };

  // Refs
  const mosaicImageRef = useRef<HTMLImageElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getHeatmapData();
        console.log('[@component:Heatmap] Loaded data:', data);
        console.log('[@component:Heatmap] hosts_devices:', data.hosts_devices);
        console.log('[@component:Heatmap] timeline_timestamps:', data.timeline_timestamps);
        console.log(
          '[@component:Heatmap] images_by_timestamp keys:',
          Object.keys(data.images_by_timestamp),
        );
        setHeatmapData(data);
        setTotalFrames(data.timeline_timestamps.length);
      } catch (err) {
        console.error('[@component:Heatmap] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load heatmap data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getHeatmapData]);

  // Status polling for generation
  useEffect(() => {
    if (
      currentGeneration &&
      (currentGeneration.status === 'pending' || currentGeneration.status === 'processing')
    ) {
      statusCheckInterval.current = setInterval(async () => {
        try {
          await checkGenerationStatus(currentGeneration.job_id);
        } catch (error) {
          console.error('[@component:Heatmap] Status check error:', error);
        }
      }, 2000); // Check every 2 seconds

      return () => {
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
      };
    }
  }, [currentGeneration, checkGenerationStatus]);

  // Timeline playback (following VideoCapture.tsx pattern)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && totalFrames > 0) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          if (next >= totalFrames) {
            setIsPlaying(false);
            return totalFrames - 1;
          }
          return next;
        });
      }, 1000); // 1 second per frame
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalFrames]);

  // Generate heatmap handler
  const handleGenerate = async () => {
    try {
      setError(null);
      await generateHeatmap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
    }
  };

  // Cancel generation handler
  const handleCancel = async () => {
    try {
      await cancelGeneration();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel generation');
    }
  };

  // Timeline controls
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const frame = newValue as number;
    setCurrentFrame(frame);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Get current mosaic URL
  const getCurrentMosaicUrl = (): string | null => {
    if (!currentGeneration?.mosaic_urls || currentFrame >= currentGeneration.mosaic_urls.length) {
      return null;
    }
    return currentGeneration.mosaic_urls[currentFrame];
  };

  // Get current timestamp
  const getCurrentTimestamp = (): string | null => {
    if (
      !heatmapData?.timeline_timestamps ||
      currentFrame >= heatmapData.timeline_timestamps.length
    ) {
      return null;
    }
    return heatmapData.timeline_timestamps[currentFrame];
  };

  // Get current images for analysis
  const getCurrentImages = (): HeatmapImage[] => {
    const timestamp = getCurrentTimestamp();
    if (!timestamp || !heatmapData?.images_by_timestamp) {
      return [];
    }
    return heatmapData.images_by_timestamp[timestamp] || [];
  };

  // Calculate dynamic font size based on number of devices
  const calculateFontSize = (): number => {
    const images = getCurrentImages();
    const count = images.length || 1;

    // Base size calculation - inversely proportional to square root of count
    // This gives a more gradual decrease as count increases
    const baseSize = Math.max(12, Math.min(24, 24 / Math.sqrt(count / 4)));

    return baseSize;
  };

  // Calculate position for host name labels based on index
  const calculateLabelPosition = (
    index: number,
    totalCount: number,
  ): { top: string; left: string } => {
    // Use same grid calculation logic as backend
    let cols, rows;

    if (totalCount <= 1) {
      cols = 1;
      rows = 1;
    } else if (totalCount === 2) {
      cols = 2;
      rows = 1; // 2 devices side by side
    } else if (totalCount === 3) {
      cols = 2;
      rows = 2; // 3 devices in 2x2 grid
    } else if (totalCount === 4) {
      cols = 2;
      rows = 2; // Perfect 2x2 grid
    } else if (totalCount <= 6) {
      cols = 3;
      rows = 2; // 3x2 grid
    } else if (totalCount <= 9) {
      cols = 3;
      rows = 3;
    } else {
      cols = Math.ceil(Math.sqrt(totalCount));
      rows = Math.ceil(totalCount / cols);
    }

    const row = Math.floor(index / cols);
    const col = index % cols;

    // Calculate percentage positions
    const top = `${(row * 100) / rows}%`;
    const left = `${(col * 100) / cols}%`;

    return { top, left };
  };

  // Check if a specific frame/timestamp has any incidents
  const frameHasIncidents = (frameIndex: number): boolean => {
    if (!heatmapData || !heatmapData.timeline_timestamps) return false;

    const timestamp = heatmapData.timeline_timestamps[frameIndex];
    if (!timestamp) return false;

    const images = heatmapData.images_by_timestamp[timestamp] || [];

    // Check if any device in this timestamp has incidents or missing video/audio
    return images.some((image) => {
      const analysisJson = image.analysis_json || {};
      const hasVideo = analysisJson.has_video || false;
      const hasAudio = analysisJson.has_audio || false;
      return (
        !hasVideo ||
        !hasAudio ||
        analysisJson.blackscreen ||
        analysisJson.freeze ||
        analysisJson.audio_loss
      );
    });
  };

  // Get timeline tick colors
  const getTimelineTicks = () => {
    if (!heatmapData || !heatmapData.timeline_timestamps) return [];

    // Create marks for each timestamp, with special highlighting for those with incidents
    return heatmapData.timeline_timestamps.map((_, index) => {
      const hasIncident = frameHasIncidents(index);
      return {
        value: index,
        hasIncident,
        // Only create visible marks for frames with incidents
        visible: hasIncident,
      };
    });
  };

  const analyzeCurrentFrame = () => {
    const images = getCurrentImages();
    const timestamp = getCurrentTimestamp();

    if (!images.length || !timestamp || !heatmapData) {
      return { summary: 'No data available', details: [] };
    }

    // Get incidents for current timestamp
    const currentIncidents = heatmapData.incidents.filter((incident) => {
      const incidentTime = new Date(incident.start_time).getTime();
      const frameTime = new Date(timestamp).getTime();
      const timeDiff = Math.abs(frameTime - incidentTime);
      return timeDiff < 30000; // Within 30 seconds
    });

    // Current time for duration calculation
    const currentTime = new Date(timestamp).getTime();

    // Analyze each device
    const deviceAnalysis = images.map((image) => {
      const hasIncident = currentIncidents.some(
        (incident) =>
          incident.host_name === image.host_name && incident.device_id === image.device_id,
      );

      // Safely access analysis_json with fallback to empty object
      const analysisJson = image.analysis_json || {};

      // Fix logical inconsistencies in the data
      // Distinguish between "no video signal" vs "blackscreen detected in video"
      const hasVideo = analysisJson.has_video || false;
      const hasAudio = analysisJson.has_audio || false;

      // Blackscreen should only be true if we have video but it's detected as black
      // If has_video is false, that means no video signal, not blackscreen
      const blackscreen = hasVideo && (analysisJson.blackscreen || false);
      const freeze = hasVideo && (analysisJson.freeze || false);

      // Audio loss should only be true if we expect audio but it's lost
      // If has_audio is false, that means no audio signal, not audio loss
      const audioLoss = hasAudio && (analysisJson.audio_loss || false);

      const analysisIncidents = [
        blackscreen ? 'blackscreen' : null,
        freeze ? 'freeze' : null,
        audioLoss ? 'audio_loss' : null,
      ].filter((incident): incident is string => incident !== null);

      const dbIncidents = currentIncidents
        .filter(
          (incident) =>
            incident.host_name === image.host_name && incident.device_id === image.device_id,
        )
        .map((incident) => incident.incident_type);

      // Calculate incident duration if applicable
      let incidentDuration = '';
      if (hasIncident) {
        // Find the earliest incident for this device
        const deviceIncidents = heatmapData.incidents.filter(
          (incident) =>
            incident.host_name === image.host_name &&
            incident.device_id === image.device_id &&
            incident.status === 'active',
        );

        if (deviceIncidents.length > 0) {
          // Find earliest start time
          let earliestStartTime = Number.MAX_VALUE;
          deviceIncidents.forEach((incident) => {
            const startTime = new Date(incident.start_time).getTime();
            if (startTime < earliestStartTime) {
              earliestStartTime = startTime;
            }
          });

          // Calculate duration
          const durationMs = currentTime - earliestStartTime;
          const durationSec = Math.floor(durationMs / 1000);
          const minutes = Math.floor(durationSec / 60);
          const seconds = durationSec % 60;
          incidentDuration = `${minutes}m ${seconds}s`;
        }
      }

      const mismatch =
        analysisIncidents.length !== dbIncidents.length ||
        !analysisIncidents.every((type) => dbIncidents.includes(type));

      return {
        device: `${image.host_name}-${image.device_id}`,
        hasIncident,
        analysisIncidents,
        dbIncidents,
        incidentDuration,
        mismatch,
        audio: hasAudio,
        video: hasVideo,
        blackscreen,
        freeze,
        audioLoss,
      };
    });

    const totalDevices = deviceAnalysis.length;
    const devicesWithIncidents = deviceAnalysis.filter((d) => d.hasIncident).length;
    const mismatches = deviceAnalysis.filter((d) => d.mismatch).length;

    return {
      summary: `${totalDevices} devices | ${devicesWithIncidents} with incidents | ${mismatches} mismatches`,
      details: deviceAnalysis,
    };
  };

  const analysis = analyzeCurrentFrame();

  // Tooltip component
  const renderTooltip = () => {
    if (!tooltipOpen || !tooltipImage) return null;

    console.log(
      '[@Heatmap] Rendering tooltip for:',
      tooltipImage.host_name,
      'anchor:',
      tooltipAnchor,
    );

    // Get the corrected analysis values
    const analysisJson = tooltipImage.analysis_json || {};
    const hasVideo = analysisJson.has_video || false;
    const hasAudio = analysisJson.has_audio || false;

    // Use same corrected logic as main analysis
    const blackscreen = hasVideo && (analysisJson.blackscreen || false);
    const freeze = hasVideo && (analysisJson.freeze || false);
    const audioLoss = hasAudio && (analysisJson.audio_loss || false);

    // Convert to MonitoringAnalysis format
    const analysis = {
      blackscreen,
      freeze,
      subtitles: false,
      errors: blackscreen || freeze || audioLoss,
      text: '',
      audio: {
        has_audio: hasAudio,
        volume_percentage: 0, // Not available in our data
      },
    };

    return (
      <Popper
        open={tooltipOpen}
        anchorEl={tooltipAnchor}
        placement="top-start"
        transition
        style={{ zIndex: 1500 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 8], // 8px offset from the cell
            },
          },
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: 8,
            },
          },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={300}>
            <Box>
              <Box
                sx={{
                  p: 1,
                  bgcolor: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: 1,
                  maxWidth: 300,
                }}
              >
                <MonitoringOverlay
                  overrideAnalysis={analysis}
                  sx={{ position: 'relative', top: 'auto', left: 'auto', p: 0 }}
                />
              </Box>
            </Box>
          </Fade>
        )}
      </Popper>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" gutterBottom>
          Heatmap
        </Typography>
      </Box>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </MuiAlert>
      )}

      {/* Header Stats & Controls */}
      <Box sx={{ mb: 0.5 }}>
        <Card>
          <CardContent sx={{ py: 0.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <HeatmapIcon color="primary" />
                <Typography variant="h6">Heatmap Status</Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Devices</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {heatmapData?.hosts_devices.length || 0}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Timestamps</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {heatmapData?.timeline_timestamps.length || 0}
                  </Typography>
                  {heatmapData?.timeline_timestamps.length === 0 && (
                    <Chip size="small" label="No Data" color="warning" />
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Status</Typography>
                  <Chip
                    label={currentGeneration?.status || 'Ready'}
                    color={currentGeneration?.status === 'completed' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                {/* Generate/Cancel Button */}
                {!isGenerating ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleGenerate}
                    disabled={loading}
                  >
                    Generate Heatmap
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    color="error"
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Generation Progress */}
      {isGenerating && currentGeneration && (
        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ py: 1 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <CircularProgress size={24} />
              <Box flex={1}>
                <Typography variant="body2">
                  Generating mosaic images... {currentGeneration.progress || 0}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={currentGeneration.progress || 0}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Mosaic Player */}
      {currentGeneration?.status === 'completed' && currentGeneration.mosaic_urls && (
        <Card sx={{ mb: 1 }}>
          <CardContent sx={{ p: 1 }}>
            <Box
              sx={{
                width: '90%',
                minHeight: '50vh',
                mx: 'auto',
                position: 'relative',
                backgroundColor: 'black',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {/* Mosaic Image with Host Name Overlay */}
              {getCurrentMosaicUrl() ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '50vh',
                    position: 'relative',
                  }}
                >
                  <img
                    ref={mosaicImageRef}
                    src={getCurrentMosaicUrl()!}
                    alt={`Heatmap Mosaic ${currentFrame + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                    onLoad={() => {
                      // Ensure browser caches the image by setting cache headers via JavaScript
                      if (mosaicImageRef.current) {
                        mosaicImageRef.current.style.imageRendering = 'auto';
                      }
                    }}
                  />

                  {/* Host Name Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none',
                    }}
                  >
                    {getCurrentImages().map((image, index, array) => {
                      const position = calculateLabelPosition(index, array.length);
                      const fontSize = calculateFontSize();

                      // Calculate cell dimensions using same logic as backend
                      const numDevices = array.length;
                      let cols, rows;

                      // Match the backend grid calculation logic
                      if (numDevices <= 1) {
                        cols = 1;
                        rows = 1;
                      } else if (numDevices === 2) {
                        cols = 2;
                        rows = 1; // 2 devices side by side
                      } else if (numDevices === 3) {
                        cols = 2;
                        rows = 2; // 3 devices in 2x2 grid
                      } else if (numDevices === 4) {
                        cols = 2;
                        rows = 2; // Perfect 2x2 grid
                      } else if (numDevices <= 6) {
                        cols = 3;
                        rows = 2; // 3x2 grid
                      } else if (numDevices <= 9) {
                        cols = 3;
                        rows = 3;
                      } else {
                        cols = Math.ceil(Math.sqrt(numDevices));
                        rows = Math.ceil(numDevices / cols);
                      }

                      const cellWidth = 100 / cols;
                      const cellHeight = 100 / rows;

                      return (
                        <React.Fragment key={`${image.host_name}-${image.device_id}-${index}`}>
                          {/* Cell hover area */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: position.top,
                              left: position.left,
                              width: `${cellWidth}%`,
                              height: `${cellHeight}%`,
                              pointerEvents: 'auto', // Enable mouse events
                              cursor: 'pointer',
                              '&:hover': {
                                outline: '2px solid rgba(255, 255, 255, 0.5)',
                              },
                            }}
                            onMouseEnter={(e) => handleMouseEnter(e, image)}
                            onMouseLeave={handleMouseLeave}
                          />

                          {/* Host name label */}
                          <Typography
                            sx={{
                              position: 'absolute',
                              top: position.top,
                              left: position.left,
                              transform: 'translate(10px, 10px)', // Offset from corner
                              color: 'white',
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: `${fontSize}px`,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              zIndex: 10,
                              pointerEvents: 'none', // Disable mouse events
                            }}
                          >
                            {image.host_name}-{image.device_id}
                          </Typography>
                        </React.Fragment>
                      );
                    })}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '50vh',
                  }}
                >
                  <Typography color="white">No mosaic available</Typography>
                </Box>
              )}
            </Box>

            {/* Timeline Controls - Moved outside the mosaic box */}
            {totalFrames > 0 && (
              <Box
                sx={{
                  mt: 2,
                  px: 2,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  borderRadius: 1,
                }}
              >
                {/* Play/Pause button */}
                <IconButton
                  size="small"
                  onClick={handlePlayPause}
                  sx={{
                    mr: 2,
                    color: '#000000',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.4)' },
                  }}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>

                {/* Timeline scrubber */}
                <Box sx={{ flexGrow: 1, mx: 2 }}>
                  <Slider
                    value={currentFrame}
                    min={0}
                    max={Math.max(0, totalFrames - 1)}
                    onChange={handleSliderChange}
                    sx={{
                      color: frameHasIncidents(currentFrame) ? '#FF0000' : '#00AA00', // Red if any incident
                      '& .MuiSlider-thumb': {
                        width: 16,
                        height: 16,
                        backgroundColor: frameHasIncidents(currentFrame) ? '#FF0000' : '#00AA00',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: frameHasIncidents(currentFrame) ? '#FF0000' : '#00AA00', // Red track if incident
                      },
                      '& .MuiSlider-rail': {
                        backgroundColor: '#CCCCCC', // Light gray for the rail
                      },
                      // Add tick marks for each timestamp with incidents
                      '& .MuiSlider-mark': {
                        backgroundColor: '#FF0000', // Red for incidents
                        height: 8,
                        width: 2,
                        marginTop: -3,
                      },
                      '& .MuiSlider-markActive': {
                        backgroundColor: '#FF0000', // Red for active incidents
                      },
                    }}
                    marks={getTimelineTicks()
                      .filter((tick) => tick.visible)
                      .map((tick) => ({
                        value: tick.value,
                        label: '',
                      }))}
                  />
                </Box>

                {/* Frame counter */}
                <Typography
                  variant="caption"
                  sx={{
                    ml: 2,
                    minWidth: '60px',
                    textAlign: 'right',
                    color: frameHasIncidents(currentFrame) ? '#FF0000' : 'inherit',
                    fontWeight: frameHasIncidents(currentFrame) ? 'bold' : 'normal',
                  }}
                >
                  {currentFrame + 1} / {totalFrames}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Box */}
      <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
        <CardContent>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            onClick={() => setAnalysisExpanded(!analysisExpanded)}
            sx={{ cursor: 'pointer' }}
          >
            <Typography variant="h6">AI Analysis</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="textSecondary">
                {analysis.summary}
              </Typography>
              {analysisExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>
          </Box>

          <Collapse in={analysisExpanded}>
            <Box mt={2}>
              {analysis.details.length > 0 ? (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    backgroundColor: 'transparent',
                    '& .MuiPaper-root': {
                      backgroundColor: 'transparent !important',
                      boxShadow: 'none',
                    },
                  }}
                >
                  <Table
                    size="small"
                    sx={{
                      backgroundColor: 'transparent',
                      '& .MuiTableRow-root': {
                        backgroundColor: 'transparent !important',
                      },
                      '& .MuiTableRow-root:hover': {
                        backgroundColor: 'transparent !important',
                      },
                      '& .MuiTableCell-root': {
                        backgroundColor: 'transparent !important',
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'transparent !important' }}>
                        <TableCell>
                          <strong>Device</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Audio</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Video</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Blackscreen</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Freeze</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Audio Loss</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Duration</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Mismatch</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.details.map((device, index) => (
                        <TableRow
                          key={index}
                          sx={{
                            backgroundColor: 'transparent !important',
                            '&:hover': {
                              backgroundColor: 'transparent !important',
                            },
                          }}
                        >
                          <TableCell>{device.device}</TableCell>
                          <TableCell>
                            <Chip
                              label={device.audio ? 'Yes' : 'No'}
                              color={device.audio ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={device.video ? 'Yes' : 'No'}
                              color={device.video ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={device.blackscreen ? 'Yes' : 'No'}
                              color={device.blackscreen ? 'error' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={device.freeze ? 'Yes' : 'No'}
                              color={device.freeze ? 'error' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={device.audioLoss ? 'Yes' : 'No'}
                              color={device.audioLoss ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {device.incidentDuration ? (
                              <Chip label={device.incidentDuration} color="error" size="small" />
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                N/A
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={device.mismatch ? 'Yes' : 'No'}
                              color={device.mismatch ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No analysis data available for current frame
                </Typography>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
      {renderTooltip()}
    </Box>
  );
};

export default Heatmap;
