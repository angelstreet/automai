// Capture API utility functions

export interface CaptureStartResponse {
  success: boolean;
  error?: string;
  capture_pid?: string;
  remote_capture_dir?: string;
  device_resolution?: any;
  capture_resolution?: string;
  stream_was_active?: boolean;
  message?: string;
}

export interface CaptureStopResponse {
  success: boolean;
  error?: string;
  frames_captured?: number;
  frames_downloaded?: number;
  local_capture_dir?: string;
  capture_duration?: number;
  message?: string;
}

export interface CaptureStatusResponse {
  success: boolean;
  error?: string;
  is_capturing?: boolean;
  duration?: number;
  max_duration?: number;
  fps?: number;
}

export interface LatestFrameResponse {
  success: boolean;
  error?: string;
  frame_path?: string;
  frame_number?: number;
}

export class CaptureApi {
  private buildServerUrl: ((endpoint: string) => string) | null = null;
  private captureInfo: {
    capture_pid?: string;
    remote_capture_dir?: string;
    device_model?: string;
  } | null = null;

  // Initialize with buildServerUrl function from RegistrationContext
  initialize(buildServerUrl: (endpoint: string) => string) {
    this.buildServerUrl = buildServerUrl;
  }

  private getApiBaseUrl(): string {
    if (!this.buildServerUrl) {
      throw new Error('CaptureApi not initialized. Call initialize() with buildServerUrl function first.');
    }
    // Use centralized URL building for capture endpoints
    return this.buildServerUrl('server/capture');
  }

  /**
   * Start capturing frames at 10fps with rolling 30s buffer
   */
  async startCapture(
    videoDevice: string = '/dev/video0',
    deviceModel: string = 'android_mobile'
  ): Promise<CaptureStartResponse> {
    try {
      console.log(`[@util:CaptureApi] Starting capture for device: ${deviceModel}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/capture/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_device: videoDevice,
          device_model: deviceModel,
        }),
      });

      const result: CaptureStartResponse = await response.json();
      
      if (result.success && result.capture_pid && result.remote_capture_dir) {
        // Store capture info for stop operation
        this.captureInfo = {
          capture_pid: result.capture_pid,
          remote_capture_dir: result.remote_capture_dir,
          device_model: deviceModel,
        };
        console.log(`[@util:CaptureApi] Capture started successfully with PID: ${result.capture_pid}`);
      } else {
        console.error(`[@util:CaptureApi] Capture start failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:CaptureApi] Start capture error: ${error}`);
      return {
        success: false,
        error: `Failed to start capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Stop capturing and download frames to local folder
   */
  async stopCapture(): Promise<CaptureStopResponse> {
    try {
      if (!this.captureInfo) {
        return {
          success: false,
          error: 'No active capture session found',
        };
      }

      console.log(`[@util:CaptureApi] Stopping capture PID: ${this.captureInfo.capture_pid}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/capture/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capture_pid: this.captureInfo.capture_pid,
          remote_capture_dir: this.captureInfo.remote_capture_dir,
          device_model: this.captureInfo.device_model,
        }),
      });

      const result: CaptureStopResponse = await response.json();
      
      if (result.success) {
        console.log(`[@util:CaptureApi] Capture stopped successfully. Downloaded ${result.frames_downloaded} frames`);
        // Clear capture info after successful stop
        this.captureInfo = null;
      } else {
        console.error(`[@util:CaptureApi] Capture stop failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:CaptureApi] Stop capture error: ${error}`);
      return {
        success: false,
        error: `Failed to stop capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get current capture status
   */
  async getCaptureStatus(): Promise<CaptureStatusResponse> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/capture/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: CaptureStatusResponse = await response.json();
      
      return result;
    } catch (error) {
      console.error(`[@util:CaptureApi] Get capture status error: ${error}`);
      return {
        success: false,
        error: `Failed to get capture status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get the latest captured frame
   */
  async getLatestFrame(): Promise<LatestFrameResponse> {
    try {
      if (!this.captureInfo) {
        return {
          success: false,
          error: 'No active capture session found',
        };
      }

      const response = await fetch(`${this.getApiBaseUrl()}/capture/latest-frame`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error: ${response.status}`,
        };
      }

      const result: LatestFrameResponse = await response.json();
      return result;
    } catch (error) {
      console.error(`[@util:CaptureApi] Get latest frame error: ${error}`);
      return {
        success: false,
        error: `Failed to get latest frame: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if there's an active capture session
   */
  hasActiveCaptureSession(): boolean {
    return this.captureInfo !== null;
  }

  /**
   * Get current capture info
   */
  getCaptureInfo() {
    return this.captureInfo;
  }

  /**
   * Clear capture info (for cleanup)
   */
  clearCaptureInfo() {
    this.captureInfo = null;
  }
}

// Export a singleton instance for components to use
export const captureApi = new CaptureApi();

export default CaptureApi; 