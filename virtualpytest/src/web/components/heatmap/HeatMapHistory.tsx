import { OpenInNew } from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

interface HeatmapReport {
  id: string;
  timestamp: string;
  name: string;
  html_url: string;
  devices_count: number;
  incidents_count: number;
  processing_time?: number;
  created_at: string;
}

interface HeatMapHistoryProps {
  // We can add props later if needed to filter by team, etc.
}

export const HeatMapHistory: React.FC<HeatMapHistoryProps> = () => {
  const [reports, setReports] = useState<HeatmapReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch last 10 heatmap reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/server/heatmap/history?limit=10');

      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
      console.error('[@component:HeatMapHistory] Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    try {
      // Handle both ISO format and YYYYMMDDHHMMSS format
      let date: Date;

      if (timestamp.includes('T') || timestamp.includes('-')) {
        // ISO format
        date = new Date(timestamp);
      } else if (timestamp.length === 14) {
        // YYYYMMDDHHMMSS format
        const year = timestamp.substring(0, 4);
        const month = timestamp.substring(4, 6);
        const day = timestamp.substring(6, 8);
        const hour = timestamp.substring(8, 10);
        const minute = timestamp.substring(10, 12);
        const second = timestamp.substring(12, 14);
        date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      } else {
        return timestamp; // Return as-is if unknown format
      }

      return date.toLocaleString();
    } catch {
      return timestamp; // Return as-is if parsing fails
    }
  };

  // Generate report name from timestamp
  const generateReportName = (timestamp: string): string => {
    const formatted = formatTimestamp(timestamp);
    return `Heatmap Report - ${formatted}`;
  };

  if (loading) {
    return (
      <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
        <CardContent>
          <Typography variant="h6">Heatmap History</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Loading reports...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
        <CardContent>
          <Typography variant="h6">Heatmap History</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
        <CardContent>
          <Typography variant="h6">Heatmap History</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            No heatmap reports found. Generate your first heatmap to see history here.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Heatmap History
        </Typography>

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
                backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
              },
              '& .MuiTableCell-root': {
                backgroundColor: 'transparent !important',
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ backgroundColor: 'transparent !important' }}>
                <TableCell>
                  <strong>Timestamp</strong>
                </TableCell>
                <TableCell>
                  <strong>Report Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Devices</strong>
                </TableCell>
                <TableCell>
                  <strong>Incidents</strong>
                </TableCell>
                <TableCell>
                  <strong>Processing Time</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>Link</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow
                  key={report.id}
                  sx={{
                    backgroundColor: 'transparent !important',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="caption">{formatTimestamp(report.timestamp)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{generateReportName(report.timestamp)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={report.devices_count || 0}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={report.incidents_count || 0}
                      size="small"
                      color={report.incidents_count > 0 ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {report.processing_time ? `${report.processing_time.toFixed(1)}s` : 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      href={report.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      disabled={!report.html_url}
                    >
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
