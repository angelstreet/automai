import { useState, useCallback } from 'react';

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: any;
  subtitleDetectionPerformed?: boolean;
}

interface UseMonitoringAIReturn {
  // AI Query functionality
  isAIQueryVisible: boolean;
  aiQuery: string;
  aiResponse: string;
  isProcessingAIQuery: boolean;
  toggleAIPanel: () => void;
  submitAIQuery: () => Promise<void>;
  clearAIQuery: () => void;
  handleAIQueryChange: (query: string) => void;
}

interface UseMonitoringAIProps {
  frames: FrameRef[];
  currentIndex: number;
  setIsPlaying: (playing: boolean) => void;
  setUserSelectedFrame: (selected: boolean) => void;
  host: any;
  device: any;
}

export const useMonitoringAI = ({
  frames,
  currentIndex,
  setIsPlaying,
  setUserSelectedFrame,
  host,
  device,
}: UseMonitoringAIProps): UseMonitoringAIReturn => {
  const [isAIQueryVisible, setIsAIQueryVisible] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessingAIQuery, setIsProcessingAIQuery] = useState(false);

  // AI Query functions
  const toggleAIPanel = useCallback(() => {
    if (isAIQueryVisible) {
      // Clear when closing
      setIsAIQueryVisible(false);
      setAiQuery('');
      setAiResponse('');
      setIsProcessingAIQuery(false);
    } else {
      // Open panel and pause monitoring to analyze current frame
      setIsAIQueryVisible(true);
      setIsPlaying(false);
      setUserSelectedFrame(true);
    }
  }, [isAIQueryVisible, setIsPlaying, setUserSelectedFrame]);

  const clearAIQuery = useCallback(() => {
    setIsAIQueryVisible(false);
    setAiQuery('');
    setAiResponse('');
    setIsProcessingAIQuery(false);
  }, []);

  const handleAIQueryChange = useCallback((query: string) => {
    // Limit to 100 characters
    setAiQuery(query.slice(0, 100));
  }, []);

  const submitAIQuery = useCallback(async () => {
    if (
      !aiQuery.trim() ||
      isProcessingAIQuery ||
      frames.length === 0 ||
      currentIndex >= frames.length
    ) {
      return;
    }

    const currentFrame = frames[currentIndex];
    if (!currentFrame) {
      return;
    }

    // Pause the player when processing AI query
    setIsPlaying(false);
    setUserSelectedFrame(true);

    setIsProcessingAIQuery(true);
    setAiResponse('');

    try {
      console.log('[useMonitoringAI] Processing AI query for frame:', currentFrame.imageUrl);

      const response = await fetch('/server/verification/video/analyzeImageAI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device?.device_id,
          image_source_url: currentFrame.imageUrl,
          query: aiQuery.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[useMonitoringAI] AI query result:', result);

        if (result.success && result.response) {
          setAiResponse(result.response);
        } else {
          setAiResponse('Unable to analyze image. Please try again.');
        }
      } else {
        console.error('[useMonitoringAI] AI query request failed:', response.status);
        setAiResponse('Request failed. Please try again.');
      }
    } catch (error) {
      console.error('[useMonitoringAI] AI query error:', error);
      setAiResponse('Error processing request. Please try again.');
    } finally {
      setIsProcessingAIQuery(false);
      // Automatically close the panel after successful submission
      setTimeout(() => {
        clearAIQuery();
      }, 3000); // Close after 3 seconds to let user see the response
    }
  }, [
    aiQuery,
    isProcessingAIQuery,
    frames,
    currentIndex,
    host,
    device?.device_id,
    setIsPlaying,
    setUserSelectedFrame,
    clearAIQuery,
  ]);

  return {
    isAIQueryVisible,
    aiQuery,
    aiResponse,
    isProcessingAIQuery,
    toggleAIPanel,
    submitAIQuery,
    clearAIQuery,
    handleAIQueryChange,
  };
};
