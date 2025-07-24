/**
 * Monitoring Types
 *
 * Shared interfaces for monitoring functionality across the application.
 * These types correspond to the backend analysis data from analyze_audio_video.py
 */

// Core monitoring analysis from analyze_audio_video.py
export interface MonitoringAnalysis {
  timestamp: string;
  filename: string;
  thumbnail: string;
  blackscreen: boolean;
  blackscreen_percentage: number;
  freeze: boolean;
  freeze_diffs: number[];
  last_3_filenames: string[];
  last_3_thumbnails: string[];
  audio: boolean;
  volume_percentage: number;
  mean_volume_db: number;
}

// Subtitle analysis from backend detection (video.py) - EXACT field names
export interface SubtitleAnalysis {
  subtitles_detected: boolean; // result.subtitles_detected
  combined_extracted_text: string; // result.combined_extracted_text
  detected_language?: string; // result.detected_language
  confidence: number; // result.results[0].confidence
}

// Frontend-computed subtitle trend analysis
export interface SubtitleTrendAnalysis {
  showRedIndicator: boolean;
  currentHasSubtitles: boolean;
  framesAnalyzed: number;
  noSubtitlesStreak: number;
}

// Alert/Incident types from backend alerts_db.py - EXACT field names
export interface Alert {
  id: string; // UUID from backend
  host_name: string; // Exact backend field name
  device_id: string; // Exact backend field name
  incident_type: string; // 'blackscreen' | 'freeze' | 'audio_loss'
  status: 'active' | 'resolved'; // Exact backend enum values
  consecutive_count: number; // Exact backend field name
  start_time: string; // ISO datetime string
  end_time?: string; // ISO datetime string (optional)
  metadata: AlertMetadata; // JSONB metadata from backend
}

// Alert metadata structure (from alert_system.py)
export interface AlertMetadata {
  // Core analysis data (always present)
  blackscreen?: boolean;
  blackscreen_percentage?: number;
  freeze?: boolean;
  freeze_diffs?: number[];
  audio?: boolean;
  volume_percentage?: number;
  mean_volume_db?: number;
  last_3_filenames?: string[];
  last_3_thumbnails?: string[];

  // R2 storage URLs (for freeze incidents)
  r2_images?: {
    original_urls: string[];
    thumbnail_urls: string[];
    original_r2_paths: string[];
    thumbnail_r2_paths: string[];
    timestamp: string;
  };

  // Freeze detection details
  freeze_details?: {
    frames_compared: string[];
    frame_differences: number[];
    threshold: number;
    comparison_method: string;
  };

  // Allow additional metadata
  [key: string]: any;
}
