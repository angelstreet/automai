import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { Host } from '../../types/common/Host_Types';
import { DragArea, VncStreamState, VncStreamActions } from '../../types/controller/Vnc_Types';

interface UseVncStreamProps {
  host: Host;
  deviceModel?: string;
  streamUrl?: string;
  isStreamActive?: boolean;
}

export function useVncStream({
  host,
  deviceModel = 'host_vnc',
  streamUrl: providedStreamUrl = '',
  isStreamActive: providedIsStreamActive = false,
}: UseVncStreamProps): VncStreamState & VncStreamActions {
  // Stream state - now controlled by component
  const [streamUrl, setStreamUrl] = useState<string>(providedStreamUrl);
  const [isStreamActive, setIsStreamActive] = useState(providedIsStreamActive);
  const [captureMode, setCaptureMode] = useState<'stream' | 'screenshot' | 'video'>('stream');

  // Capture state
  const [isCaptureActive, setIsCaptureActive] = useState(false);
  const [captureImageRef, setCaptureImageRef] = useState<React.RefObject<HTMLImageElement> | null>(
    null,
  );
  const [captureImageDimensions, setCaptureImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [captureSourcePath, setCaptureSourcePath] = useState<string>(''); // TODO: Rename to imageSourceUrl
  const [selectedArea, setSelectedArea] = useState<DragArea | null>(null);

  // Screenshot state
  const [screenshotPath, setScreenshotPath] = useState<string>('');

  // Video state
  const [videoFramesPath, _setVideoFramesPath] = useState<string>('');
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [captureStartTime, setCaptureStartTime] = useState<Date | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);

  // UI state
  const [referenceName, setReferenceName] = useState<string>('vnc_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [captureCollapsed, setCaptureCollapsed] = useState<boolean>(true);
  const [referenceText, setReferenceText] = useState<string>('');
  const [referenceType, setReferenceType] = useState<'image' | 'text'>('image');
  const [detectedTextData, setDetectedTextData] = useState<{
    text: string;
    fontSize: number;
    confidence: number;
    detectedLanguage?: string;
    detectedLanguageName?: string;
    languageConfidence?: number;
  } | null>(null);
  const [imageProcessingOptions, setImageProcessingOptions] = useState<{
    autocrop: boolean;
    removeBackground: boolean;
  }>({
    autocrop: false,
    removeBackground: false,
  });

  // Refs
  const captureContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  // Update state when props change
  useEffect(() => {
    setStreamUrl(providedStreamUrl);
  }, [providedStreamUrl]);

  useEffect(() => {
    setIsStreamActive(providedIsStreamActive);
  }, [providedIsStreamActive]);

  // Computed values - VNC is always landscape (desktop screen)
  const layoutConfig = useMemo(() => {
    const baseWidth = 800;
    const baseHeight = 600;

    return {
      width: baseWidth,
      height: baseHeight,
      captureHeight: baseHeight - 80, // Account for controls
      isMobileModel: false, // VNC is never mobile - always desktop
    };
  }, []);

  const canCapture = isStreamActive && !isCaptureActive;
  const canSave = hasCaptured && capturedReferenceImage;
  const allowSelection = captureMode === 'screenshot' || captureMode === 'video';

  // Area selection handler
  const handleAreaSelected = useCallback((area: DragArea) => {
    setSelectedArea(area);
    console.log(`[@hook:useVncStream] Area selected:`, area);
  }, []);

  // Image load handler for setting dimensions
  const handleImageLoad = useCallback((imageDimensions: { width: number; height: number }) => {
    setCaptureImageDimensions(imageDimensions);
    console.log(`[@hook:useVncStream] Image loaded with dimensions:`, imageDimensions);
  }, []);

  // Screenshot capture handler
  const handleTakeScreenshot = useCallback(async () => {
    if (!isStreamActive) {
      console.warn(`[@hook:useVncStream] Cannot take screenshot - stream not active`);
      return;
    }

    try {
      console.log(`[@hook:useVncStream] Taking VNC screenshot for host: ${host.host_name}`);

      // Call screenshot API for VNC (will use host_vnc device)
      const response = await fetch('/server/av/takeScreenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: 'host_vnc', // Use the VNC device ID
        }),
      });

      const result = await response.json();

      if (result.success && result.screenshot_path) {
        console.log(`[@hook:useVncStream] Screenshot captured: ${result.screenshot_path}`);
        setScreenshotPath(result.screenshot_path);
        setCaptureSourcePath(result.screenshot_path);
        setHasCaptured(true);
        setSuccessMessage('VNC screenshot captured successfully');

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error(`[@hook:useVncStream] Screenshot failed:`, result.error);
        setSuccessMessage(`Screenshot failed: ${result.error || 'Unknown error'}`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (error) {
      console.error(`[@hook:useVncStream] Screenshot error:`, error);
      setSuccessMessage(
        `Screenshot error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [isStreamActive, host]);

  const setVideoFramesPath = useCallback((path: string) => {
    _setVideoFramesPath(path);
  }, []);

  // Return combined state and actions
  return {
    // State
    streamUrl,
    isStreamActive,
    captureMode,
    isCaptureActive,
    captureImageRef,
    captureImageDimensions,
    originalImageDimensions,
    captureSourcePath,
    selectedArea,
    screenshotPath,
    videoFramesPath,
    totalFrames,
    currentFrame,
    captureStartTime,
    recordingStartTime,
    referenceName,
    capturedReferenceImage,
    hasCaptured,
    successMessage,
    captureCollapsed,
    referenceText,
    referenceType,
    detectedTextData,
    imageProcessingOptions,
    captureContainerRef,
    videoElementRef,
    canCapture,
    canSave,
    allowSelection,
    layoutConfig,

    // Actions
    setStreamUrl,
    setIsStreamActive,
    setCaptureMode,
    setIsCaptureActive,
    setCaptureImageRef,
    setCaptureImageDimensions,
    setOriginalImageDimensions,
    setCaptureSourcePath,
    setSelectedArea,
    setScreenshotPath,
    setVideoFramesPath,
    setTotalFrames,
    setCurrentFrame,
    setCaptureStartTime,
    setRecordingStartTime,
    setReferenceName,
    setCapturedReferenceImage,
    setHasCaptured,
    setSuccessMessage,
    setCaptureCollapsed,
    setReferenceText,
    setReferenceType,
    setDetectedTextData,
    setImageProcessingOptions,
    handleAreaSelected,
    handleImageLoad,
    handleTakeScreenshot,
  };
}
