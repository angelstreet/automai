/**
 * Navigation Hooks
 * Consolidated navigation-related hooks for the Navigation page
 */

// Re-export all navigation hooks from the navigation subdirectory
export { useNavigationState } from '../navigation/useNavigationState';
export { useConnectionRules } from '../navigation/useConnectionRules';
export { useNavigationHistory } from '../navigation/useNavigationHistory';
export { useNavigationCRUD } from '../navigation/useNavigationCRUD';
export { useNodeEdgeManagement } from '../navigation/useNodeEdgeManagement';
export { useNavigationConfig } from '../navigation/useNavigationConfig';

// Main navigation editor hook is now in Navigation_Editor.ts
// Import from there if needed:
// export { default as useNavigationEditor } from './Navigation_Editor'; 