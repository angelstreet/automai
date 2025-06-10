/**
 * Verification Controller Proxy
 * 
 * Provides a consistent interface for verification operations.
 * Routes to appropriate host or server endpoints based on verification architecture:
 * - Host endpoints: For resource access (images, references, execution)
 * - Server endpoints: For orchestration (actions, routing)
 */

import { BaseControllerProxy, ControllerResponse } from './BaseControllerProxy';

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

export class VerificationControllerProxy extends BaseControllerProxy {
  constructor(host: any, buildHostUrl: (hostId: string, endpoint: string) => string) {
    super(host, buildHostUrl, 'Verification');
    console.log(`[@controller:VerificationControllerProxy] Verification controller initialized for host: ${host.id}`);
  }

  /**
   * Get available verification actions from server (orchestration endpoint)
   * 
   * @returns Promise<VerificationResponse> List of available verification actions
   */
  async getVerificationActions(): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Getting verification actions from server`);
    
    // Use server endpoint for verification actions (orchestration)
    const url = `${this.serverUrl}/server/verification/actions`;
    const response = await this.executeRequest<{verifications: VerificationAction[]}>('GET', url);
    
    if (response.success && response.data?.verifications) {
      console.log(`[@controller:VerificationControllerProxy] Successfully retrieved verification actions`);
      return { success: true, data: response.data.verifications };
    } else {
      const error = `Get verification actions failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Crop area from screenshot for verification reference creation
   * 
   * @param request Crop request parameters
   * @returns Promise<VerificationResponse> Cropped image data
   */
  async cropArea(request: {
    source_filename: string;
    area: { x: number; y: number; width: number; height: number };
    reference_name: string;
  }): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Cropping area for reference: ${request.reference_name}`);
    
    // Fixed: Use correct host/verification naming convention
    const url = this.buildHostUrl(this.host.id, '/host/verification/image/crop-area');
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Successfully cropped area`);
      return { success: true, data: response.data };
    } else {
      const error = `Crop area failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Process area with additional image processing (autocrop, background removal)
   * 
   * @param request Process request parameters
   * @returns Promise<VerificationResponse> Processed image data
   */
  async processArea(request: {
    source_filename: string;
    area: { x: number; y: number; width: number; height: number };
    reference_name: string;
    autocrop?: boolean;
    remove_background?: boolean;
  }): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Processing area for reference: ${request.reference_name}`);
    
    // Fixed: Use correct host/verification naming convention
    const url = this.buildHostUrl(this.host.id, '/host/verification/image/process-area');
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Successfully processed area`);
      return { success: true, data: response.data };
    } else {
      const error = `Process area failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Save verification reference on host (resource access endpoint)
   * 
   * Note: This method expects the image to already be cropped. Use cropArea() first.
   * 
   * @param request Reference save request
   * @returns Promise<VerificationResponse> Save result
   */
  async saveReference(request: VerificationSaveRequest): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Saving reference: ${request.name}`);
    
    // Determine verification type (default to image if not specified)
    const verificationType = request.verification_type || 'image';
    
    // Fixed: Use correct host/verification naming convention
    const endpoint = verificationType === 'text' 
      ? '/host/verification/text/save-resource'
      : '/host/verification/image/save-resource';
    
    const url = this.buildHostUrl(this.host.id, endpoint);
    
    // Build request payload matching expected backend format
    // Note: For image save-resource, screenshot_path should be the cropped file path
    const payload = verificationType === 'text' 
      ? {
          name: request.name,  // Text save-resource expects 'name', not 'reference_name'
          model: request.model,
          text: request.screenshot_path, // For text, screenshot_path contains the detected text
          area: request.area,
          font_size: 12.0, // Default font size
          confidence: 0.8  // Default confidence
        }
      : {
          cropped_filename: request.screenshot_path.split('/').pop(), // Extract filename for image save
          reference_name: request.name,
          model: request.model,
          area: request.area,
          verification_type: verificationType
        };
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(payload)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Successfully saved reference: ${request.name}`);
      return { success: true, data: response.data };
    } else {
      const error = `Save reference failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Execute single verification on host (execution endpoint)
   * 
   * @param request Single verification request
   * @returns Promise<VerificationResponse> Execution result
   */
  async executeVerification(request: {
    verification: any;
    source_filename: string;
    model: string;
  }): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Executing single verification`);
    
    // Fixed: Use correct host/verification naming convention
    const url = this.buildHostUrl(this.host.id, '/host/verification/execute');
    
    // Build request payload matching expected backend format
    const payload = {
      verification: request.verification,
      source_filename: request.source_filename,
      model: request.model
    };
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(payload)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Single verification completed successfully`);
      return { success: true, data: response.data };
    } else {
      const error = `Execute verification failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Execute batch verification on host (execution endpoint)
   * 
   * @param request Batch verification request
   * @returns Promise<VerificationResponse> Execution results
   */
  async executeVerificationBatch(request: VerificationBatchRequest): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Executing batch verification with ${request.verifications.length} verifications`);
    
    // Fixed: Use correct host/verification naming convention
    const url = this.buildHostUrl(this.host.id, '/host/verification/execute-batch');
    
    // Build request payload matching expected backend format
    const payload = {
      verifications: request.verifications,
      source_filename: request.source_filename || 'current_screenshot.jpg',
      model: request.model
    };
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(payload)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Batch verification completed successfully`);
      return { success: true, data: response.data };
    } else {
      const error = `Execute verification batch failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Auto-detect text in specified area using OCR on host
   * 
   * @param request Text auto-detection request
   * @returns Promise<VerificationResponse> Detected text data
   */
  async autoDetectText(request: AutoDetectTextRequest): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Auto-detecting text in area`);
    
    // Fixed: Use correct host/verification naming convention
    const url = this.buildHostUrl(this.host.id, '/host/verification/text/auto-detect');
    
    // Build request payload matching expected backend format
    const payload = {
      source_filename: request.source_path.split('/').pop(), // Extract filename from path
      area: request.area,
      model: request.model,
      image_filter: request.image_filter || 'none'
    };
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(payload)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Text auto-detection successful`);
      return { success: true, data: response.data };
    } else {
      const error = `Auto-detect text failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Ensure reference image is available for verification
   * 
   * @param request Availability request parameters
   * @returns Promise<VerificationResponse> Availability status
   */
  async ensureReferenceAvailability(request: {
    reference_name: string;
    model: string;
  }): Promise<VerificationResponse> {
    console.log(`[@controller:VerificationControllerProxy] Ensuring reference availability: ${request.reference_name}`);
    
    // Fixed: Use correct host/verification naming convention
    const url = this.buildHostUrl(this.host.id, '/host/verification/image/ensure-availability');
    
    const response = await this.executeRequest('POST', url, {
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      console.log(`[@controller:VerificationControllerProxy] Reference availability ensured successfully`);
      return { success: true, data: response.data };
    } else {
      const error = `Ensure reference availability failed: ${response.error || 'Unknown error'}`;
      console.error(`[@controller:VerificationControllerProxy] ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Get verification-specific capabilities
   */
  getVerificationCapabilities(): string[] {
    return this.capabilities.filter(cap => 
      cap.includes('verification') || 
      cap.includes('text') || 
      cap.includes('ocr') ||
      cap.includes('image')
    );
  }
} 