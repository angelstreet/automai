// Basic layout configuration interface
export interface LayoutConfig {
  minHeight: string;
  aspectRatio: string;
  objectFit: 'cover' | 'contain' | 'fill';
  isMobileModel: boolean;
}

// Device resolution interface
export interface DeviceResolution {
  width: number;
  height: number;
}
