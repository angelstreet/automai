import { RefObject } from 'react';

export interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VncStreamState {
  // Stream state
  streamUrl: string;
  isStreamActive: boolean;
  captureMode: 'stream' | 'screenshot' | 'video';

  // Capture state
  isCaptureActive: boolean;
  captureImageRef: React.RefObject<HTMLImageElement> | null;
  captureImageDimensions: { width: number; height: number } | null;
  originalImageDimensions: { width: number; height: number } | null;
  captureSourcePath: string; // TODO: Rename to image_source_url
  selectedArea: DragArea | null;

  // Screenshot state
  screenshotPath: string;

  // Video state
  videoFramesPath: string;
  totalFrames: number;
  currentFrame: number;
  captureStartTime: Date | null;
  recordingStartTime: Date | null;

  // UI state
  referenceName: string;
  capturedReferenceImage: string | null;
  hasCaptured: boolean;
  successMessage: string | null;
  captureCollapsed: boolean;
  referenceText: string;
  referenceType: 'image' | 'text';
  detectedTextData: {
    text: string;
    fontSize: number;
    confidence: number;
    detectedLanguage?: string;
    detectedLanguageName?: string;
    languageConfidence?: number;
  } | null;
  imageProcessingOptions: {
    autocrop: boolean;
    removeBackground: boolean;
  };

  // Refs
  captureContainerRef: React.RefObject<HTMLDivElement>;
  videoElementRef: React.RefObject<HTMLVideoElement>;

  // Computed values
  canCapture: boolean;
  canSave: boolean;
  allowSelection: boolean;
  layoutConfig: {
    width: number;
    height: number;
    captureHeight: number;
    isMobileModel: boolean;
  };
}

export interface VncStreamActions {
  // Stream actions
  setStreamUrl: (url: string) => void;
  setIsStreamActive: (active: boolean) => void;
  setCaptureMode: (mode: 'stream' | 'screenshot' | 'video') => void;

  // Capture actions
  setIsCaptureActive: (active: boolean) => void;
  setCaptureImageRef: (ref: React.RefObject<HTMLImageElement> | null) => void;
  setCaptureImageDimensions: (dimensions: { width: number; height: number } | null) => void;
  setOriginalImageDimensions: (dimensions: { width: number; height: number } | null) => void;
  setCaptureSourcePath: (path: string) => void;
  setSelectedArea: (area: DragArea | null) => void;

  // Screenshot actions
  setScreenshotPath: (path: string) => void;

  // Video actions
  setVideoFramesPath: (path: string) => void;
  setTotalFrames: (frames: number) => void;
  setCurrentFrame: (frame: number) => void;
  setCaptureStartTime: (time: Date | null) => void;
  setRecordingStartTime: (time: Date | null) => void;

  // UI actions
  setReferenceName: (name: string) => void;
  setCapturedReferenceImage: (image: string | null) => void;
  setHasCaptured: (captured: boolean) => void;
  setSuccessMessage: (message: string | null) => void;
  setCaptureCollapsed: (collapsed: boolean) => void;
  setReferenceText: (text: string) => void;
  setReferenceType: (type: 'image' | 'text') => void;
  setDetectedTextData: (
    data: {
      text: string;
      fontSize: number;
      confidence: number;
      detectedLanguage?: string;
      detectedLanguageName?: string;
      languageConfidence?: number;
    } | null,
  ) => void;
  setImageProcessingOptions: (options: { autocrop: boolean; removeBackground: boolean }) => void;

  // Action handlers
  handleAreaSelected: (area: DragArea) => void;
  handleImageLoad: (imageDimensions: { width: number; height: number }) => void;
  handleTakeScreenshot: () => Promise<void>;
}
