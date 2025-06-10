/**
 * AV Controller Proxy
 * 
 * Frontend proxy for Audio/Video controller that handles HTTP communication
 * with the host's AV controller endpoints. This provides a consistent interface
 * for frontend components to interact with AV controllers regardless of whether
 * they're running locally or remotely.
 */

// Type definitions for AV controller methods
export interface ScreenshotOptions {
  filename?: string;
}

export interface VideoCaptureOptions {
  duration?: number;
  filename?: string;
  resolution?: string;
  fps?: number;
}

export interface AVStatus {
  success: boolean;
  controller_type: string;
  device_name: string;
  service_name?: string;
  service_status?: string;
  is_streaming: boolean;
  is_capturing: boolean;
  capture_session_id?: string;
  nginx_url?: string;
  message?: string;
  error?: string;
}

export interface StreamUrlResponse {
  success: boolean;
  stream_url?: string;
  error?: string;
}

export interface ScreenshotResponse {
  success: boolean;
  screenshot_url?: string;
  error?: string;
}

export interface VideoCaptureResponse {
  success: boolean;
  session_id?: string;
  error?: string;
}

/**
 * AV Controller Proxy Class
 * 
 * Provides a JavaScript interface that mirrors the Python AV controller
 * interface, but makes HTTP calls to the host endpoints instead of
 * direct method calls.
 */
export class AVControllerProxy {
  private hostDevice: any;
  private buildHostUrl: (hostId: string, endpoint: string) => string;

  constructor(
    hostDevice: any,
    buildHostUrl: (hostId: string, endpoint: string) => string
  ) {
    this.hostDevice = hostDevice;
    this.buildHostUrl = buildHostUrl;
    
    console.log(`[@controller:AVControllerProxy] Created for host: ${hostDevice.name} (${hostDevice.id})`);
  }

  /**
   * Take a screenshot using the AV controller
   * 
   * @param options Screenshot options (filename, etc.)
   * @returns Promise<string> Screenshot URL or path
   */
  async take_screenshot(options: ScreenshotOptions = {}): Promise<string> {
    try {
      console.log(`[@controller:AVControllerProxy] Taking screenshot for host: ${this.hostDevice.name}`);
      
      const endpoint = '/host/av/screenshot';
      const url = this.buildHostUrl(this.hostDevice.id, endpoint);
      
      console.log(`[@controller:AVControllerProxy] Calling screenshot endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ScreenshotResponse = await response.json();
      
      if (result.success && result.screenshot_url) {
        console.log(`[@controller:AVControllerProxy] Screenshot taken successfully: ${result.screenshot_url}`);
        return result.screenshot_url;
      } else {
        throw new Error(result.error || 'Screenshot failed - no URL returned');
      }

    } catch (error: any) {
      console.error(`[@controller:AVControllerProxy] Screenshot failed:`, error);
      throw new Error(`Screenshot failed: ${error.message}`);
    }
  }

  /**
   * Get the current status of the AV controller
   * 
   * @returns Promise<AVStatus> Current controller status
   */
  async get_status(): Promise<AVStatus> {
    try {
      console.log(`[@controller:AVControllerProxy] Getting status for host: ${this.hostDevice.name}`);
      
      const endpoint = '/host/av/status';
      const url = this.buildHostUrl(this.hostDevice.id, endpoint);
      
      console.log(`[@controller:AVControllerProxy] Calling status endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: AVStatus = await response.json();
      
      console.log(`[@controller:AVControllerProxy] Status retrieved:`, result);
      return result;

    } catch (error: any) {
      console.error(`[@controller:AVControllerProxy] Get status failed:`, error);
      throw new Error(`Get status failed: ${error.message}`);
    }
  }

  /**
   * Get the stream URL from the AV controller
   * 
   * @returns Promise<string> Stream URL
   */
  async get_stream_url(): Promise<string> {
    try {
      console.log(`[@controller:AVControllerProxy] Getting stream URL for host: ${this.hostDevice.name}`);
      
      const endpoint = '/host/av/stream-url';
      const url = this.buildHostUrl(this.hostDevice.id, endpoint);
      
      console.log(`[@controller:AVControllerProxy] Calling stream URL endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: StreamUrlResponse = await response.json();
      
      if (result.success && result.stream_url) {
        console.log(`[@controller:AVControllerProxy] Stream URL retrieved: ${result.stream_url}`);
        return result.stream_url;
      } else {
        throw new Error(result.error || 'Stream URL not available');
      }

    } catch (error: any) {
      console.error(`[@controller:AVControllerProxy] Get stream URL failed:`, error);
      throw new Error(`Get stream URL failed: ${error.message}`);
    }
  }

  /**
   * Start video capture
   * 
   * @param options Video capture options (duration, filename, etc.)
   * @returns Promise<boolean> Success status
   */
  async start_video_capture(options: VideoCaptureOptions = {}): Promise<boolean> {
    try {
      console.log(`[@controller:AVControllerProxy] Starting video capture for host: ${this.hostDevice.name}`);
      
      const endpoint = '/host/av/start-capture';
      const url = this.buildHostUrl(this.hostDevice.id, endpoint);
      
      console.log(`[@controller:AVControllerProxy] Calling start capture endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: VideoCaptureResponse = await response.json();
      
      if (result.success) {
        console.log(`[@controller:AVControllerProxy] Video capture started successfully`);
        if (result.session_id) {
          console.log(`[@controller:AVControllerProxy] Capture session ID: ${result.session_id}`);
        }
        return true;
      } else {
        throw new Error(result.error || 'Video capture start failed');
      }

    } catch (error: any) {
      console.error(`[@controller:AVControllerProxy] Start video capture failed:`, error);
      throw new Error(`Start video capture failed: ${error.message}`);
    }
  }

  /**
   * Stop video capture
   * 
   * @returns Promise<boolean> Success status
   */
  async stop_video_capture(): Promise<boolean> {
    try {
      console.log(`[@controller:AVControllerProxy] Stopping video capture for host: ${this.hostDevice.name}`);
      
      const endpoint = '/host/av/stop-capture';
      const url = this.buildHostUrl(this.hostDevice.id, endpoint);
      
      console.log(`[@controller:AVControllerProxy] Calling stop capture endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: VideoCaptureResponse = await response.json();
      
      if (result.success) {
        console.log(`[@controller:AVControllerProxy] Video capture stopped successfully`);
        return true;
      } else {
        throw new Error(result.error || 'Video capture stop failed');
      }

    } catch (error: any) {
      console.error(`[@controller:AVControllerProxy] Stop video capture failed:`, error);
      throw new Error(`Stop video capture failed: ${error.message}`);
    }
  }

  /**
   * Get controller information for debugging
   * 
   * @returns Object with controller details
   */
  getControllerInfo() {
    return {
      hostId: this.hostDevice.id,
      hostName: this.hostDevice.name,
      deviceModel: this.hostDevice.model,
      controllerType: 'av',
      proxyType: 'AVControllerProxy'
    };
  }
}

export default AVControllerProxy; 