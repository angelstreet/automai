import React from 'react';
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
import { ExpandMore, ExpandLess } from '@mui/icons-material';

interface DeviceAnalysis {
  device: string;
  hasIncident: boolean;
  incidentDuration: string;
  audio: boolean;
  video: boolean;
  blackscreen: boolean;
  freeze: boolean;
}

interface Analysis {
  summary: string;
  details: DeviceAnalysis[];
}

interface HeatMapAnalysisSectionProps {
  analysis: Analysis;
  analysisExpanded: boolean;
  onToggleExpanded: () => void;
}

export const HeatMapAnalysisSection: React.FC<HeatMapAnalysisSectionProps> = ({
  analysis,
  analysisExpanded,
  onToggleExpanded,
}) => {
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
                        <strong>Duration</strong>
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
                          <Typography
                            variant="caption"
                            color={device.blackscreen ? 'error' : 'success'}
                          >
                            {device.blackscreen ? 'Yes' : 'No'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color={device.freeze ? 'error' : 'success'}>
                            {device.freeze ? 'Yes' : 'No'}
                          </Typography>
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
  );
};
