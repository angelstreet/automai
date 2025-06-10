/**
 * Verification Controller Proxy
 * 
 * Provides a consistent interface for verification operations.
 * Routes to appropriate host or server endpoints based on verification architecture:
 * - Host endpoints: For resource access (images, references, execution)
 * - Server endpoints: For orchestration (actions, routing)
 */

// Response interfaces
interface VerificationResponse {
  success: boolean;
  error?: string;
  data?: any;
}

interface VerificationAction {
  id: string;
  label: string;
  command: string;
  params: any;
  description: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface VerificationSaveRequest {
  name: string;
  model: string;
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenshot_path: string;
  verification_type?: 'image' | 'text';
}

interface VerificationBatchRequest {
  verifications: any[];
  model: string;
  node_id: string;
  source_filename?: string;
}

interface AutoDetectTextRequest {
  model: string;
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  source_path: string;
  image_filter?: string;
}

export class VerificationControllerProxy {
  private hostUrl: string;
  private serverUrl: string;
  private capabilities: string[];

  constructor(host: any, buildHostUrl: (hostId: string, endpoint: string) => string) {
    this.hostUrl = buildHostUrl(host.id, '').replace(/\/+$/, ''); // Remove trailing slashes
    // For server endpoints, we need to use the main server URL pattern
    this.serverUrl = this.hostUrl.replace(/\/hosts\/[^\/]+$/, ''); // Remove host-specific part for server calls
    this.capabilities = host.capabilities || host.controller_types || [];
    
    console.log(`[@controller:VerificationControllerProxy] Initialized with host: ${this.hostUrl}`);
    console.log(`[@controller:VerificationControllerProxy] Server URL: ${this.serverUrl}`);
    console.log(`[@controller:VerificationControllerProxy] Capabilities: ${this.capabilities.join(', ')}`);
  }

  /**
   * Get available verification actions from server (orchestration endpoint)
   * 
   * @returns Promise<VerificationResponse> Available verification actions by type
   */
  async getVerificationActions(): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Getting verification actions from server`);
      
      // Use server endpoint for getting available actions
      const url = `${this.serverUrl}/server/verification/actions`;
      
      console.log(`[@controller:VerificationControllerProxy] Calling: GET ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@controller:VerificationControllerProxy] Successfully retrieved verification actions`);
        return { success: true, data: result.verifications };
      } else {
        throw new Error(result.error || 'Failed to get verification actions');
      }

    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Get verification actions failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save verification reference on host (resource access endpoint)
   * 
   * @param request Reference save request
   * @returns Promise<VerificationResponse> Save result
   */
  async saveReference(request: VerificationSaveRequest): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Saving reference: ${request.name}`);
      
      // Determine verification type (default to image if not specified)
      const verificationType = request.verification_type || 'image';
      
      // Use appropriate host endpoint based on verification type
      const endpoint = verificationType === 'text' 
        ? '/host/verification/text/save-resource'
        : '/host/verification/image/save-resource';
      
      const url = `${this.hostUrl}${endpoint}`;
      
      console.log(`[@controller:VerificationControllerProxy] Calling: POST ${url}`);
      
      // Build request payload matching expected backend format
      const payload = {
        reference_name: request.name,
        model: request.model,
        area: request.area,
        source_filename: request.screenshot_path.split('/').pop(), // Extract filename from path
        verification_type: verificationType
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@controller:VerificationControllerProxy] Successfully saved reference: ${request.name}`);
        return { success: true, data: result };
      } else {
        throw new Error(result.error || 'Failed to save reference');
      }

    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Save reference failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute batch verification on host (execution endpoint)
   * 
   * @param request Batch verification request
   * @returns Promise<VerificationResponse> Execution results
   */
  async executeVerificationBatch(request: VerificationBatchRequest): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Executing batch verification with ${request.verifications.length} verifications`);
      
      // Use host endpoint for batch execution (maps to existing /stream/execute-batch-verification)
      const url = `${this.hostUrl}/stream/execute-batch-verification`;
      
      console.log(`[@controller:VerificationControllerProxy] Calling: POST ${url}`);
      
      // Build request payload matching expected backend format
      const payload = {
        verifications: request.verifications,
        source_filename: request.source_filename || 'current_screenshot.jpg',
        model: request.model
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success !== undefined) { // Can be true or false
        console.log(`[@controller:VerificationControllerProxy] Batch verification completed: ${result.passed_count}/${result.total_count} passed`);
        return { success: true, data: result };
      } else {
        throw new Error(result.error || 'Batch verification failed');
      }

    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Execute verification batch failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-detect text in specified area using OCR on host
   * 
   * @param request Text auto-detection request
   * @returns Promise<VerificationResponse> Detected text data
   */
  async autoDetectText(request: AutoDetectTextRequest): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Auto-detecting text in area`);
      
      // Use host endpoint for text auto-detection (this endpoint exists and is correct)
      const url = `${this.hostUrl}/host/verification/text/auto-detect`;
      
      console.log(`[@controller:VerificationControllerProxy] Calling: POST ${url}`);
      
      // Build request payload matching expected backend format
      const payload = {
        source_path: request.source_path,
        area: request.area,
        model: request.model,
        image_filter: request.image_filter || 'none'
      };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@controller:VerificationControllerProxy] Text auto-detection successful`);
        return { success: true, data: result };
      } else {
        throw new Error(result.error || 'Text auto-detection failed');
      }

    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Auto-detect text failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get verification controller capabilities
   * 
   * @returns string[] List of controller capabilities
   */
  getCapabilities(): string[] {
    return this.capabilities;
  }

  /**
   * Get controller information
   * 
   * @returns object Controller information
   */
  getControllerInfo() {
    return {
      type: 'verification',
      hostUrl: this.hostUrl,
      serverUrl: this.serverUrl,
      capabilities: this.capabilities,
      version: '1.0.0'
    };
  }
} 