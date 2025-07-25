/**
 * Validation Color Configuration
 * Centralized color management for React Flow nodes and edges based on validation status
 */

// Node type base colors - these define the visual identity of different node types
export const NODE_TYPE_COLORS = {
  entry: {
    background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
    border: '#ffc107',
    textColor: '#ffffff',
    badgeColor: '#ffc107',
  },
  menu: {
    background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
    border: '#ffc107',
    textColor: '#e65100',
    badgeColor: '#ff8f00',
  },
  screen: {
    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    border: '#2196f3',
    textColor: '#0d47a1',
    badgeColor: '#1976d2',
  },
  dialog: {
    background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    border: '#9c27b0',
    textColor: '#4a148c',
    badgeColor: '#7b1fa2',
  },
  popup: {
    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
    border: '#ff9800',
    textColor: '#e65100',
    badgeColor: '#f57c00',
  },
  overlay: {
    background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
    border: '#4caf50',
    textColor: '#1b5e20',
    badgeColor: '#388e3c',
  },
} as const;

// UI Badge colors for different badge types
export const UI_BADGE_COLORS = {
  root: {
    background: '#d32f2f',
    textColor: '#ffffff',
  },
  menu: {
    background: '#ff8f00',
    textColor: '#ffffff',
  },
  entry: {
    background: '#ffc107',
    textColor: '#ffffff',
  },
} as const;

// Status colors based on validation confidence levels
export const VALIDATION_STATUS_COLORS = {
  untested: {
    border: '#9e9e9e',
    background: 'rgba(158, 158, 158, 0.1)',
    handle: '#9e9e9e',
    glow: 'rgba(158, 158, 158, 0.3)',
    textColor: '#757575',
  },
  testing: {
    border: '#2196f3',
    background: 'rgba(33, 150, 243, 0.15)',
    handle: '#2196f3',
    glow: 'rgba(33, 150, 243, 0.6)',
    textColor: '#1976d2',
    animation: 'testing-pulse 2s ease-in-out infinite',
  },
  high: {
    // >70% confidence
    border: '#4caf50',
    background: 'rgba(76, 175, 80, 0.1)',
    handle: '#4caf50',
    glow: 'rgba(76, 175, 80, 0.4)',
    textColor: '#2e7d32',
  },
  medium: {
    // 50-70% confidence
    border: '#ff9800',
    background: 'rgba(255, 152, 0, 0.1)',
    handle: '#ff9800',
    glow: 'rgba(255, 152, 0, 0.4)',
    textColor: '#f57c00',
  },
  low: {
    // <50% confidence
    border: '#f44336',
    background: 'rgba(244, 67, 54, 0.1)',
    handle: '#f44336',
    glow: 'rgba(244, 67, 54, 0.4)',
    textColor: '#d32f2f',
  },
} as const;

// Edge colors for different validation states
export const EDGE_COLORS = {
  untested: {
    stroke: '#9e9e9e',
    strokeWidth: 3,
    strokeDasharray: '',
    opacity: 0.6,
  },
  testing: {
    stroke: '#2196f3',
    strokeWidth: 3,
    strokeDasharray: '',
    opacity: 1,
    animation: 'edge-pulse 1.5s ease-in-out infinite',
  },
  high: {
    stroke: '#4caf50',
    strokeWidth: 3,
    strokeDasharray: '',
    opacity: 1,
  },
  medium: {
    stroke: '#ff9800',
    strokeWidth: 3,
    strokeDasharray: '',
    opacity: 1,
  },
  low: {
    stroke: '#f44336',
    strokeWidth: 3,
    strokeDasharray: '5,5',
    opacity: 1,
  },
  entry: {
    stroke: '#ffc107',
    strokeWidth: 3,
    strokeDasharray: '',
    opacity: 1,
  },
} as const;

// Handle colors for different positions and states
export const HANDLE_COLORS = {
  // Left handles (horizontal navigation)
  leftTop: {
    untested: 'linear-gradient(135deg, #90caf9, #64b5f6)',
    testing: 'linear-gradient(135deg, #2196f3, #42a5f5)',
    high: 'linear-gradient(135deg, #81c784, #66bb6a)',
    medium: 'linear-gradient(135deg, #ffb74d, #ffa726)',
    low: 'linear-gradient(135deg, #ef9a9a, #e57373)',
  },
  leftBottom: {
    untested: 'linear-gradient(135deg, #ff8a65, #ff7043)',
    testing: 'linear-gradient(135deg, #2196f3, #42a5f5)',
    high: 'linear-gradient(135deg, #66bb6a, #4caf50)',
    medium: 'linear-gradient(135deg, #ffa726, #ff9800)',
    low: 'linear-gradient(135deg, #e57373, #f44336)',
  },
  // Right handles (horizontal navigation)
  rightTop: {
    untested: 'linear-gradient(135deg, #42a5f5, #1976d2)',
    testing: 'linear-gradient(135deg, #2196f3, #1565c0)',
    high: 'linear-gradient(135deg, #4caf50, #388e3c)',
    medium: 'linear-gradient(135deg, #ff9800, #f57c00)',
    low: 'linear-gradient(135deg, #f44336, #d32f2f)',
  },
  rightBottom: {
    untested: 'linear-gradient(135deg, #ef9a9a, #e57373)',
    testing: 'linear-gradient(135deg, #2196f3, #42a5f5)',
    high: 'linear-gradient(135deg, #81c784, #66bb6a)',
    medium: 'linear-gradient(135deg, #ffb74d, #ffa726)',
    low: 'linear-gradient(135deg, #e57373, #ef5350)',
  },
  // Top handles (menu navigation)
  topLeft: {
    untested: 'linear-gradient(135deg, #ba68c8, #9c27b0)',
    testing: 'linear-gradient(135deg, #2196f3, #1976d2)',
    high: 'linear-gradient(135deg, #66bb6a, #4caf50)',
    medium: 'linear-gradient(135deg, #ffa726, #ff9800)',
    low: 'linear-gradient(135deg, #ef5350, #f44336)',
  },
  topRight: {
    untested: 'linear-gradient(135deg, #a5d6a7, #81c784)',
    testing: 'linear-gradient(135deg, #2196f3, #42a5f5)',
    high: 'linear-gradient(135deg, #4caf50, #388e3c)',
    medium: 'linear-gradient(135deg, #ff9800, #f57c00)',
    low: 'linear-gradient(135deg, #f44336, #d32f2f)',
  },
  // Bottom handles (menu navigation)
  bottomLeft: {
    untested: 'linear-gradient(135deg, #ce93d8, #ba68c8)',
    testing: 'linear-gradient(135deg, #2196f3, #42a5f5)',
    high: 'linear-gradient(135deg, #81c784, #66bb6a)',
    medium: 'linear-gradient(135deg, #ffb74d, #ffa726)',
    low: 'linear-gradient(135deg, #ef9a9a, #e57373)',
  },
  bottomRight: {
    untested: 'linear-gradient(135deg, #4caf50, #66bb6a)',
    testing: 'linear-gradient(135deg, #2196f3, #1976d2)',
    high: 'linear-gradient(135deg, #388e3c, #2e7d32)',
    medium: 'linear-gradient(135deg, #f57c00, #ef6c00)',
    low: 'linear-gradient(135deg, #d32f2f, #c62828)',
  },
} as const;

// Animation configurations
export const VALIDATION_ANIMATIONS = {
  testingPulse: {
    name: 'testing-pulse',
    duration: '2s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: `
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.02);
      }
      100% {
        transform: scale(1);
      }
    `,
  },
  edgePulse: {
    name: 'edge-pulse',
    duration: '1.5s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: `
      0% {
        opacity: 0.8;
        stroke-width: var(--base-width);
      }
      50% {
        opacity: 1;
        stroke-width: calc(var(--base-width) + 1);
      }
      100% {
        opacity: 0.8;
        stroke-width: var(--base-width);
      }
    `,
  },
  handleGlow: {
    name: 'handle-glow',
    duration: '2s',
    timing: 'ease-in-out',
    iteration: 'infinite',
    keyframes: `
      0% {
        opacity: 0.8;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.8;
      }
    `,
  },
} as const;

// Confidence level thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.49,
} as const;

// Type definitions for validation status
export type ValidationStatus = 'untested' | 'testing' | 'high' | 'medium' | 'low';
export type NodeType = keyof typeof NODE_TYPE_COLORS;
export type HandlePosition = keyof typeof HANDLE_COLORS;

// Utility function to determine validation status from confidence
export function getValidationStatusFromConfidence(confidence: number): ValidationStatus {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

// Utility function to get CSS custom properties for animations
export function getAnimationCSS(): string {
  return `
    @keyframes ${VALIDATION_ANIMATIONS.testingPulse.name} {
      ${VALIDATION_ANIMATIONS.testingPulse.keyframes}
    }
    
    @keyframes ${VALIDATION_ANIMATIONS.edgePulse.name} {
      ${VALIDATION_ANIMATIONS.edgePulse.keyframes}
    }
    
    @keyframes ${VALIDATION_ANIMATIONS.handleGlow.name} {
      ${VALIDATION_ANIMATIONS.handleGlow.keyframes}
    }
    
    .node-testing {
      animation: ${VALIDATION_ANIMATIONS.testingPulse.name} ${VALIDATION_ANIMATIONS.testingPulse.duration} ${VALIDATION_ANIMATIONS.testingPulse.timing} ${VALIDATION_ANIMATIONS.testingPulse.iteration};
    }
    
    .edge-testing {
      animation: ${VALIDATION_ANIMATIONS.edgePulse.name} ${VALIDATION_ANIMATIONS.edgePulse.duration} ${VALIDATION_ANIMATIONS.edgePulse.timing} ${VALIDATION_ANIMATIONS.edgePulse.iteration};
    }
    
    .handle-testing {
      animation: ${VALIDATION_ANIMATIONS.handleGlow.name} ${VALIDATION_ANIMATIONS.handleGlow.duration} ${VALIDATION_ANIMATIONS.handleGlow.timing} ${VALIDATION_ANIMATIONS.handleGlow.iteration};
    }
  `;
}
