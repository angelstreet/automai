'use client';

import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';

export function usePlaywrightStream(websocketUrl: string) {
  const [streamImage, setStreamImage] = useState<string | null>(null);
  const { lastMessage, readyState } = useWebSocket(websocketUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (lastMessage && lastMessage.data) {
      // Check if the message is a base64 encoded image
      if (typeof lastMessage.data === 'string' && lastMessage.data.startsWith('data:image')) {
        setStreamImage(lastMessage.data);
      } else if (typeof lastMessage.data === 'string') {
        // Attempt to decode as base64 if not already prefixed
        try {
          setStreamImage(`data:image/png;base64,${lastMessage.data}`);
        } catch (error) {
          console.error('[@hook:usePlaywrightStream] Failed to decode image data:', error);
        }
      }
    }
  }, [lastMessage]);

  const connectionStatus =
    readyState === 0
      ? 'Connecting'
      : readyState === 1
        ? 'Connected'
        : readyState === 2
          ? 'Closing'
          : 'Closed';

  return { streamImage, connectionStatus };
}
