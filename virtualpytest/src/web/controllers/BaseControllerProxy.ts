/**
 * Base Controller Proxy Interface
 * 
 * Simple base class that provides common functionality for all controller proxies.
 */

// Common response interface used by all controllers
export interface ControllerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Base controller proxy class that all controllers extend
export abstract class BaseControllerProxy {
  protected hostUrl: string;
  protected serverUrl?: string;
  protected capabilities: string[];

  constructor(
    protected host: any,
    protected buildHostUrl: (hostId: string, endpoint: string) => string,
    protected controllerType: string
  ) {
    this.hostUrl = buildHostUrl(host.id, '').replace(/\/+$/, '');
    this.serverUrl = this.hostUrl.replace(/\/hosts\/[^\/]+$/, '');
    this.capabilities = host.capabilities || host.controller_types || [];

    console.log(`[@controller:BaseControllerProxy] ${controllerType} controller initialized for host: ${host.id}`);
  }

  /**
   * Execute a request with basic error handling
   */
  protected async executeRequest<T>(
    method: string,
    url: string,
    options: RequestInit = {}
  ): Promise<ControllerResponse<T>> {
    console.log(`[@controller:${this.controllerType}] ${method.toUpperCase()} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log(`[@controller:${this.controllerType}] Request successful`);
      
      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error(`[@controller:${this.controllerType}] Request failed:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get controller capabilities
   */
  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  /**
   * Check if controller has specific capability
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Get basic controller information
   */
  getControllerInfo() {
    return {
      type: this.controllerType,
      hostUrl: this.hostUrl,
      serverUrl: this.serverUrl,
      capabilities: this.getCapabilities()
    };
  }
} 