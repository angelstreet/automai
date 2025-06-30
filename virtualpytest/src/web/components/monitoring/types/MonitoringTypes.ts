// Types for AI monitoring system that integrates with existing VideoCapture component

export interface MonitoringFrame {
  filename: string;
  timestamp: number;
  imageUrl: string; // Built by backend using existing proxy system
  analysis: MonitoringAnalysis | null;
}

export interface MonitoringAnalysis {
  blackscreen: boolean;
  freeze: boolean;
  subtitles: boolean;
  errors: boolean;
  language: string;
  confidence: number;
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
