/**
 * Font context type definitions
 */

export type FontSize = 'small' | 'medium' | 'large';

export interface FontContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}
