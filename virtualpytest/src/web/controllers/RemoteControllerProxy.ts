/**
 * Remote Controller Proxy
 * 
 * Frontend proxy for Remote controller that handles HTTP communication
 * with the host's remote controller endpoints. This provides a consistent interface
 * for frontend components to interact with remote controllers regardless of whether
 * they're running locally or remotely.
 */

// Type definitions for remote controller methods
export interface RemoteCommandOptions {
  command: string;
  params?: Record<string, any>;
}

export interface AndroidElement {
  id: string;
  text: string;
  className: string;
  package: string;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  selected: boolean;
}

export interface AndroidApp {
  packageName: string;
  label: string;
}

export interface RemoteScreenshotResponse {
  success: boolean;
  screenshot?: string;
  error?: string;
}

export interface RemoteCommandResponse {
  success: boolean;
  error?: string;
}

export interface RemoteUIResponse {
  success: boolean;
  screenshot?: string;
  elements?: AndroidElement[];
  error?: string;
}

export interface RemoteAppsResponse {
  success: boolean;
  apps?: AndroidApp[];
  error?: string;
}

export interface RemoteStatus {
  success: boolean;
  controller_type: string;
  device_type: string;
  device_name: string;
  device_ip?: string;
  android_device_id?: string;
  connected: boolean;
  adb_status?: string;
  adb_connected?: boolean;
  message?: string;
  error?: string;
}

export class RemoteControllerProxy {
  private hostDevice: any;
  private buildHostUrl: (hostId: string, endpoint: string) => string;

  constructor(
    hostDevice: any,
    buildHostUrl: (hostId: string, endpoint: string) => string
  ) {
    this.hostDevice = hostDevice;
    this.buildHostUrl = buildHostUrl;
    
    console.log(`[@controller:RemoteControllerProxy] Created proxy for host: ${hostDevice.name} (${hostDevice.id})`);
  }

  /**
   * Send a remote command (key press, app launch, etc.)
   */
  async send_command(command: string, params: Record<string, any> = {}): Promise<RemoteCommandResponse> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Sending command: ${command}`, params);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/command');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          params
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@controller:RemoteControllerProxy] Command sent successfully: ${command}`);
      } else {
        console.error(`[@controller:RemoteControllerProxy] Command failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error sending command:`, error);
      return {
        success: false,
        error: error.message || 'Failed to send remote command'
      };
    }
  }

  /**
   * Take a screenshot using the remote controller
   */
  async take_screenshot(): Promise<string | null> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Taking screenshot`);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/screenshot');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemoteScreenshotResponse = await response.json();
      
      if (result.success && result.screenshot) {
        console.log(`[@controller:RemoteControllerProxy] Screenshot taken successfully`);
        return result.screenshot;
      } else {
        console.error(`[@controller:RemoteControllerProxy] Screenshot failed: ${result.error}`);
        return null;
      }
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error taking screenshot:`, error);
      return null;
    }
  }

  /**
   * Take screenshot and dump UI elements (Android Mobile specific)
   */
  async screenshot_and_dump_ui(): Promise<RemoteUIResponse> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Taking screenshot and dumping UI`);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/screenshot-and-dump-ui');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemoteUIResponse = await response.json();
      
      if (result.success) {
        console.log(`[@controller:RemoteControllerProxy] Screenshot and UI dump completed successfully`);
        if (result.elements) {
          console.log(`[@controller:RemoteControllerProxy] Found ${result.elements.length} UI elements`);
        }
      } else {
        console.error(`[@controller:RemoteControllerProxy] Screenshot and UI dump failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error in screenshot and UI dump:`, error);
      return {
        success: false,
        error: error.message || 'Failed to take screenshot and dump UI'
      };
    }
  }

  /**
   * Get list of installed apps (Android Mobile specific)
   */
  async get_installed_apps(): Promise<AndroidApp[]> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Getting installed apps`);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/get-apps');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemoteAppsResponse = await response.json();
      
      if (result.success && result.apps) {
        console.log(`[@controller:RemoteControllerProxy] Found ${result.apps.length} installed apps`);
        return result.apps;
      } else {
        console.error(`[@controller:RemoteControllerProxy] Get apps failed: ${result.error}`);
        return [];
      }
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error getting apps:`, error);
      return [];
    }
  }

  /**
   * Click on a UI element (Android Mobile specific)
   */
  async click_element(elementId: string): Promise<RemoteCommandResponse> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Clicking element: ${elementId}`);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/click-element');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elementId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemoteCommandResponse = await response.json();
      
      if (result.success) {
        console.log(`[@controller:RemoteControllerProxy] Element clicked successfully: ${elementId}`);
      } else {
        console.error(`[@controller:RemoteControllerProxy] Element click failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error clicking element:`, error);
      return {
        success: false,
        error: error.message || 'Failed to click element'
      };
    }
  }

  /**
   * Tap at specific screen coordinates
   */
  async tap_coordinates(x: number, y: number): Promise<RemoteCommandResponse> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Tapping at coordinates: (${x}, ${y})`);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/tap-coordinates');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x,
          y
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemoteCommandResponse = await response.json();
      
      if (result.success) {
        console.log(`[@controller:RemoteControllerProxy] Tapped successfully at coordinates: (${x}, ${y})`);
      } else {
        console.error(`[@controller:RemoteControllerProxy] Tap failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error tapping coordinates:`, error);
      return {
        success: false,
        error: error.message || 'Failed to tap at coordinates'
      };
    }
  }

  /**
   * Get remote controller status
   */
  async get_status(): Promise<RemoteStatus> {
    try {
      console.log(`[@controller:RemoteControllerProxy] Getting remote controller status`);
      
      const url = this.buildHostUrl(this.hostDevice.id, '/host/remote/status');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: RemoteStatus = await response.json();
      
      if (result.success) {
        console.log(`[@controller:RemoteControllerProxy] Status retrieved successfully`);
      } else {
        console.error(`[@controller:RemoteControllerProxy] Status retrieval failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:RemoteControllerProxy] Error getting status:`, error);
      return {
        success: false,
        controller_type: 'unknown',
        device_type: 'unknown',
        device_name: 'unknown',
        connected: false,
        error: error.message || 'Failed to get remote controller status'
      };
    }
  }

  /**
   * Convenience method: Press a key
   */
  async press_key(key: string): Promise<RemoteCommandResponse> {
    return this.send_command('press_key', { key });
  }

  /**
   * Convenience method: Launch an app
   */
  async launch_app(packageName: string): Promise<RemoteCommandResponse> {
    return this.send_command('launch_app', { package: packageName });
  }

  /**
   * Convenience method: Close an app
   */
  async close_app(packageName: string): Promise<RemoteCommandResponse> {
    return this.send_command('close_app', { package: packageName });
  }

  /**
   * Convenience method: Input text
   */
  async input_text(text: string): Promise<RemoteCommandResponse> {
    return this.send_command('input_text', { text });
  }

  /**
   * Convenience method: Tap at coordinates (alias for tap_coordinates)
   */
  async tap(x: number, y: number): Promise<RemoteCommandResponse> {
    return this.tap_coordinates(x, y);
  }

  /**
   * Get controller information for debugging
   */
  getControllerInfo(): any {
    return {
      hostDevice: {
        id: this.hostDevice.id,
        name: this.hostDevice.name,
        model: this.hostDevice.model
      },
      capabilities: [
        'send_command',
        'take_screenshot', 
        'screenshot_and_dump_ui',
        'get_installed_apps',
        'click_element',
        'tap_coordinates',
        'tap',
        'get_status',
        'press_key',
        'launch_app',
        'close_app',
        'input_text'
      ]
    };
  }
} 