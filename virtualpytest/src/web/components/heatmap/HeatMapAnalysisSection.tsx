import { ExpandMore, ExpandLess } from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
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
import React from 'react';

import { HeatmapImage } from '../../hooks/pages/useHeatmap';

interface HeatMapAnalysisSectionProps {
  images: HeatmapImage[];
  analysisExpanded: boolean;
  onToggleExpanded: () => void;
}

export const HeatMapAnalysisSection: React.FC<HeatMapAnalysisSectionProps> = ({
  images,
  analysisExpanded,
  onToggleExpanded,
}) => {
  // Calculate summary from images - only count devices with actual analysis data
  const devicesWithAnalysis = images.filter((image) => image.analysis_json !== null);
  const totalDevices = devicesWithAnalysis.length;
  const devicesWithIncidents = devicesWithAnalysis.filter((image) => {
    const analysisJson = image.analysis_json || {};
    return analysisJson.blackscreen || analysisJson.freeze || !analysisJson.audio;
  }).length;

  const summary =
    totalDevices > 0
      ? `${totalDevices} devices | ${devicesWithIncidents} with incidents`
      : 'No analysis data available';

  // Don't show the analysis section at all if no devices have analysis data
  if (totalDevices === 0) {
    return null;
  }

  return (
    <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          onClick={onToggleExpanded}
          sx={{ cursor: 'pointer' }}
        >
          <Typography variant="h6">Data Analysis</Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="textSecondary">
              {summary}
            </Typography>
            {analysisExpanded ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </Box>

        <Collapse in={analysisExpanded}>
          <Box mt={2}>
            {images.length > 0 ? (
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
                        <strong>Volume %</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Mean dB</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Blackscreen</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Freeze</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {images
                      .filter((image) => image.analysis_json !== null) // Only show devices with actual analysis data
                      .map((image, index) => {
                        const analysisJson = image.analysis_json || {};
                        const hasVideo = !analysisJson.blackscreen && !analysisJson.freeze;
                        const hasAudio = analysisJson.audio;

                        return (
                          <TableRow
                            key={index}
                            sx={{
                              backgroundColor: 'transparent !important',
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                            }}
                          >
                            <TableCell>
                              {image.host_name}-{image.device_id}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={hasAudio ? 'Yes' : 'No'}
                                color={hasAudio ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={hasVideo ? 'Yes' : 'No'}
                                color={hasVideo ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {analysisJson.volume_percentage || 0}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {analysisJson.mean_volume_db || -100} dB
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                color={analysisJson.blackscreen ? 'error' : 'success'}
                              >
                                {analysisJson.blackscreen
                                  ? `Yes (${analysisJson.blackscreen_percentage || 0}%)`
                                  : 'No'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                color={analysisJson.freeze ? 'error' : 'success'}
                              >
                                {analysisJson.freeze
                                  ? `Yes (${(analysisJson.freeze_diffs || []).join(', ')})`
                                  : 'No'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
  );
};
