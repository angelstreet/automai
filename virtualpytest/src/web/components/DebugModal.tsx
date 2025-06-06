import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

interface DebugModalProps {
  open: boolean;
  onClose: () => void;
}

const API_BASE_URL = 'http://localhost:5009/api';

const DebugModal: React.FC<DebugModalProps> = ({ open, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [maxLines, setMaxLines] = useState(1000);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const logLevels = ['all', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

  useEffect(() => {
    if (open) {
      fetchLogs();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (autoRefresh && open) {
      intervalRef.current = setInterval(fetchLogs, 2000); // Refresh every 2 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, open]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/system/logs?lines=${maxLines}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        throw new Error(data.error || 'Failed to fetch logs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/logs/clear`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setLogs([]);
      } else {
        throw new Error('Failed to clear logs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to clear logs');
    }
  };

  const handleDownloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'DEBUG':
        return '#9e9e9e';
      case 'INFO':
        return '#2196f3';
      case 'WARNING':
        return '#ff9800';
      case 'ERROR':
        return '#f44336';
      case 'CRITICAL':
        return '#d32f2f';
      default:
        return '#757575';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.level.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLevel && matchesSearch;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Server Debug Logs</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Controls */}
        <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
          
          <Button
            variant={autoRefresh ? "contained" : "outlined"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="small"
            color={autoRefresh ? "primary" : "inherit"}
          >
            Auto Refresh
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClearLogs}
            size="small"
            color="warning"
          >
            Clear Logs
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadLogs}
            size="small"
            disabled={filteredLogs.length === 0}
          >
            Download
          </Button>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Level</InputLabel>
            <Select
              value={filterLevel}
              label="Level"
              onChange={(e) => setFilterLevel(e.target.value)}
            >
              {logLevels.map(level => (
                <MenuItem key={level} value={level}>
                  {level === 'all' ? 'All Levels' : level}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            size="small"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
            InputProps={{
              startAdornment: <FilterIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          
          <TextField
            size="small"
            type="number"
            label="Max Lines"
            value={maxLines}
            onChange={(e) => setMaxLines(parseInt(e.target.value) || 1000)}
            sx={{ width: 100 }}
            inputProps={{ min: 100, max: 10000, step: 100 }}
          />
        </Box>

        {/* Stats */}
        <Box display="flex" gap={1} mb={2}>
          <Chip 
            label={`Total: ${logs.length}`} 
            size="small" 
            variant="outlined" 
          />
          <Chip 
            label={`Filtered: ${filteredLogs.length}`} 
            size="small" 
            variant="outlined" 
          />
          {autoRefresh && (
            <Chip 
              label="Auto-refreshing" 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading Indicator */}
        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Logs Display */}
        <Paper 
          variant="outlined" 
          sx={{ 
            height: '400px', 
            overflow: 'auto', 
            p: 1,
            backgroundColor: '#1e1e1e',
            fontFamily: 'monospace'
          }}
        >
          {filteredLogs.length === 0 ? (
            <Box 
              display="flex" 
              alignItems="center" 
              justifyContent="center" 
              height="100%"
              color="text.secondary"
            >
              <Typography variant="body2">
                {logs.length === 0 ? 'No logs available' : 'No logs match current filters'}
              </Typography>
            </Box>
          ) : (
            <Box>
              {filteredLogs.map((log, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    mb: 0.5,
                    p: 0.5,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)'
                    }
                  }}
                >
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      lineHeight: 1.4,
                      wordBreak: 'break-word'
                    }}
                  >
                    <span style={{ color: '#888888' }}>
                      [{log.timestamp}]
                    </span>
                    {' '}
                    <span 
                      style={{ 
                        color: getLogLevelColor(log.level),
                        fontWeight: 'bold'
                      }}
                    >
                      {log.level}:
                    </span>
                    {' '}
                    <span style={{ color: '#ffffff' }}>
                      {log.message}
                    </span>
                  </Typography>
                </Box>
              ))}
              <div ref={logsEndRef} />
            </Box>
          )}
        </Paper>
      </DialogContent>
      
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
          Last updated: {logs.length > 0 ? new Date().toLocaleTimeString() : 'Never'}
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DebugModal; 