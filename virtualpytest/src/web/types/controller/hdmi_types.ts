export interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HdmiStreamState {
  // Stream state
  streamUrl: string;
  isStreamActive: boolean;
  captureMode: 'stream' | 'screenshot' | 'video';

  // Capture state
  isCaptureActive: boolean;
  captureImageRef: React.RefObject<HTMLImageElement> | null;
  captureImageDimensions: { width: number; height: number } | null;
  originalImageDimensions: { width: number; height: number } | null;
  captureSourcePath: string;
  selectedArea: DragArea | null;

  // Screenshot state
  screenshotPath: string;

  // Video state
  videoFramesPath: string;
  totalFrames: number;
  currentFrame: number;

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

export interface HdmiStreamActions {
  // State setters
  setCaptureMode: (mode: 'stream' | 'screenshot' | 'video') => void;
  setIsCaptureActive: (active: boolean) => void;
  setCurrentFrame: (frame: number) => void;
  setReferenceName: (name: string) => void;
  setCaptureCollapsed: (collapsed: boolean) => void;
  setReferenceText: (text: string) => void;
  setReferenceType: (type: 'image' | 'text') => void;
  setImageProcessingOptions: (options: { autocrop: boolean; removeBackground: boolean }) => void;

  // Event handlers
  handleAreaSelected: (area: { x: number; y: number; width: number; height: number }) => void;
  handleClearSelection: () => void;
  handleImageLoad: (
    ref: React.RefObject<HTMLImageElement>,
    dimensions: { width: number; height: number },
    sourcePath: string,
  ) => void;
  handleCaptureReference: () => Promise<void>;
  handleTakeScreenshot: () => Promise<void>;
  handleAutoDetectText: () => Promise<void>;
  validateRegex: (text: string) => boolean;
}
