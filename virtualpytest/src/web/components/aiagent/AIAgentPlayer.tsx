import { SmartToy, Send, Stop, Clear } from '@mui/icons-material';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import React from 'react';

import { useAIAgent } from '../../hooks/aiagent/useAIAgent';
import { Host, Device } from '../../types/common/Host_Types';

interface AIAgentPlayerProps {
  host: Host;
  device: Device;
}

export const AIAgentPlayer: React.FC<AIAgentPlayerProps> = ({ host, device }) => {
  const {
    isExecuting,
    currentStep,
    executionLog,
    taskInput,
    errorMessage,
    suggestedAction,
    suggestedVerification,
    setTaskInput,
    executeTask,
    stopExecution,
    clearLog,
  } = useAIAgent({ host, device });

  const getLogEntryIcon = (type: string) => {
    switch (type) {
      case 'action':
        return '🔧';
      case 'verification':
        return '✅';
      case 'completed':
        return '🎯';
      case 'error':
        return '❌';
      case 'stopped':
        return '⏹️';
      default:
        return '📝';
    }
  };

  const getLogEntryColor = (success: boolean, type: string) => {
    if (type === 'error') return 'error';
    if (type === 'stopped') return 'warning';
    return success ? 'success' : 'error';
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{ color: '#ffffff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <SmartToy />
        AI Agent
        <Chip label={device?.device_model || 'Unknown'} size="small" />
      </Typography>

      {/* Task Input Section */}
      <Card sx={{ mb: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              placeholder="Enter task (e.g., 'click Home tab and verify home displayed')"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  executeTask();
                }
              }}
              disabled={isExecuting}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#666',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2196f3',
                  },
                },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={executeTask}
              disabled={!taskInput.trim() || isExecuting}
              startIcon={isExecuting ? <CircularProgress size={16} /> : <Send />}
              sx={{
                backgroundColor: '#2196f3',
                '&:hover': {
                  backgroundColor: '#1976d2',
                },
              }}
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
            {isExecuting && (
              <Button
                variant="outlined"
                size="small"
                onClick={stopExecution}
                startIcon={<Stop />}
                sx={{
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': {
                    borderColor: '#d32f2f',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  },
                }}
              >
                Stop
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Current Step */}
      {currentStep && (
        <Alert severity={errorMessage ? 'error' : isExecuting ? 'info' : 'success'} sx={{ mb: 2 }}>
          {currentStep}
        </Alert>
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* AI Suggestions */}
      {(suggestedAction || suggestedVerification) && (
        <Card sx={{ mb: 2, backgroundColor: 'rgba(0,150,255,0.1)' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1 }}>
              AI Suggestions:
            </Typography>
            {suggestedAction && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={`Action: ${suggestedAction.command}`}
                  size="small"
                  color="primary"
                  sx={{ mr: 1 }}
                />
                <Typography variant="caption" sx={{ color: '#cccccc' }}>
                  {suggestedAction.description}
                </Typography>
              </Box>
            )}
            {suggestedVerification && (
              <Box>
                <Chip
                  label={`Verify: ${suggestedVerification.verification_type}`}
                  size="small"
                  color="secondary"
                  sx={{ mr: 1 }}
                />
                <Typography variant="caption" sx={{ color: '#cccccc' }}>
                  {suggestedVerification.description}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Execution Log */}
      <Card sx={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <CardContent sx={{ p: 1, height: '100%', overflow: 'hidden' }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle2" sx={{ color: '#ffffff' }}>
              Execution Log
            </Typography>
            {executionLog.length > 0 && (
              <Button
                size="small"
                onClick={clearLog}
                startIcon={<Clear />}
                sx={{ color: '#888', minWidth: 'auto' }}
              >
                Clear
              </Button>
            )}
          </Box>
          <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

          {executionLog.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#888',
              }}
            >
              <Typography variant="body2">No execution log yet</Typography>
            </Box>
          ) : (
            <Box sx={{ height: '100%', overflowY: 'auto' }}>
              <List dense>
                {executionLog.map((entry, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Typography sx={{ fontSize: '1.2rem' }}>
                        {getLogEntryIcon(entry.type)}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={entry.type}
                            size="small"
                            color={getLogEntryColor(entry.success, entry.type)}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            {entry.description}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
