/**
 * Unified Verification Types
 *
 * Simple, standard verification format used across the entire application.
 * A verification is a verification - same everywhere it's used.
 */

// Unified verification - includes data and results in one type
export interface Verification {
  // Core verification data
  command: string; // Required: command to execute
  params: Record<string, any>; // Required: parameters (can be empty {})
  verification_type: 'text' | 'image' | 'adb'; // Required: type of verification

  // Result state (optional, populated after execution)
  success?: boolean;
  message?: string;
  error?: string;
  threshold?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  sourceImageUrl?: string;
  referenceImageUrl?: string;
  extractedText?: string;
  searchedText?: string;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  // Language detection for text verifications
  detectedLanguage?: string;
  languageConfidence?: number;
  // Confidence tracking for node verifications
  last_run_result?: boolean[]; // Store last 10 execution results (true=success, false=failure)

  // ADB-specific result data
  search_term?: string;
  wait_time?: number;
  total_matches?: number;
  matches?: Array<{
    element_id: number;
    matched_attribute: string;
    matched_value: string;
    match_reason: string;
    search_term: string;
    case_match: string;
    all_matches: Array<{
      attribute: string;
      value: string;
      reason: string;
    }>;
    full_element: {
      id: number;
      text: string;
      resourceId: string;
      contentDesc: string;
      className: string;
      bounds: string;
      clickable: boolean;
      enabled: boolean;
      tag?: string;
    };
  }>;
}

// Verifications grouped by verification type
export interface Verifications {
  [verificationType: string]: Verification[]; // Verification type as category
}

// =====================================================
// REFERENCE TYPES
// =====================================================

// Area coordinates for image references
export interface ReferenceArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Individual reference item
export interface Reference {
  type: 'image' | 'text';
  url: string;
  area: ReferenceArea;
  created_at: string;
  updated_at: string;
  // Text reference specific fields
  text?: string;
  font_size?: number;
  confidence?: number;
}

// References organized by filename within a model
export interface ModelReferences {
  [filename: string]: Reference;
}

// Complete resource configuration structure
export interface ResourceConfig {
  resources: {
    [deviceModel: string]: ModelReferences;
  };
}

// Extended reference with computed fields for frontend use
export interface ReferenceImage extends Reference {
  name: string; // Computed from filename
  model: string; // Computed from context
  filename: string; // Added for convenience
}
