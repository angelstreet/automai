import { useState, useEffect, useCallback } from 'react';
import { CaptureApi, CaptureStartResponse, CaptureStopResponse, CaptureStatusResponse } from '../../utils/capture/captureUtils';

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
      console.error(`