import { useState, useEffect, useCallback } from 'react';
import { CaptureApi, CaptureStartResponse, CaptureStopResponse, CaptureStatusResponse } from '../utils/captureApi';

interface CaptureState {
  isCapturing: boolean;
  duration: number;
  maxDuration: number;
  fps: number;
  error: string | null;
  isLoading: boolean;
  currentFrame: number;
}

interface CaptureResult {
  framesDownloaded: number;
  localCaptureDir: string;
  captureDuration: number;
}

interface CaptureStatusResponse {
  is_capturing: boolean;
  duration: number;
  max_duration: number;
  fps: number;
  current_frame?: number;
}

export function useCapture(deviceModel: string = 'android_mobile', videoDevice: string = '/dev/video0') {
  const [captureState, setCaptureState] = useState<CaptureState>({
    isCapturing: false,
    duration: 0,
    maxDuration: 30,
    fps: 10,
    error: null,
    isLoading: false,
    currentFrame: 0,
  });

  const [lastCaptureResult, setLastCaptureResult] = useState<CaptureResult | null>(null);
  const [latestFramePath, setLatestFramePath] = useState<string | null>(null);

  // Poll capture status when capturing - lightweight polling to just check if still active
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
              currentFrame: status.current_frame || 0,
            }));
          }
        } catch (error) {
          console.error('[@hook:useCapture] Failed to get capture status:', error);
        }
      }, 1000); // Update every second - just for status, not for frames
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [captureState.isCapturing]);

  // This function gets the latest frame and updates the state
  const getLatestFrame = useCallback(async () => {
    if (!captureState.isCapturing) return null;

    try {
      const result = await CaptureApi.getLatestFrame();
      if (result.success && result.frame_path) {
        setLatestFramePath(result.frame_path);
        return result.frame_path;
      }
      return null;
    } catch (error) {
      console.error('[@hook:useCapture] Failed to get latest frame:', error);
      return null;
    }
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
        
        // Start checking for frames immediately
        getLatestFrame();
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
  }, [deviceModel, videoDevice, getLatestFrame]);

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
        
        // Clear latest frame path
        setLatestFramePath(null);
        
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
            currentFrame: status.current_frame || 0,
          }));
          
          // Get latest frame if already capturing
          getLatestFrame();
        }
      } catch (error) {
        console.error('[@hook:useCapture] Failed to check initial status:', error);
      }
    };

    checkInitialStatus();
  }, [getLatestFrame]);

  return {
    // State
    captureState,
    lastCaptureResult,
    latestFramePath,
    
    // Actions
    startCapture,
    stopCapture,
    clearError,
    clearLastResult,
    getLatestFrame,
    
    // Computed values
    isCapturing: captureState.isCapturing,
    isLoading: captureState.isLoading,
    error: captureState.error,
    captureStatus: {
      is_capturing: captureState.isCapturing,
      duration: captureState.duration,
      max_duration: captureState.maxDuration,
      fps: captureState.fps,
      current_frame: captureState.currentFrame,
    },
  };
}

export default useCapture; 