/**
 * AV Controller Proxy
 * 
 * Simple proxy for audio/video controller operations.
 */

import { BaseControllerProxy, ControllerResponse } from './BaseControllerProxy';

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

export class AVControllerProxy extends BaseControllerProxy {
  constructor(host: any, buildHostUrl: (hostId: string, endpoint: string) => string) {
    super(host, buildHostUrl, 'AV');
    console.log(`[@controller:AVControllerProxy] AV controller initialized for host: ${host.id}`);
  }

  /**
   * Take a screenshot
   */
  async take_screenshot(): Promise<string> {
    console.log(`[@controller:AVControllerProxy] Taking screenshot`);
    
    const url = this.buildHostUrl(this.host.id, '/host/av/screenshot');
    const response = await this.executeRequest<{screenshot_url: string}>('POST', url);
    
    if (response.success && response.data?.screenshot_url) {
      console.log(`[@controller:AVControllerProxy] Screenshot taken successfully: ${response.data.screenshot_url}`);
      return response.data.screenshot_url;
    } else {
      const error = `Screenshot failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:AVControllerProxy] ${error}`);
      throw new Error(error);
    }
  }

  /**
   * Start video recording
   */
  async start_recording(): Promise<void> {
    console.log(`[@controller:AVControllerProxy] Starting video recording`);
    
    const url = this.buildHostUrl(this.host.id, '/host/av/start-recording');
    const response = await this.executeRequest('POST', url);
    
    if (response.success) {
      console.log(`[@controller:AVControllerProxy] Video recording started successfully`);
    } else {
      const error = `Start recording failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:AVControllerProxy] ${error}`);
      throw new Error(error);
    }
  }

  /**
   * Stop video recording
   */
  async stop_recording(): Promise<string> {
    console.log(`[@controller:AVControllerProxy] Stopping video recording`);
    
    const url = this.buildHostUrl(this.host.id, '/host/av/stop-recording');
    const response = await this.executeRequest<{video_path: string}>('POST', url);
    
    if (response.success && response.data?.video_path) {
      console.log(`[@controller:AVControllerProxy] Video recording stopped successfully: ${response.data.video_path}`);
      return response.data.video_path;
    } else {
      const error = `Stop recording failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:AVControllerProxy] ${error}`);
      throw new Error(error);
    }
  }

  /**
   * Get stream URL
   */
  async get_stream_url(): Promise<string> {
    console.log(`[@controller:AVControllerProxy] Getting stream URL`);
    
    const url = this.buildHostUrl(this.host.id, '/host/av/stream-url');
    const response = await this.executeRequest<{stream_url: string}>('GET', url);
    
    if (response.success && response.data?.stream_url) {
      console.log(`[@controller:AVControllerProxy] Stream URL retrieved: ${response.data.stream_url}`);
      return response.data.stream_url;
    } else {
      const error = `Get stream URL failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:AVControllerProxy] ${error}`);
      throw new Error(error);
    }
  }

  /**
   * Stop video stream
   */
  async stop_stream(): Promise<void> {
    console.log(`[@controller:AVControllerProxy] Stopping video stream`);
    
    const url = this.buildHostUrl(this.host.id, '/host/av/stop-stream');
    const response = await this.executeRequest('POST', url);
    
    if (response.success) {
      console.log(`[@controller:AVControllerProxy] Video stream stopped successfully`);
    } else {
      const error = `Stop stream failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:AVControllerProxy] ${error}`);
      throw new Error(error);
    }
  }

  /**
   * Get device resolution
   */
  async get_device_resolution(): Promise<{ width: number; height: number }> {
    console.log(`[@controller:AVControllerProxy] Getting device resolution`);
    
    const url = this.buildHostUrl(this.host.id, '/host/av/resolution');
    const response = await this.executeRequest<{ width: number; height: number }>('GET', url);
    
    if (response.success && response.data) {
      console.log(`[@controller:AVControllerProxy] Device resolution: ${response.data.width}x${response.data.height}`);
      return response.data;
    } else {
      const error = `Get resolution failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:AVControllerProxy] ${error}`);
      throw new Error(error);
    }
  }
}

export default AVControllerProxy; 