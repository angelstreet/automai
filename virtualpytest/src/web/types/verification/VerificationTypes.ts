/**
 * Unified Verification Types
 *
 * Simple, standard verification format used across the entire application.
 * A verification is a verification - same everywhere it's used.
 */

// =====================================================
// VERIFICATION PARAMETER TYPES
// =====================================================

// Area coordinates for image references
export interface ReferenceArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Image verification parameters
export interface ImageVerificationParams {
  image_path: string; // Required: reference image filename or path
  threshold?: number; // Optional: match threshold (0.0 to 1.0), default 0.8
  timeout?: number; // Optional: timeout in seconds, default 1.0
  area?: ReferenceArea; // Optional: area to search within
  image_filter?: 'none' | 'greyscale' | 'binary'; // Optional: filter to apply, default 'none'
}

// Text verification parameters
export interface TextVerificationParams {
  text: string; // Required: text pattern to search for
  timeout?: number; // Optional: timeout in seconds, default 10.0
  case_sensitive?: boolean; // Optional: case sensitive matching, default false
  area?: ReferenceArea; // Optional: area to search within
  image_filter?: 'none' | 'greyscale' | 'binary'; // Optional: filter to apply
}

// ADB verification parameters
export interface AdbVerificationParams {
  search_term: string; // Required: element search term
  timeout?: number; // Optional: timeout in seconds, default 10.0
  check_interval?: number; // Optional: check interval in seconds, default 1.0
}

// Union type for all verification parameters
export type VerificationParams =
  | ImageVerificationParams
  | TextVerificationParams
  | AdbVerificationParams;

// =====================================================
// VERIFICATION INTERFACES
// =====================================================

// Base verification interface
interface BaseVerification {
  command: string; // Required: command to execute
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
  // ❌ REMOVED: Confidence tracking moved to database

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

// Specific verification types with typed parameters
export interface ImageVerification extends BaseVerification {
  verification_type: 'image';
  params: ImageVerificationParams;
}

export interface TextVerification extends BaseVerification {
  verification_type: 'text';
  params: TextVerificationParams;
}

export interface AdbVerification extends BaseVerification {
  verification_type: 'adb';
  params: AdbVerificationParams;
}

// Unified verification type (discriminated union)
export type Verification = ImageVerification | TextVerification | AdbVerification;

// Verifications grouped by verification type
export interface Verifications {
  [verificationType: string]: Verification[]; // Verification type as category
}

// =====================================================
// REFERENCE TYPES
// =====================================================

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
