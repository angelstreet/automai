import {
  GridView as HeatmapIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  PlayArrow,
  Pause,
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
  Popper,
  Fade,
} from '@mui/material';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { HeatMapAnalysisSection } from '../components/heatmap/HeatMapAnalysisSection';
import { HeatMapFreezeModal } from '../components/heatmap/HeatMapFreezeModal';
import { MonitoringOverlay } from '../components/monitoring/MonitoringOverlay';
import { useHeatmap, HeatmapImage, HeatmapIncident } from '../hooks/pages/useHeatmap';

const Heatmap: React.FC = () => {
  const {
    generateHeatmap,
    checkGenerationStatus,
    cancelGeneration,
    isGenerating,
    currentGeneration,
  } = useHeatmap();

  // No heatmapData state - derive from metadata
  const [loading] = useState(false); // No loading on mount, only when user generates
  const [error, setError] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  // Timeline player state (following VideoCapture.tsx pattern)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  // Data Analysis state
  const [analysisExpanded, setAnalysisExpanded] = useState(true); // Expanded by default

  // Tooltip state
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipAnchor, setTooltipAnchor] = useState<HTMLElement | null>(null);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  // Timeline tick tooltip state
  const [tickTooltipOpen, setTickTooltipOpen] = useState(false);
  const [tickTooltipAnchor, setTickTooltipAnchor] = useState<HTMLElement | null>(null);
  const [tickTooltipTimestamp, setTickTooltipTimestamp] = useState<string | null>(null);

  // Freeze modal state
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeModalImage, setFreezeModalImage] = useState<HeatmapImage | null>(null);

  // Process image URLs with HTTP to HTTPS proxy logic (same pattern as other components)
  const processImageUrl = (url: string): string => {
    if (!url) return '';

    // Handle data URLs (base64) - return as is
    if (url.startsWith('data:')) {
      return url;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (url.startsWith('http:')) {
      const encodedUrl = encodeURIComponent(url);
      return `/server/av/proxy-image?url=${encodedUrl}`;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (url.startsWith('https:')) {
      return url;
    }

    // For relative paths or other formats, use directly
    return url;
  };

  // Tooltip handlers
  const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>, index: number) => {
    const target = event.currentTarget; // Capture immediately

    // Show tooltip instantly - no delay
    if (target) {
      // Position tooltip at the TOP-RIGHT corner of the cell
      const rect = target.getBoundingClientRect();
      const tooltipAnchor = document.createElement('div');
      tooltipAnchor.style.position = 'absolute';
      tooltipAnchor.style.left = `${rect.right - 10}px`; // 10px from right edge
      tooltipAnchor.style.top = `${rect.top + 10}px`; // 10px from top edge
      tooltipAnchor.style.width = '1px';
      tooltipAnchor.style.height = '1px';
      tooltipAnchor.style.zIndex = '1000';
      document.body.appendChild(tooltipAnchor);

      setTooltipAnchor(tooltipAnchor);
      setTooltipIndex(index);
      setTooltipOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setTooltipOpen(false);
    if (tooltipAnchor && document.body.contains(tooltipAnchor)) {
      document.body.removeChild(tooltipAnchor);
    }
    setTooltipAnchor(null);
  };

  // Timeline tick tooltip handlers
  const handleTickMouseEnter = (event: React.MouseEvent<HTMLDivElement>, timestamp: string) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();

    const tooltipAnchor = document.createElement('div');
    tooltipAnchor.style.position = 'absolute';
    tooltipAnchor.style.left = `${rect.left}px`;
    tooltipAnchor.style.top = `${rect.top - 10}px`; // Position above the tick
    tooltipAnchor.style.width = '1px';
    tooltipAnchor.style.height = '1px';
    tooltipAnchor.style.zIndex = '1000';
    document.body.appendChild(tooltipAnchor);

    setTickTooltipAnchor(tooltipAnchor);
    setTickTooltipTimestamp(timestamp);
    setTickTooltipOpen(true);
  };

  const handleTickMouseLeave = () => {
    setTickTooltipOpen(false);
    if (tickTooltipAnchor && document.body.contains(tickTooltipAnchor)) {
      document.body.removeChild(tickTooltipAnchor);
    }
    setTickTooltipAnchor(null);
    setTickTooltipTimestamp(null);
  };

  // Cell click handler for freeze analysis
  const handleCellClick = async (image: HeatmapImage) => {
    // Only open modal if there's a freeze detected
    if (!image.analysis_json?.freeze) {
      return;
    }

    // If we already have freeze_details, use them
    if (image.analysis_json?.freeze_details) {
      setFreezeModalImage(image);
      setFreezeModalOpen(true);
      return;
    }

    // Fetch freeze_details from the JSON file directly
    try {
      // Construct JSON URL from image URL (same pattern as monitoring system)
      const jsonUrl = image.image_url.replace('.jpg', '.json');
      console.log('[@Heatmap] Fetching freeze details from:', jsonUrl);

      const response = await fetch(jsonUrl);
      if (response.ok) {
        const analysisData = await response.json();
        const analysis = analysisData.analysis || {};

        // Check if we have freeze_details in the analysis
        if (analysis.freeze_details) {
          // Create enhanced image object with freeze_details
          const enhancedImage: HeatmapImage = {
            ...image,
            analysis_json: {
              ...image.analysis_json,
              freeze_details: analysis.freeze_details,
            },
          };

          setFreezeModalImage(enhancedImage);
          setFreezeModalOpen(true);
        } else {
          console.log('[@Heatmap] No freeze_details found in JSON analysis');
        }
      } else {
        console.log('[@Heatmap] Failed to fetch JSON analysis:', response.status);
      }
    } catch (error) {
      console.error('[@Heatmap] Error fetching freeze details:', error);
    }
  };

  // Helper function to construct frame URLs using proper URL building
  const constructFrameUrl = (filename: string, originalImageUrl: string): string => {
    // Extract the base URL from the original image URL
    // Example: "http://host/path/capture_20250723155519.jpg" -> "http://host/path/"
    const lastSlashIndex = originalImageUrl.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      console.error('[@Heatmap] Invalid image URL format:', originalImageUrl);
      return filename;
    }

    const baseUrl = originalImageUrl.substring(0, lastSlashIndex + 1);
    const frameUrl = `${baseUrl}${filename}`;

    // Use processImageUrl to handle HTTP-to-HTTPS proxy logic
    // This ensures the same URL processing as other components
    return processImageUrl(frameUrl);
  };

  // Refs
  const mosaicImageRef = useRef<HTMLImageElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // State to track actual rendered image dimensions for precise label positioning
  const [actualImageBounds, setActualImageBounds] = useState<{
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  // Calculate actual rendered image bounds (accounts for objectFit: contain)
  const calculateActualImageBounds = useCallback((): {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  } | null => {
    const img = mosaicImageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const containerRect = img.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Calculate the scale factor for objectFit: contain
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate actual rendered dimensions
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;

    // Calculate offset (centering)
    const offsetX = (containerWidth - renderedWidth) / 2;
    const offsetY = (containerHeight - renderedHeight) / 2;

    return {
      width: renderedWidth,
      height: renderedHeight,
      offsetX,
      offsetY,
    };
  }, []);

  // Load data from metadata (included in status response)
  useEffect(() => {
    if (currentGeneration?.status === 'completed') {
      if (currentGeneration.metadata) {
        console.log('[@component:Heatmap] Using metadata from status response');
        setTotalFrames(currentGeneration.metadata.length);
      } else {
        console.error('[@component:Heatmap] No metadata in completed status');
        setError('Analysis data missing - please regenerate');
        setTotalFrames(0);
      }
    }
  }, [currentGeneration]);

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

  // Handle window resize to recalculate image bounds
  useEffect(() => {
    const handleResize = () => {
      if (mosaicImageRef.current && actualImageBounds) {
        const bounds = calculateActualImageBounds();
        setActualImageBounds(bounds);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [actualImageBounds, calculateActualImageBounds]);

  // Generate heatmap handler
  const handleGenerate = async () => {
    try {
      setError(null);
      setGenerationStartTime(Date.now());
      await generateHeatmap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setGenerationStartTime(null);
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

  // Get current timestamp from metadata (renamed to suppress unused warning if needed)
  const _getCurrentTimestamp = (): string | null => {
    if (!currentGeneration?.metadata || currentFrame >= currentGeneration.metadata.length) {
      return null;
    }
    return currentGeneration.metadata[currentFrame].timestamp;
  };

  // Format timestamp for display (convert from YYYYMMDDHHMMSS to readable format)
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp || timestamp.length !== 14) {
      return timestamp; // Return as-is if invalid
    }

    // Extract parts: YYYY-MM-DD HH:MM:SS
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  // Get timeframe range from metadata
  const getTimeframeRange = (): { from: string; to: string } | null => {
    if (!currentGeneration?.metadata || currentGeneration.metadata.length === 0) {
      return null;
    }

    const timestamps = currentGeneration.metadata.map((m) => m.timestamp).sort();
    return {
      from: formatTimestamp(timestamps[0]),
      to: formatTimestamp(timestamps[timestamps.length - 1]),
    };
  };

  // Get current images from metadata
  const getCurrentImages = (): HeatmapImage[] => {
    if (!currentGeneration?.metadata || currentFrame >= currentGeneration.metadata.length) {
      return [];
    }
    const currentMetadata = currentGeneration.metadata[currentFrame];
    if (!currentMetadata?.analysis_data) {
      throw new Error('Missing analysis_data in metadata');
    }
    // Map analysis_data to HeatmapImage format
    return currentMetadata.analysis_data.map((data: any) => ({
      host_name: data.host_name,
      device_id: data.device_id,
      analysis_json: data.analysis_json,
      // Add other fields as needed, but minimal for analysis
    }));
  };

  // Check if analysis data has any incidents (matches backend logic)
  const hasIncidents = (analysisJson: any): boolean => {
    if (!analysisJson) return false;
    return (
      analysisJson.blackscreen === true ||
      analysisJson.freeze === true ||
      analysisJson.audio_loss === true
    );
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

  // Calculate position for host name labels based on index and actual image dimensions
  const calculateLabelPosition = (
    index: number,
    totalCount: number,
    actualImageBounds?: { width: number; height: number; offsetX: number; offsetY: number },
  ): { top: string; left: string; width: string; height: string } => {
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

    if (actualImageBounds) {
      // Calculate positions based on actual rendered image dimensions
      const cellWidth = actualImageBounds.width / cols;
      const cellHeight = actualImageBounds.height / rows;

      const cellLeft = actualImageBounds.offsetX + col * cellWidth;
      const cellTop = actualImageBounds.offsetY + row * cellHeight;

      return {
        top: `${cellTop}px`,
        left: `${cellLeft}px`,
        width: `${cellWidth}px`,
        height: `${cellHeight}px`,
      };
    } else {
      // Fallback to percentage positioning (original behavior)
      const cellWidthPercent = 100 / cols;
      const cellHeightPercent = 100 / rows;

      return {
        top: `${row * cellHeightPercent}%`,
        left: `${col * cellWidthPercent}%`,
        width: `${cellWidthPercent}%`,
        height: `${cellHeightPercent}%`,
      };
    }
  };

  // Check if a specific frame has any incidents from metadata
  const frameHasIncidents = (frameIndex: number): boolean => {
    if (!currentGeneration?.metadata || frameIndex >= currentGeneration.metadata.length)
      return false;

    const metadata = currentGeneration.metadata[frameIndex];
    return (
      metadata.analysis_data?.some((data: any) => {
        const analysisJson = data.analysis_json;
        return analysisJson?.blackscreen || analysisJson?.freeze || analysisJson?.audio_loss;
      }) || false
    );
  };

  // Get timeline ticks from metadata
  const getTimelineTicks = () => {
    if (!currentGeneration?.metadata) return [];

    return currentGeneration.metadata.map((m, index) => ({
      value: index,
      hasIncident: frameHasIncidents(index),
      timestamp: m.timestamp,
      visible: true,
    }));
  };

  const analyzeCurrentFrame = () => {
    if (!currentGeneration?.metadata || currentFrame >= currentGeneration.metadata.length) {
      return { summary: 'No data available', details: [] };
    }

    const currentMetadata = currentGeneration.metadata[currentFrame];
    const images = getCurrentImages();
    const timestamp = currentMetadata.timestamp;
    const currentIncidents = currentMetadata.incidents || [];
    const currentTime = new Date(timestamp).getTime();

    const deviceAnalysis = images.map((image) => {
      const analysisJson = image.analysis_json || {};
      const isIncomplete =
        !analysisJson ||
        typeof analysisJson.blackscreen === 'undefined' ||
        typeof analysisJson.freeze === 'undefined' ||
        typeof analysisJson.audio_loss === 'undefined';

      if (isIncomplete) {
        console.error(`Incomplete analysis_json for ${image.host_name}-${image.device_id}`);
        return {
          device: `${image.host_name}-${image.device_id}`,
          hasIncident: true, // Treat as incident for visibility
          incidentDuration: '',
          audio: false,
          video: false,
          blackscreen: false,
          freeze: false,
          analysis_error: 'Missing or incomplete analysis data',
        };
      }

      const blackscreen = analysisJson.blackscreen;
      const freeze = analysisJson.freeze;
      const audioLoss = analysisJson.audio_loss;

      const hasVideo = !blackscreen && !freeze;
      const hasAudio = !audioLoss;
      const hasIncident = blackscreen || freeze || audioLoss;

      const hasDbIncident = currentIncidents.some(
        (incident: HeatmapIncident) =>
          incident.host_name === image.host_name && incident.device_id === image.device_id,
      );

      let incidentDuration = '';
      if (hasDbIncident) {
        const deviceIncidents = currentIncidents.filter(
          (incident: HeatmapIncident) =>
            incident.host_name === image.host_name &&
            incident.device_id === image.device_id &&
            incident.status === 'active',
        );

        if (deviceIncidents.length > 0) {
          let earliestStartTime = Number.MAX_VALUE;
          deviceIncidents.forEach((incident: HeatmapIncident) => {
            const startTime = new Date(incident.start_time).getTime();
            if (startTime < earliestStartTime) earliestStartTime = startTime;
          });

          const durationMs = currentTime - earliestStartTime;
          const durationSec = Math.floor(durationMs / 1000);
          const minutes = Math.floor(durationSec / 60);
          const seconds = durationSec % 60;
          incidentDuration = `${minutes}m ${seconds}s`;
        }
      }

      return {
        device: `${image.host_name}-${image.device_id}`,
        hasIncident,
        incidentDuration,
        audio: hasAudio,
        video: hasVideo,
        blackscreen,
        freeze,
      };
    });

    const totalDevices = deviceAnalysis.length;
    const devicesWithIncidents = deviceAnalysis.filter((d) => d.hasIncident).length;

    return {
      summary: `${totalDevices} devices | ${devicesWithIncidents} with incidents`,
      details: deviceAnalysis,
    };
  };

  const analysis = analyzeCurrentFrame();

  // Freeze Analysis Modal - now using extracted component

  // Tooltip component
  const renderTooltip = () => {
    // Handle image tooltip
    if (tooltipOpen && tooltipIndex !== null) {
      const images = getCurrentImages();
      const tooltipImage = images[tooltipIndex];
      if (!tooltipImage) return null;

      // Get the corrected analysis values
      const analysisJson = tooltipImage.analysis_json || {};

      // Use same logic as main analysis - derive from actual issues
      const blackscreen = analysisJson.blackscreen || false;
      const freeze = analysisJson.freeze || false;
      const audioLoss = analysisJson.audio_loss || false;

      // Audio status: No if there's audio loss, Yes if no audio loss
      const hasAudio = !audioLoss;

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
          placement="bottom-start"
          transition
          style={{ zIndex: 1500 }}
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
    }

    // Handle timeline tick tooltip
    if (tickTooltipOpen && tickTooltipAnchor && tickTooltipTimestamp) {
      return (
        <Popper
          open={tickTooltipOpen}
          anchorEl={tickTooltipAnchor}
          placement="top"
          transition
          style={{ zIndex: 1500 }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={200}>
              <Box
                sx={{
                  p: 1,
                  bgcolor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  maxWidth: 200,
                  textAlign: 'center',
                }}
              >
                {formatTimestamp(tickTooltipTimestamp)}
              </Box>
            </Fade>
          )}
        </Popper>
      );
    }

    return null;
  };

  return (
    <Box>
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
                <Typography variant="h6">Heatmap</Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Devices</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {currentGeneration?.metadata?.[0]?.hosts_total || 0}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Timestamps</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {currentGeneration?.metadata?.length || 0}
                  </Typography>
                  {(!currentGeneration?.metadata || currentGeneration.metadata.length === 0) && (
                    <Chip size="small" label="No Data" color="warning" />
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Status</Typography>
                  <Chip
                    label={
                      currentGeneration?.status === 'completed' && generationStartTime
                        ? `Completed (${((Date.now() - generationStartTime) / 1000).toFixed(1)}s)`
                        : currentGeneration?.status === 'processing' && generationStartTime
                          ? `Processing (${((Date.now() - generationStartTime) / 1000).toFixed(1)}s)`
                          : currentGeneration?.status || 'Ready'
                    }
                    color={currentGeneration?.status === 'completed' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                {/* Timeframe Display */}
                {currentGeneration?.metadata && currentGeneration.metadata.length > 0 && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">Timeframe</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {(() => {
                        const range = getTimeframeRange();
                        return range ? `${range.from} - ${range.to}` : 'N/A';
                      })()}
                    </Typography>
                  </Box>
                )}

                {/* Generate/Cancel Button */}
                {!isGenerating ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={handleGenerate}
                    disabled={loading}
                  >
                    Generate
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
        <Card sx={{ mb: 0.5 }}>
          <CardContent sx={{ p: 0.5 }}>
            <Box
              sx={{
                width: '90%',
                height: '50vh', // Fixed height instead of min/max
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
                    position: 'relative',
                  }}
                >
                  <img
                    ref={mosaicImageRef}
                    src={getCurrentMosaicUrl()!}
                    alt={`Heatmap Mosaic ${currentFrame + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain', // Ensures full image is visible without cropping
                      objectPosition: 'center', // Center the image within the container
                    }}
                    onLoad={() => {
                      // Calculate and store actual image bounds for precise label positioning
                      const bounds = calculateActualImageBounds();
                      setActualImageBounds(bounds);

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
                      const position = calculateLabelPosition(
                        index,
                        array.length,
                        actualImageBounds || undefined,
                      );
                      const fontSize = calculateFontSize();

                      return (
                        <React.Fragment key={`${image.host_name}-${image.device_id}-${index}`}>
                          {/* Cell hover area */}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: position.top,
                              left: position.left,
                              width: position.width,
                              height: position.height,
                              pointerEvents: 'auto', // Enable mouse events
                              cursor: hasIncidents(image.analysis_json) ? 'pointer' : 'default',
                            }}
                            onMouseEnter={(e) => handleMouseEnter(e, index)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleCellClick(image)}
                          />

                          {/* Host name label */}
                          <Typography
                            sx={{
                              position: 'absolute',
                              top: position.top,
                              left: position.left,
                              width: position.width,
                              height: position.height,
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              padding: actualImageBounds ? '4px' : '8px', // Smaller padding for pixel positioning
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: `${fontSize}px`,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                              zIndex: 10,
                              pointerEvents: 'none', // Disable mouse events
                            }}
                          >
                            <Box
                              sx={{
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {image.host_name}-{image.device_id}
                            </Box>
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
                  mt: 0.5,
                  px: 2,
                  py: 0.5,
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
                <Box sx={{ flexGrow: 1, mx: 2, position: 'relative' }}>
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
                      '& .MuiSlider-mark': {
                        display: 'none', // Hide default marks, we'll draw custom ones
                      },
                    }}
                  />
                  {/* Custom colored timeline ticks */}
                  {getTimelineTicks().map((tick) => (
                    <Box
                      key={tick.value}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: `${(tick.value / Math.max(1, totalFrames - 1)) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 3,
                        height: 12,
                        backgroundColor: tick.hasIncident ? '#FF0000' : '#00FF00',
                        borderRadius: 1,
                        cursor: 'pointer', // Make it look interactive
                        pointerEvents: 'auto', // Enable mouse events
                      }}
                      onMouseEnter={(e) => handleTickMouseEnter(e, tick.timestamp)}
                      onMouseLeave={handleTickMouseLeave}
                    />
                  ))}
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

      {/* Data Analysis Section - now using extracted component */}
      <HeatMapAnalysisSection
        analysis={analysis}
        analysisExpanded={analysisExpanded}
        onToggleExpanded={() => setAnalysisExpanded(!analysisExpanded)}
      />
      {renderTooltip()}
      <HeatMapFreezeModal
        freezeModalOpen={freezeModalOpen}
        freezeModalImage={freezeModalImage}
        onClose={() => setFreezeModalOpen(false)}
        constructFrameUrl={constructFrameUrl}
      />
    </Box>
  );
};

export default Heatmap;
