import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  TextField,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
} from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { usePlaywrightWeb } from '../../../hooks/controller/usePlaywrightWeb';
import { Host } from '../../../types/common/Host_Types';

interface PlaywrightWebTerminalProps {
  host: Host;
}

export const PlaywrightWebTerminal = React.memo(function PlaywrightWebTerminal({
  host,
}: PlaywrightWebTerminalProps) {
  const {
    isExecuting,
    terminalOutput,
    session,
    currentUrl,
    pageTitle,
    navigateToUrl,
    clickElement,
    executeCommand,
    openBrowser,
    closeBrowser,
  } = usePlaywrightWeb(host); // Web automation operates directly on the host

  // Local state for individual action inputs
  const [navigateUrl, setNavigateUrl] = useState('');
  const [clickSelector, setClickSelector] = useState('');
  const [tapX, setTapX] = useState('');
  const [tapY, setTapY] = useState('');
  const [findSelector, setFindSelector] = useState('');
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const responseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll response area when new output arrives
  useEffect(() => {
    if (responseRef.current && terminalOutput) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Update browser open state based on session and page info
  useEffect(() => {
    // Browser is only considered open if we have an active page with content
    // Since we don't auto-open anymore, we need explicit browser open confirmation
    const browserOpen = session.connected && Boolean(currentUrl && pageTitle);
    setIsBrowserOpen(browserOpen);
  }, [session.connected, currentUrl, pageTitle]);

  // Handle browser open
  const handleOpenBrowser = async () => {
    try {
      const result = await openBrowser();
      if (result.success) {
        setIsBrowserOpen(true);
        console.log('Browser opened successfully');
      } else {
        console.error('Failed to open browser:', result.error);
      }
    } catch (error) {
      console.error('Failed to open browser:', error);
    }
  };

  // Handle browser close
  const handleCloseBrowser = async () => {
    try {
      const result = await closeBrowser();
      if (result.success) {
        // Reset local component state when browser is closed
        setIsBrowserOpen(false);
        setNavigateUrl('');
        setClickSelector('');
        setTapX('');
        setTapY('');
        setFindSelector('');
        setIsResponseExpanded(false);
        console.log('Browser closed successfully');
      } else {
        console.error('Failed to close browser:', result.error);
      }
    } catch (error) {
      console.error('Failed to close browser:', error);
    }
    // Don't call onDisconnectComplete here - that's for closing the entire panel, not just the browser
  };

  // Handle navigate action
  const handleNavigate = async () => {
    if (!navigateUrl.trim() || isExecuting) return;

    const result = await navigateToUrl(navigateUrl.trim());
    setNavigateUrl('');

    // Show response area if successful
    if (result.success) {
      setIsResponseExpanded(true);
    }
  };

  // Handle click element action
  const handleClickElement = async () => {
    if (!clickSelector.trim() || isExecuting) return;

    await clickElement(clickSelector.trim());
    setClickSelector('');

    // Show response area
    setIsResponseExpanded(true);
  };

  // Handle tap coordinates action
  const handleTapCoordinates = async () => {
    const x = parseInt(tapX);
    const y = parseInt(tapY);

    if (isNaN(x) || isNaN(y) || isExecuting) return;

    await executeCommand(`tap_x_y ${x} ${y}`);
    setTapX('');
    setTapY('');

    // Show response area
    setIsResponseExpanded(true);
  };

  // Handle find element action
  const handleFindElement = async () => {
    if (!findSelector.trim() || isExecuting) return;

    await executeCommand(`click_element ${findSelector.trim()}`);
    setFindSelector('');

    // Show response area
    setIsResponseExpanded(true);
  };

  const formatResponse = (output: string) => {
    return output.split('\n').map((line, index) => (
      <Box
        key={index}
        component="pre"
        sx={{
          margin: 0,
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {line}
      </Box>
    ));
  };

  return (
    <Box
      sx={{
        p: 1,
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Browser Control */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Browser Control
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={isBrowserOpen ? 'outlined' : 'contained'}
            size="small"
            onClick={handleOpenBrowser}
            disabled={isBrowserOpen || isExecuting}
            startIcon={<PlayIcon />}
            color="success"
            sx={{ flex: 1 }}
          >
            Open
          </Button>
          <Button
            variant={isBrowserOpen ? 'contained' : 'outlined'}
            size="small"
            onClick={handleCloseBrowser}
            disabled={!isBrowserOpen}
            startIcon={<StopIcon />}
            color="error"
            sx={{ flex: 1 }}
          >
            Close
          </Button>
        </Box>
      </Box>

      {/* Page Info Display */}
      {isBrowserOpen && (currentUrl || pageTitle) && (
        <Paper
          sx={{
            p: 1,
            mb: 2,
            backgroundColor: '#2d2d30',
            color: '#cccccc',
            border: '1px solid #3e3e42',
          }}
        >
          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
            {pageTitle && `📄 ${pageTitle}`}
            {pageTitle && currentUrl && ' | '}
            {currentUrl && `🌐 ${currentUrl}`}
          </Typography>
        </Paper>
      )}

      {/* Action Buttons */}
      {isBrowserOpen && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Navigate Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Navigate
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={navigateUrl}
                onChange={(e) => setNavigateUrl(e.target.value)}
                placeholder="https://example.com"
                variant="outlined"
                size="small"
                disabled={isExecuting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNavigate();
                  }
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleNavigate}
                disabled={!navigateUrl.trim() || isExecuting}
                sx={{ minWidth: '60px' }}
              >
                Go
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Click Element Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Click Element
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={clickSelector}
                onChange={(e) => setClickSelector(e.target.value)}
                placeholder="CSS selector (e.g., button, #id, .class)"
                variant="outlined"
                size="small"
                disabled={isExecuting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleClickElement();
                  }
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleClickElement}
                disabled={!clickSelector.trim() || isExecuting}
                sx={{ minWidth: '60px' }}
              >
                Click
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Tap X,Y Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Tap Coordinates
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={tapX}
                onChange={(e) => setTapX(e.target.value)}
                placeholder="X"
                variant="outlined"
                size="small"
                type="number"
                disabled={isExecuting}
                sx={{
                  width: '80px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
              <TextField
                value={tapY}
                onChange={(e) => setTapY(e.target.value)}
                placeholder="Y"
                variant="outlined"
                size="small"
                type="number"
                disabled={isExecuting}
                sx={{
                  width: '80px',
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleTapCoordinates}
                disabled={!tapX.trim() || !tapY.trim() || isExecuting}
                sx={{ minWidth: '60px' }}
              >
                Tap
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Find Element Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Find Element
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                value={findSelector}
                onChange={(e) => setFindSelector(e.target.value)}
                placeholder="CSS selector to find"
                variant="outlined"
                size="small"
                disabled={isExecuting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFindElement();
                  }
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleFindElement}
                disabled={!findSelector.trim() || isExecuting}
                sx={{ minWidth: '60px' }}
              >
                Find
              </Button>
            </Box>
          </Box>

          {/* Response Area - Collapsible */}
          {terminalOutput && (
            <Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', flex: 1 }}>
                  Response
                </Typography>
                <IconButton size="small" onClick={() => setIsResponseExpanded(!isResponseExpanded)}>
                  {isResponseExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={isResponseExpanded}>
                <Paper
                  ref={responseRef}
                  sx={{
                    p: 1,
                    backgroundColor: '#1e1e1e',
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    border: '1px solid #333',
                    maxHeight: '200px',
                  }}
                >
                  {formatResponse(terminalOutput)}
                </Paper>
              </Collapse>
            </Box>
          )}
        </Box>
      )}

      {/* Show instructions when browser is closed */}
      {!isBrowserOpen && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant="body2">Click "Open Browser" to start web automation</Typography>
        </Box>
      )}

      {/* Executing Indicator */}
      {isExecuting && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            p: 2,
            borderRadius: 1,
            zIndex: 1000,
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2">Executing...</Typography>
        </Box>
      )}
    </Box>
  );
});
