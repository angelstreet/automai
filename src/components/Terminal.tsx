const handleResize = () => {
  try {
    const fitAddonInstance = fitAddonRef.current;
    if (fitAddonInstance && term && term.element) {
      fitAddonInstance.fit();
      
      const dimensions = { 
        cols: typeof term.cols === 'number' ? term.cols : 80,
        rows: typeof term.rows === 'number' ? term.rows : 24
      };
      
      logger.info('Terminal resized', {
        action: 'TERMINAL_RESIZE',
        data: { 
          connectionId: connection?.id || 'unknown',
          dimensions
        },
        saveToDb: false
      });
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'resize',
          ...dimensions
        }));
      }
    }
  } catch (error) {
    console.error('[Terminal] Error during resize:', error);
  }
}; 