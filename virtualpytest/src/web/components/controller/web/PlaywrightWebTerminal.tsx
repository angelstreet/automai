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
    executeCommand,
    // Removed unused destructured properties to fix linter errors
    session,
    currentUrl,
    pageTitle,
    terminalOutput,
    isExecuting,
    openBrowser,
    closeBrowser,
    clearTerminal,
  } = usePlaywrightWeb(host); // Web automation operates directly on the host

  // Local state for individual action inputs
  const [navigateUrl, setNavigateUrl] = useState('');
  const [clickSelector, setClickSelector] = useState('');
  const [tapX, setTapX] = useState('');
  const [tapY, setTapY] = useState('');
  const [findSelector, setFindSelector] = useState('');
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Execution states for individual actions
  const [isNavigating, setIsNavigating] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [isDumping, setIsDumping] = useState(false);

  // Success/failure states for visual feedback
  const [navigateStatus, setNavigateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clickStatus, setClickStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [tapStatus, setTapStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [findStatus, setFindStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dumpStatus, setDumpStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  // Reset status after 3 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    if (navigateStatus !== 'idle') {
      timers.push(setTimeout(() => setNavigateStatus('idle'), 3000));
    }
    if (clickStatus !== 'idle') {
      timers.push(setTimeout(() => setClickStatus('idle'), 3000));
    }
    if (tapStatus !== 'idle') {
      timers.push(setTimeout(() => setTapStatus('idle'), 3000));
    }
    if (findStatus !== 'idle') {
      timers.push(setTimeout(() => setFindStatus('idle'), 3000));
    }
    if (dumpStatus !== 'idle') {
      timers.push(setTimeout(() => setDumpStatus('idle'), 3000));
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [navigateStatus, clickStatus, tapStatus, findStatus, dumpStatus]);

  // Check if any action is executing
  const isAnyActionExecuting =
    isExecuting || isNavigating || isClicking || isTapping || isFinding || isDumping;

  // Handle browser open
  const handleOpenBrowser = async () => {
    setIsOpening(true);
    try {
      console.log('Starting browser open process...');
      const result = await openBrowser();
      if (result.success) {
        setIsBrowserOpen(true);
        console.log('Browser opened successfully');
      } else {
        console.error('Failed to open browser:', result.error);
      }
    } catch (error) {
      console.error('Failed to open browser:', error);
    } finally {
      setIsOpening(false);
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

        // Reset all action states and status
        setIsNavigating(false);
        setIsClicking(false);
        setIsTapping(false);
        setIsFinding(false);
        setNavigateStatus('idle');
        setClickStatus('idle');
        setTapStatus('idle');
        setFindStatus('idle');

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
    if (!navigateUrl.trim() || isAnyActionExecuting) return;

    setIsNavigating(true);
    setNavigateStatus('idle');

    try {
      // Clear response area before new command
      clearTerminal();

      // Use proper JSON format for the command
      const commandJson = JSON.stringify({
        command: 'navigate_to_url',
        params: {
          url: navigateUrl.trim(),
          follow_redirects: true, // Always follow redirects for navigation
        },
      });
      const result = await executeCommand(commandJson);
      setNavigateUrl('');

      // Set visual feedback based on result
      setNavigateStatus(result.success ? 'success' : 'error');

      // Show response area
      setIsResponseExpanded(true);
    } catch (error) {
      setNavigateStatus('error');
      console.error('Navigate error:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Handle click element action
  const handleClickElement = async () => {
    if (!clickSelector.trim() || isAnyActionExecuting) return;

    setIsClicking(true);
    setClickStatus('idle');

    try {
      // Clear response area before new command
      clearTerminal();

      // Use proper JSON format for the command
      const commandJson = JSON.stringify({
        command: 'click_element',
        params: { selector: clickSelector.trim() },
      });
      const result = await executeCommand(commandJson);
      setClickSelector('');

      // Set visual feedback based on result
      setClickStatus(result.success ? 'success' : 'error');

      // Show response area
      setIsResponseExpanded(true);
    } catch (error) {
      setClickStatus('error');
      console.error('Click error:', error);
    } finally {
      setIsClicking(false);
    }
  };

  // Handle tap coordinates action
  const handleTapXY = async () => {
    const x = parseInt(tapX);
    const y = parseInt(tapY);

    if (isNaN(x) || isNaN(y) || isAnyActionExecuting) return;

    setIsTapping(true);
    setTapStatus('idle');

    try {
      // Clear response area before new command
      clearTerminal();

      // Use proper JSON format for the command
      const commandJson = JSON.stringify({
        command: 'tap_x_y',
        params: { x, y },
      });
      const result = await executeCommand(commandJson);
      setTapX('');
      setTapY('');

      // Set visual feedback based on result
      setTapStatus(result.success ? 'success' : 'error');

      // Show response area
      setIsResponseExpanded(true);
    } catch (error) {
      setTapStatus('error');
      console.error('Tap error:', error);
    } finally {
      setIsTapping(false);
    }
  };

  // Handle find element action
  const handleFindElement = async () => {
    if (!findSelector.trim() || isAnyActionExecuting) return;

    setIsFinding(true);
    setFindStatus('idle');

    try {
      // Clear response area before new find
      clearTerminal();

      // Use proper JSON format for the command - find specific element
      const commandJson = JSON.stringify({
        command: 'find_element',
        params: { selector: findSelector.trim() },
      });

      const result = await executeCommand(commandJson);
      setFindSelector('');

      // Set visual feedback based on result
      setFindStatus(result.success ? 'success' : 'error');

      // Show response area
      setIsResponseExpanded(true);
    } catch (error) {
      setFindStatus('error');
      console.error('Find error:', error);
    } finally {
      setIsFinding(false);
    }
  };

  const handleDumpElements = async () => {
    if (isAnyActionExecuting) return;

    setIsDumping(true);
    setDumpStatus('idle');

    try {
      // Clear response area before new dump
      clearTerminal();

      // Use proper JSON format for the command
      const commandJson = JSON.stringify({
        command: 'dump_elements',
        params: {
          element_types: 'all',
        },
      });
      const result = await executeCommand(commandJson);

      // Set visual feedback based on result
      setDumpStatus(result.success ? 'success' : 'error');

      // Show response area
      setIsResponseExpanded(true);
    } catch (error) {
      setDumpStatus('error');
      console.error('Dump elements error:', error);
    } finally {
      setIsDumping(false);
    }
  };

  // Helper function to get button color based on status
  const getButtonColor = (status: 'idle' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'primary';
    }
  };

  const formatResponse = (output: string) => {
    // Filter and format the output to show only useful information
    const lines = output.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and simple success messages
      if (!trimmedLine) continue;

      // Skip generic success messages without useful info
      if (trimmedLine === '✅ Success') continue;
      if (trimmedLine.match(/^✅ Success \(\d+ms\)$/)) continue;
      if (trimmedLine === 'Command executed successfully') continue;

      // Skip command echo lines (lines that start with $ and contain JSON)
      if (trimmedLine.startsWith('$ {') && trimmedLine.includes('"command":')) continue;

      // Keep useful information
      if (
        trimmedLine.startsWith('URL:') ||
        trimmedLine.startsWith('Title:') ||
        trimmedLine.startsWith('Error:') ||
        trimmedLine.startsWith('❌') ||
        trimmedLine.includes('"error":') ||
        trimmedLine.includes('"success":') ||
        trimmedLine.includes('"selector_used":') ||
        trimmedLine.includes('"search_type":') ||
        trimmedLine.includes('"execution_time":') ||
        trimmedLine.includes('elements found') ||
        trimmedLine.includes('Element clicked') ||
        trimmedLine.includes('Element found') ||
        trimmedLine.includes('Navigation completed') ||
        (trimmedLine.startsWith('{') && trimmedLine.includes('"'))
      ) {
        filteredLines.push(trimmedLine);
      }
    }

    // If no useful info was found, show a simple status
    if (filteredLines.length === 0) {
      filteredLines.push('✅ Command completed');
    }

    return filteredLines.map((line, index) => (
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
          color:
            line.includes('Error:') || line.includes('❌')
              ? '#ff6b6b'
              : line.startsWith('URL:') || line.startsWith('Title:')
                ? '#4dabf7'
                : line.includes('"success": true')
                  ? '#51cf66'
                  : 'inherit',
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
            disabled={isBrowserOpen || isAnyActionExecuting || isOpening}
            startIcon={isOpening ? <CircularProgress size={16} /> : <PlayIcon />}
            color="success"
            sx={{ flex: 1 }}
          >
            {isOpening ? 'Opening...' : 'Open'}
          </Button>
          <Button
            variant={isBrowserOpen ? 'contained' : 'outlined'}
            size="small"
            onClick={handleCloseBrowser}
            disabled={!isBrowserOpen || isOpening || isAnyActionExecuting}
            startIcon={<StopIcon />}
            color="error"
            sx={{ flex: 1 }}
          >
            Close
          </Button>
        </Box>
      </Box>

      {/* Action Buttons */}
      {isBrowserOpen && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Navigate Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Navigate to URL
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
                disabled={!navigateUrl.trim() || isAnyActionExecuting}
                color={getButtonColor(navigateStatus)}
                startIcon={isNavigating ? <CircularProgress size={16} /> : undefined}
                sx={{ minWidth: '60px' }}
              >
                {isNavigating ? 'Going...' : 'Go'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Click Element Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Click Element (CSS selector or text)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={clickSelector}
                  onChange={(e) => setClickSelector(e.target.value)}
                  placeholder="CSS selector or text content (e.g., 'Google', button, #id, .class)"
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
                  disabled={!clickSelector.trim() || isAnyActionExecuting}
                  color={getButtonColor(clickStatus)}
                  startIcon={isClicking ? <CircularProgress size={16} /> : undefined}
                  sx={{ minWidth: '60px' }}
                >
                  {isClicking ? 'Clicking...' : 'Click'}
                </Button>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                Supports both CSS selectors and text content search
              </Typography>
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
                onClick={handleTapXY}
                disabled={!tapX.trim() || !tapY.trim() || isAnyActionExecuting}
                color={getButtonColor(tapStatus)}
                startIcon={isTapping ? <CircularProgress size={16} /> : undefined}
                sx={{ minWidth: '60px' }}
              >
                {isTapping ? 'Tapping...' : 'Tap'}
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
                disabled={!findSelector.trim() || isAnyActionExecuting}
                color={getButtonColor(findStatus)}
                startIcon={isFinding ? <CircularProgress size={16} /> : undefined}
                sx={{ minWidth: '60px' }}
              >
                {isFinding ? 'Finding...' : 'Find'}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Dump Elements Action */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
              Dump Elements
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDumpElements}
                  disabled={isAnyActionExecuting}
                  color={getButtonColor(dumpStatus)}
                  startIcon={isDumping ? <CircularProgress size={16} /> : undefined}
                  sx={{ minWidth: '80px' }}
                >
                  {isDumping ? 'Dumping...' : 'Dump'}
                </Button>
              </Box>
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
    </Box>
  );
});
