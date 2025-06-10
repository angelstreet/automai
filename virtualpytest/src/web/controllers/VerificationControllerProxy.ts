/**
 * Verification Controller Proxy
 * 
 * Provides a consistent interface for verification operations.
 * Handles text verification, image verification, ADB verification, and reference management.
 * Part of the smart controller architecture migration.
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
}

interface TextAutoDetectRequest {
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

interface TextAutoDetectResponse {
  success: boolean;
  text?: string;
  fontSize?: number;
  confidence?: number;
  detectedLanguage?: string;
  detectedLanguageName?: string;
  languageConfidence?: number;
  error?: string;
}

interface VerificationExecuteRequest {
  verifications: any[];
  node_id?: string;
  model: string;
}

interface VerificationExecuteResponse {
  success: boolean;
  results?: any[];
  error?: string;
}

export class VerificationControllerProxy {
  private hostUrl: string;
  private capabilities: string[];

  constructor(host: any, buildHostUrl: (hostId: string, endpoint: string) => string) {
    this.hostUrl = buildHostUrl(host.id, '').replace(/\/+$/, ''); // Remove trailing slashes
    this.capabilities = host.capabilities || host.controller_types || [];
    
    console.log(`[@controller:VerificationControllerProxy] Initialized with host: ${this.hostUrl}`);
    console.log(`[@controller:VerificationControllerProxy] Capabilities: ${this.capabilities.join(', ')}`);
  }

  /**
   * Get available verification actions/templates
   */
  async getVerificationActions(): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Getting verification actions`);
      
      const response = await fetch(`${this.hostUrl}/host/verification/actions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Get actions failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to get verification actions: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[@controller:VerificationControllerProxy] Got ${result.verifications?.length || 0} verification actions`);
      
      return {
        success: true,
        data: result.verifications || [],
      };
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Get actions error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get verification actions',
      };
    }
  }

  /**
   * Save a verification reference (screenshot area with metadata)
   */
  async saveReference(request: VerificationSaveRequest): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Saving reference: ${request.name}`);
      console.log(`[@controller:VerificationControllerProxy] Model: ${request.model}, Area:`, request.area);
      
      const response = await fetch(`${this.hostUrl}/host/verification/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Save reference failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to save reference: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[@controller:VerificationControllerProxy] Reference saved successfully: ${request.name}`);
      
      return {
        success: result.success || true,
        data: result,
      };
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Save reference error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to save reference',
      };
    }
  }

  /**
   * Auto-detect text in a specified area
   */
  async autoDetectText(request: TextAutoDetectRequest): Promise<TextAutoDetectResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Auto-detecting text in area:`, request.area);
      console.log(`[@controller:VerificationControllerProxy] Source: ${request.source_path}, Filter: ${request.image_filter}`);
      
      const response = await fetch(`${this.hostUrl}/host/verification/text/auto-detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Auto-detect text failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to auto-detect text: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@controller:VerificationControllerProxy] Text detected: "${result.text}" (confidence: ${result.confidence}%)`);
      } else {
        console.log(`[@controller:VerificationControllerProxy] Text detection failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Auto-detect text error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to auto-detect text',
      };
    }
  }

  /**
   * Execute verification batch (multiple verifications at once)
   */
  async executeVerificationBatch(request: VerificationExecuteRequest): Promise<VerificationExecuteResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Executing verification batch with ${request.verifications.length} verifications`);
      console.log(`[@controller:VerificationControllerProxy] Model: ${request.model}, Node ID: ${request.node_id}`);
      
      const response = await fetch(`${this.hostUrl}/host/verification/execute-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Execute batch failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to execute verification batch: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      
      if (result.success) {
        const passedCount = result.results?.filter((r: any) => r.success).length || 0;
        console.log(`[@controller:VerificationControllerProxy] Batch execution completed: ${passedCount}/${request.verifications.length} passed`);
      } else {
        console.log(`[@controller:VerificationControllerProxy] Batch execution failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Execute batch error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to execute verification batch',
      };
    }
  }

  /**
   * Execute a single verification
   */
  async executeVerification(verification: any, model: string): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Executing single verification: ${verification.id}`);
      
      const response = await fetch(`${this.hostUrl}/host/verification/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verification,
          model,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Execute verification failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to execute verification: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[@controller:VerificationControllerProxy] Verification executed: ${result.success ? 'PASSED' : 'FAILED'}`);
      
      return result;
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Execute verification error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to execute verification',
      };
    }
  }

  /**
   * Get verification status/health
   */
  async getStatus(): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Getting verification status`);
      
      const response = await fetch(`${this.hostUrl}/host/verification/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Get status failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to get verification status: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[@controller:VerificationControllerProxy] Status retrieved: ${result.status || 'unknown'}`);
      
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Get status error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get verification status',
      };
    }
  }

  /**
   * Get list of available reference images/texts
   */
  async getReferences(model: string): Promise<VerificationResponse> {
    try {
      console.log(`[@controller:VerificationControllerProxy] Getting references for model: ${model}`);
      
      const response = await fetch(`${this.hostUrl}/host/verification/references?model=${encodeURIComponent(model)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[@controller:VerificationControllerProxy] Get references failed: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `Failed to get references: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();
      console.log(`[@controller:VerificationControllerProxy] Got ${result.references?.length || 0} references`);
      
      return {
        success: true,
        data: result.references || [],
      };
    } catch (error: any) {
      console.error(`[@controller:VerificationControllerProxy] Get references error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get references',
      };
    }
  }

  /**
   * Get controller information for debugging
   */
  getControllerInfo(): Record<string, any> {
    return {
      type: 'verification',
      hostUrl: this.hostUrl,
      capabilities: this.capabilities,
      availableMethods: [
        'getVerificationActions',
        'saveReference', 
        'autoDetectText',
        'executeVerificationBatch',
        'executeVerification',
        'getStatus',
        'getReferences',
      ],
    };
  }
} 