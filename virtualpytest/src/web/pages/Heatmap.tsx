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
} from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';

import { useHeatmap, HeatmapData, HeatmapImage, HeatmapIncident } from '../hooks/pages/useHeatmap';

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
  const [analysisExpanded, setAnalysisExpanded] = useState(false);

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

  // Analyze current frame for AI summary
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

    // Analyze each device
    const deviceAnalysis = images.map((image) => {
      const hasIncident = currentIncidents.some(
        (incident) =>
          incident.host_name === image.host_name && incident.device_id === image.device_id,
      );

      const analysisIncidents = [
        image.analysis_json.blackscreen && 'blackscreen',
        image.analysis_json.freeze && 'freeze',
        image.analysis_json.audio_loss && 'audio_loss',
      ].filter(Boolean);

      const dbIncidents = currentIncidents
        .filter(
          (incident) =>
            incident.host_name === image.host_name && incident.device_id === image.device_id,
        )
        .map((incident) => incident.incident_type);

      const mismatch =
        analysisIncidents.length !== dbIncidents.length ||
        !analysisIncidents.every((type) => dbIncidents.includes(type));

      return {
        device: `${image.host_name}-${image.device_id}`,
        hasIncident,
        analysisIncidents,
        dbIncidents,
        mismatch,
        audio: image.analysis_json.has_audio,
        video: image.analysis_json.has_video,
        blackscreen: image.analysis_json.blackscreen,
        freeze: image.analysis_json.freeze,
        audioLoss: image.analysis_json.audio_loss,
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
              {/* Mosaic Image */}
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
                {getCurrentMosaicUrl() ? (
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
                  />
                ) : (
                  <Typography color="white">No mosaic available</Typography>
                )}
              </Box>

              {/* Timeline Controls (following VideoCapture.tsx) */}
              {totalFrames > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    p: 1,
                  }}
                >
                  {/* Play/Pause button */}
                  <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
                    <IconButton
                      size="medium"
                      onClick={handlePlayPause}
                      sx={{
                        color: '#ffffff',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
                      }}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                  </Box>

                  {/* Frame counter */}
                  <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {currentFrame + 1} / {totalFrames}
                    </Typography>
                  </Box>

                  {/* Timeline scrubber */}
                  <Box sx={{ position: 'absolute', bottom: 12, left: '80px', right: '80px' }}>
                    <Slider
                      value={currentFrame}
                      min={0}
                      max={Math.max(0, totalFrames - 1)}
                      onChange={handleSliderChange}
                      sx={{
                        color: '#ffffff',
                        '& .MuiSlider-thumb': {
                          width: 16,
                          height: 16,
                          backgroundColor: '#fff',
                        },
                        '& .MuiSlider-track': { backgroundColor: '#fff' },
                        '& .MuiSlider-rail': { backgroundColor: 'rgba(255,255,255,0.3)' },
                      }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Box */}
      <Card>
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
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
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
                          <strong>DB Incidents</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Mismatch</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analysis.details.map((device, index) => (
                        <TableRow key={index}>
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
                            {device.dbIncidents.length > 0 ? (
                              device.dbIncidents.map((incident, i) => (
                                <Chip key={i} label={incident} size="small" sx={{ mr: 0.5 }} />
                              ))
                            ) : (
                              <Typography variant="caption" color="textSecondary">
                                None
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
    </Box>
  );
};

export default Heatmap;
