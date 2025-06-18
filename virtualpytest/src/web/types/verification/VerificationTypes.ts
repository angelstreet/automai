/**
 * Unified Verification Types
 *
 * Simple, standard verification format used across the entire application.
 * Controller type serves as the category (no sub-categories needed).
 */

// Simple, minimal verification format
export interface Verification {
  command: string; // Required: command to execute
  params: Record<string, any>; // Required: parameters (can be empty {})
}

// Verifications grouped by controller type
export interface Verifications {
  [controllerType: string]: Verification[]; // Controller type as category
}

// Node verification format for UI components (extends Verification with UI-specific fields)
export interface NodeVerification extends Verification {
  id: string; // UI compatibility: same as command
  label: string; // UI display name
  controller_type: 'text' | 'image' | 'adb';
  description?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  lastRunResult?: boolean;
  resultImageUrl?: string;
  referenceImageUrl?: string;
  lastRunDetails?: string;
}
