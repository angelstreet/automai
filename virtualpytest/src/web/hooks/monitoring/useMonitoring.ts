import { useState, useCallback, useEffect, useRef } from 'react';
import { Host, Device } from '../../types/common/Host_Types';
import { MonitoringState, MonitoringFrame, FrameAnalysis } from '../../components/monitoring/types/MonitoringTypes';

interface UseMonitoringProps {
  host: Host;
  deviceId: string;
  isControlActive: boolean;
}

interface UseMonitoringReturn {
  // State
  monitoringState: MonitoringState;
  
  // Controls
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  toggleMonitoring: () => Promise<void>;
  
  // Navigation
  goToFrame: (frameIndex: number) => void;
  nextFrame: () => void;
  previousFrame: () => void;
  goToFirstFrame: () => void;
  goToLastFrame: () => void;
  
  // Playback
  isPlaying: boolean;
  togglePlayback: () => void;
  
  // Current frame data
  currentFrame: MonitoringFrame | null;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

const initialState: MonitoringState = {
  isActive: false,
  isProcessing: false,
  frames: [],
  currentFrameIndex: 0,
  totalFrames: 0,
  maxFrames: 180, // 3 minutes at 1 fps
  error: null,
  lastProcessedFrame: 0,
};

export const useMonitoring = ({ 
  host, 
  deviceId, 
  isControlActive 
}: UseMonitoringProps): UseMonitoringReturn => {
  const [monitoringState, setMonitoringState] = useState<MonitoringState>(initialState);
  const [isPlaying, setIsPlaying] = useState(false);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start monitoring - begins processing captured frames
  const startMonitoring = useCallback(async () => {
    if (!isControlActive) {
      setMonitoringState(prev => ({ 
        ...prev, 
        error: 'Device control required to start monitoring' 
      }));
      return;
    }

    try {
      console.log('[@hook:useMonitoring] Starting monitoring session');
      
      setMonitoringState(prev => ({ 
        ...prev, 
        isActive: true, 
        error: null,
        isProcessing: true 
      }));

      // Start processing loop - check for new captured frames every second
      processingIntervalRef.current = setInterval(async () => {
        await processNewFrames();
      }, 1000); // 1 second interval = 1 fps processing

    } catch (error: any) {
      console.error('[@hook:useMonitoring] Failed to start monitoring:', error);
      setMonitoringState(prev => ({ 
        ...prev, 
        error: error.message,
        isProcessing: false 
      }));
    }
  }, [host, deviceId, isControlActive]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    console.log('[@hook:useMonitoring] Stopping monitoring session');
    
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    setIsPlaying(false);
    setMonitoringState(prev => ({ 
      ...prev, 
      isActive: false,
      isProcessing: false 
    }));
  }, []);

  // Toggle monitoring
  const toggleMonitoring = useCallback(async () => {
    if (monitoringState.isActive) {
      stopMonitoring();
    } else {
      await startMonitoring();
    }
  }, [monitoringState.isActive, startMonitoring, stopMonitoring]);

  // Process new captured frames
  const processNewFrames = useCallback(async () => {
    try {
      // Get latest captured frames from the HDMI controller
      const response = await fetch('/server/ai-monitoring/get-latest-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          device_id: deviceId,
          last_processed_frame: monitoringState.lastProcessedFrame
        })
      });

      const result = await response.json();
      
      if (result.success && result.frames && result.frames.length > 0) {
        console.log(`[@hook:useMonitoring] Processing ${result.frames.length} new frames`);
        
        // Process each new frame with AI analysis
        const processedFrames: MonitoringFrame[] = [];
        
        for (const frameInfo of result.frames) {
          try {
            // Analyze frame with AI
            const analysisResponse = await fetch('/server/ai-monitoring/analyze-frame', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                frame_path: frameInfo.path,
                frame_number: frameInfo.frame_number,
                host,
                device_id: deviceId
              })
            });

            const analysisResult = await analysisResponse.json();
            
            if (analysisResult.success) {
              const monitoringFrame: MonitoringFrame = {
                frameNumber: frameInfo.frame_number,
                timestamp: frameInfo.timestamp,
                imagePath: frameInfo.path,
                analysis: analysisResult.analysis,
                processed: true
              };
              
              processedFrames.push(monitoringFrame);
            } else {
              console.error('[@hook:useMonitoring] Frame analysis failed:', analysisResult.error);
            }
          } catch (error) {
            console.error('[@hook:useMonitoring] Error processing frame:', error);
          }
        }

        if (processedFrames.length > 0) {
          setMonitoringState(prev => {
            const newFrames = [...prev.frames, ...processedFrames];
            
            // Keep only last maxFrames (180 frames = 3 minutes at 1 fps)
            const limitedFrames = newFrames.slice(-prev.maxFrames);
            
            // Auto-advance to latest frame if we were at the end
            const wasAtEnd = prev.currentFrameIndex >= prev.totalFrames - 1;
            const newCurrentIndex = wasAtEnd ? limitedFrames.length - 1 : prev.currentFrameIndex;
            
            return {
              ...prev,
              frames: limitedFrames,
              totalFrames: limitedFrames.length,
              currentFrameIndex: Math.max(0, newCurrentIndex),
              lastProcessedFrame: Math.max(...processedFrames.map(f => f.frameNumber))
            };
          });
        }
      }
    } catch (error: any) {
      console.error('[@hook:useMonitoring] Error processing new frames:', error);
      setMonitoringState(prev => ({ 
        ...prev, 
        error: error.message 
      }));
    }
  }, [host, deviceId, monitoringState.lastProcessedFrame]);

  // Navigation functions
  const goToFrame = useCallback((frameIndex: number) => {
    setMonitoringState(prev => ({
      ...prev,
      currentFrameIndex: Math.max(0, Math.min(frameIndex, prev.totalFrames - 1))
    }));
  }, []);

  const nextFrame = useCallback(() => {
    setMonitoringState(prev => ({
      ...prev,
      currentFrameIndex: Math.min(prev.currentFrameIndex + 1, prev.totalFrames - 1)
    }));
  }, []);

  const previousFrame = useCallback(() => {
    setMonitoringState(prev => ({
      ...prev,
      currentFrameIndex: Math.max(prev.currentFrameIndex - 1, 0)
    }));
  }, []);

  const goToFirstFrame = useCallback(() => {
    goToFrame(0);
  }, [goToFrame]);

  const goToLastFrame = useCallback(() => {
    setMonitoringState(prev => ({
      ...prev,
      currentFrameIndex: prev.totalFrames - 1
    }));
  }, []);

  // Playback controls
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Handle playback interval
  useEffect(() => {
    if (isPlaying && monitoringState.totalFrames > 0) {
      playbackIntervalRef.current = setInterval(() => {
        setMonitoringState(prev => {
          const nextIndex = prev.currentFrameIndex + 1;
          if (nextIndex >= prev.totalFrames) {
            setIsPlaying(false); // Stop at end
            return prev;
          }
          return {
            ...prev,
            currentFrameIndex: nextIndex
          };
        });
      }, 1000); // 1 second per frame
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, monitoringState.totalFrames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Auto-stop monitoring when control is lost
  useEffect(() => {
    if (!isControlActive && monitoringState.isActive) {
      console.log('[@hook:useMonitoring] Control lost, stopping monitoring');
      stopMonitoring();
    }
  }, [isControlActive, monitoringState.isActive, stopMonitoring]);

  // Computed values
  const currentFrame = monitoringState.frames[monitoringState.currentFrameIndex] || null;
  const canGoNext = monitoringState.currentFrameIndex < monitoringState.totalFrames - 1;
  const canGoPrevious = monitoringState.currentFrameIndex > 0;

  return {
    monitoringState,
    startMonitoring,
    stopMonitoring,
    toggleMonitoring,
    goToFrame,
    nextFrame,
    previousFrame,
    goToFirstFrame,
    goToLastFrame,
    isPlaying,
    togglePlayback,
    currentFrame,
    canGoNext,
    canGoPrevious,
  };
}; 