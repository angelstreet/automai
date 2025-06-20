import { Verification } from '../verification/VerificationTypes';

/**
 * Node verification extends base verification with UI-specific fields
 * Used specifically in navigation nodes
 */
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
