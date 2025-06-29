export interface MonitoringFrame {
  frameNumber: number;
  timestamp: number;
  imagePath: string; // Path to captured frame image
  analysis: FrameAnalysis;
  processed: boolean;
}

export interface FrameAnalysis {
  status: 'ok' | 'issue' | 'processing' | 'error';
  blackscreen: {
    detected: boolean;
    consecutiveFrames: number;
    confidence: number;
  };
  freeze: {
    detected: boolean;
    consecutiveFrames: number;
  };
  subtitles: {
    detected: boolean;
    text: string;
    truncatedText: string; // Max 10 chars + "..."
  };
  errors: {
    detected: boolean;
    errorType: string;
    errorText: string;
  };
  language: {
    language: string; // 'en', 'fr', 'unknown'
    confidence: number;
  };
}

export interface MonitoringState {
  isActive: boolean;
  isProcessing: boolean;
  frames: MonitoringFrame[];
  currentFrameIndex: number;
  totalFrames: number;
  maxFrames: number; // 180 frames (3 minutes at 1 fps)
  error: string | null;
  lastProcessedFrame: number;
} 