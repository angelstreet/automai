/**
 * Node Verification Types
 *
 * UI-specific verification format for components that need to display
 * and interact with verifications in the interface.
 */

export interface NodeVerification {
  id: string; // UI compatibility: same as command
  label: string; // UI display name
  command: string; // Required: command to execute
  controller_type: 'text' | 'image' | 'adb';
  params: Record<string, any>; // Required: parameters (can be empty {})
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
