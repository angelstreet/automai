import { useState, useEffect, useCallback } from 'react';
import { CaptureApi, CaptureStartResponse, CaptureStopResponse, CaptureStatusResponse } from '../utils/captureApi';

interface CaptureState {
  isCapturing: boolean;
  duration: number;
  maxDuration: number;
  fps: number;
  error: string | null;
  isLoading: boolean;
}

interface CaptureResult {
  framesDownloaded: number;
  localCaptureDir: string;
  captureDuration: number;
}

export function useCapture(deviceModel: string = 'android_mobile', videoDevice: string = '/dev/video0') {
  const [captureState, setCaptureState] = useState<CaptureState>({
    isCapturing: false,
    duration: 0,
    maxDuration: 30,
    fps: 10,
    error: null,
    isLoading: false,
  });

  const [lastCaptureResult, setLastCaptureResult] = useState<CaptureResult | null>(null);

  // Poll capture status when capturing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (captureState.isCapturing) {
      interval = setInterval(async () => {
        try {
          const status = await CaptureApi.getCaptureStatus();
          if (status.success && status.is_capturing !== undefined) {
            setCaptureState(prev => ({
              ...prev,
              duration: status.duration || 0,
              maxDuration: status.max_duration || 30,
              fps: status.fps || 10,
              isCapturing: status.is_capturing,
            }));
          }
        } catch (error) {
          console.error('[@hook:useCapture] Failed to get capture status:', error);
        }
      }, 1000); // Update every second
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [captureState.isCapturing]);

  const startCapture = useCallback(async (): Promise<CaptureStartResponse> => {
    setCaptureState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log(`[@hook:useCapture] Starting capture for device: ${deviceModel}`);
      const result = await CaptureApi.startCapture(videoDevice, deviceModel);
      
      if (result.success) {
        setCaptureState(prev => ({
          ...prev,
          isCapturing: true,
          duration: 0,
          isLoading: false,
        }));
        console.log(`[@hook:useCapture] Capture started successfully`);
      } else {
        setCaptureState(prev => ({
          ...prev,
          error: result.error || 'Failed to start capture',
          isLoading: false,
        }));
        console.error(`[@hook:useCapture] Capture start failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCaptureState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error(`[@hook:useCapture] Start capture error: ${error}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [deviceModel, videoDevice]);

  const stopCapture = useCallback(async (): Promise<CaptureStopResponse> => {
    setCaptureState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log(`[@hook:useCapture] Stopping capture`);
      const result = await CaptureApi.stopCapture();
      
      if (result.success) {
        setCaptureState(prev => ({
          ...prev,
          isCapturing: false,
          duration: 0,
          isLoading: false,
        }));
        
        // Store capture result
        if (result.frames_downloaded !== undefined && result.local_capture_dir && result.capture_duration !== undefined) {
          setLastCaptureResult({
            framesDownloaded: result.frames_downloaded,
            localCaptureDir: result.local_capture_dir,
            captureDuration: result.capture_duration,
          });
        }
        
        console.log(`[@hook:useCapture] Capture stopped successfully. Downloaded ${result.frames_downloaded} frames`);
      } else {
        setCaptureState(prev => ({
          ...prev,
          error: result.error || 'Failed to stop capture',
          isLoading: false,
        }));
        console.error(`[@hook:useCapture] Capture stop failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCaptureState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error(`[@hook:useCapture] Stop capture error: ${error}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setCaptureState(prev => ({ ...prev, error: null }));
  }, []);

  const clearLastResult = useCallback(() => {
    setLastCaptureResult(null);
  }, []);

  // Check if there's an active capture session on mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const status = await CaptureApi.getCaptureStatus();
        if (status.success && status.is_capturing) {
          setCaptureState(prev => ({
            ...prev,
            isCapturing: true,
            duration: status.duration || 0,
            maxDuration: status.max_duration || 30,
            fps: status.fps || 10,
          }));
        }
      } catch (error) {
        console.error('[@hook:useCapture] Failed to check initial status:', error);
      }
    };

    checkInitialStatus();
  }, []);

  return {
    // State
    captureState,
    lastCaptureResult,
    
    // Actions
    startCapture,
    stopCapture,
    clearError,
    clearLastResult,
    
    // Computed values
    isCapturing: captureState.isCapturing,
    isLoading: captureState.isLoading,
    error: captureState.error,
    captureStatus: {
      is_capturing: captureState.isCapturing,
      duration: captureState.duration,
      max_duration: captureState.maxDuration,
      fps: captureState.fps,
    },
  };
}

export default useCapture; 