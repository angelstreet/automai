/**
 * Common Base Types - Only unique types that don't belong in specific type files
 *
 * CLEAN ARCHITECTURE: No duplication with other type files
 * - Model types → Models_Types.ts
 * - Device types → Host_Types.ts
 * - Controller types → Controller_Types.ts
 */

// Wizard step interface - unique to common base types (used in device management wizard)
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isValid: boolean;
  isComplete: boolean;
}

/**
 * Generic server response structure for all endpoints
 */
export interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
