import React from 'react';
import { Box, IconButton, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { SmartToy, Send, CheckCircle, Error } from '@mui/icons-material';

import { useMCPTask } from '../../hooks/mcp/useMCPTask';

export const MCPTaskInput: React.FC = () => {
  const {
    // Panel state
    isPanelVisible,
    togglePanel,

    // Task state
    currentTask,
    setCurrentTask,

    // Execution state
    isExecuting,
    lastResponse,

    // Actions
    executeTask,
    clearResponse,
  } = useMCPTask();

  // Handle Enter key press
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !isExecuting) {
      event.preventDefault();
      executeTask();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: 0,
        transform: 'translateY(-50%)',
        zIndex: 1000020, // Higher than timeline controls
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {/* MCP Robot Icon - always visible on left edge */}
      <IconButton
        size="medium"
        onClick={togglePanel}
        sx={{
          color: '#ffffff',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '0 8px 8px 0',
          borderLeft: 'none',
          ml: 0,
          mr: isPanelVisible ? 1 : 0,
          '&:hover': {
            backgroundColor: 'rgba(76, 175, 80, 0.3)',
            borderColor: 'rgba(76, 175, 80, 0.5)',
          },
        }}
        title="MCP Task Assistant"
      >
        <SmartToy />
      </IconButton>

      {/* Sliding Task Panel */}
      <Box
        sx={{
          width: isPanelVisible ? '360px' : '0px',
          height: isPanelVisible ? 'auto' : '0px',
          overflow: 'hidden',
          transition: 'width 300ms ease-in-out, height 300ms ease-in-out',
          backgroundColor: isPanelVisible ? 'rgba(0,0,0,0.85)' : 'transparent',
          borderRadius: isPanelVisible ? 1 : 0,
          border: isPanelVisible ? '1px solid rgba(76, 175, 80, 0.3)' : 'none',
        }}
      >
        {isPanelVisible && (
          <Box sx={{ p: 2, width: '360px' }}>
            {/* Header */}
            <Typography
              variant="subtitle2"
              sx={{
                color: '#4caf50',
                mb: 1,
                fontWeight: 'bold',
                fontSize: '0.9rem',
              }}
            >
              MCP Task Assistant
            </Typography>

            {/* Input field and send button */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
              <TextField
                size="small"
                placeholder="Enter task (e.g., 'Go to rec page')"
                value={currentTask}
                onChange={(e) => setCurrentTask(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isExecuting}
                inputProps={{
                  maxLength: 200,
                  autoComplete: 'off',
                  autoCorrect: 'off',
                  autoCapitalize: 'off',
                  spellCheck: false,
                }}
                sx={{
                  width: '240px',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    '& fieldset': {
                      borderColor: '#4caf50',
                    },
                    '&:hover fieldset': {
                      borderColor: '#66bb6a',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#4caf50',
                    },
                  },
                  '& .MuiInputBase-input': {
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    '&::placeholder': {
                      color: '#888',
                      opacity: 1,
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={executeTask}
                disabled={!currentTask.trim() || isExecuting}
                sx={{
                  backgroundColor: '#4caf50',
                  color: '#ffffff',
                  minWidth: '60px',
                  '&:hover': {
                    backgroundColor: '#388e3c',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#444',
                    color: '#888',
                  },
                }}
              >
                {isExecuting ? (
                  <CircularProgress size={16} sx={{ color: '#888' }} />
                ) : (
                  <Send sx={{ fontSize: 16 }} />
                )}
              </Button>
            </Box>

            {/* Response Display */}
            {lastResponse && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: 1,
                  border: `1px solid ${lastResponse.success ? '#4caf50' : '#f44336'}`,
                  maxWidth: '320px',
                }}
              >
                {/* Response Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {lastResponse.success ? (
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 16, mr: 1 }} />
                  ) : (
                    <Error sx={{ color: '#f44336', fontSize: 16, mr: 1 }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      color: lastResponse.success ? '#4caf50' : '#f44336',
                      fontWeight: 'bold',
                      fontSize: '0.75rem',
                    }}
                  >
                    {lastResponse.success ? 'SUCCESS' : 'ERROR'}
                  </Typography>
                </Box>

                {/* Response Content */}
                {lastResponse.success ? (
                  <>
                    {/* AI Analysis */}
                    {lastResponse.ai_analysis && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#e0e0e0',
                          fontSize: '0.75rem',
                          lineHeight: 1.3,
                          mb: 1,
                          fontStyle: 'italic',
                        }}
                      >
                        AI: {lastResponse.ai_analysis}
                      </Typography>
                    )}

                    {/* Tool Executed */}
                    {lastResponse.tool_executed && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4caf50',
                          fontSize: '0.75rem',
                          lineHeight: 1.3,
                          mb: 0.5,
                        }}
                      >
                        Tool: {lastResponse.tool_executed}
                      </Typography>
                    )}

                    {/* Result */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        lineHeight: 1.3,
                      }}
                    >
                      {lastResponse.result || 'Task completed'}
                    </Typography>
                  </>
                ) : (
                  /* Error Message */
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {lastResponse.error || 'Unknown error occurred'}
                  </Typography>
                )}

                {/* Clear button */}
                <Button
                  size="small"
                  onClick={clearResponse}
                  sx={{
                    mt: 1,
                    color: '#888',
                    fontSize: '0.7rem',
                    minHeight: 'auto',
                    padding: '2px 8px',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Clear
                </Button>
              </Box>
            )}

            {/* Quick Examples */}
            {!lastResponse && !isExecuting && (
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#888',
                    fontSize: '0.7rem',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Quick examples:
                </Typography>
                {['Go to rec page', 'Go to dashboard', 'Execute remote command'].map((example) => (
                  <Button
                    key={example}
                    size="small"
                    onClick={() => setCurrentTask(example)}
                    sx={{
                      color: '#4caf50',
                      fontSize: '0.7rem',
                      minHeight: 'auto',
                      padding: '2px 4px',
                      mr: 0.5,
                      mb: 0.5,
                      textTransform: 'none',
                      '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      },
                    }}
                  >
                    {example}
                  </Button>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};
