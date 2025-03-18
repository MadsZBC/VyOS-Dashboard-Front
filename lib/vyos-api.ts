import { v4 as uuidv4 } from 'uuid';

// VyOS API connection parameters
export interface VyosConnectionParams {
  host: string;
  key: string;
  port?: number;
  https?: boolean;
  allowInsecure?: boolean;
}

// Endpoint paths
const API_ENDPOINTS = {
  CONFIGURE: '/configure',
  RETRIEVE: '/retrieve',
  SHOW: '/show',
  CONFIG_FILE: '/config-file',
};

/**
 * VyOS API Client for interacting with VyOS routers
 */
export class VyosApiClient {
  private connectionParams: VyosConnectionParams;
  
  constructor(params: VyosConnectionParams) {
    this.connectionParams = {
      ...params,
      port: params.port || 443,
      https: params.https !== false, // Default to HTTPS
      allowInsecure: params.allowInsecure || false,
    };
  }
  
  /**
   * Generate the base URL for API calls
   */
  private getBaseUrl(): string {
    const { host, port, https } = this.connectionParams;
    const protocol = https ? 'https' : 'http';
    return `${protocol}://${host}:${port}`;
  }
  
  /**
   * Make a request to the VyOS API via our proxy
   * This is the single method used for all API calls
   */
  private async apiRequest(endpoint: string, data: any): Promise<any> {
    try {
      // Create the request payload
      const baseUrl = this.getBaseUrl();
      const apiUrl = `${baseUrl}${endpoint}`;
      
      // Convert data to JSON string - exactly as shown in the Postman example
      // '{"op": "show", "path": ["dhcp", "server", "leases"]}'
      const jsonData = JSON.stringify(data);
      
      // Prepare form data for the proxy - exactly like the Postman example
      const formData = new FormData();
      formData.append('url', apiUrl);
      formData.append('key', this.connectionParams.key);
      formData.append('data', jsonData);
      formData.append('allowInsecure', String(this.connectionParams.allowInsecure));
      
      // Log what we're sending through the proxy (redact sensitive info)
      console.log(`Request to ${endpoint}:`, {
        endpoint,
        data,
        stringifiedData: jsonData,
        allowInsecure: this.connectionParams.allowInsecure
      });
      
      // Send the request through our proxy
      const response = await fetch('/api/proxy', {
        method: 'POST',
        body: formData
      });
      
      // Parse the response
      const result = await response.json();
      
      // Handle error responses
      if (!result.success) {
        console.error('API request failed:', result.error);
        throw new Error(result.error || 'API request failed');
      }
      
      // Return the data
      return result;
    } catch (error) {
      console.error(`VyOS API request error for ${endpoint}:`, error);
      throw error;
    }
  }
  
  /**
   * Configure a single command on the VyOS router
   */
  async configureSingle(path: string[], value?: string, op: 'set' | 'delete' = 'set'): Promise<any> {
    const data: { op: 'set' | 'delete'; path: string[]; value?: string } = { op, path };
    if (value !== undefined && op === 'set') {
      data.value = value;
    }
    
    return this.apiRequest(API_ENDPOINTS.CONFIGURE, data);
  }
  
  /**
   * Configure multiple commands in a single request
   */
  async configureMultiple(commands: { op: 'set' | 'delete'; path: string[]; value?: string }[]): Promise<any> {
    return this.apiRequest(API_ENDPOINTS.CONFIGURE, commands);
  }
  
  /**
   * Retrieve configuration from the router
   */
  async retrieveConfig(path: string[] = []): Promise<any> {
    return this.apiRequest(API_ENDPOINTS.RETRIEVE, { op: 'showConfig', path });
  }
  
  /**
   * Show command output
   */
  async showCommand(path: string[]): Promise<any> {
    return this.apiRequest(API_ENDPOINTS.SHOW, { op: 'show', path });
  }
  
  /**
   * Get interfaces information
   */
  async getInterfaces(): Promise<any> {
    return this.showCommand(['interfaces']);
  }
  
  /**
   * Get DHCP server configuration
   */
  async getDhcpConfig(): Promise<any> {
    return this.retrieveConfig(['service', 'dhcp-server']);
  }
  
  /**
   * Get DHCP leases
   */
  async getDhcpLeases(): Promise<any> {
    return this.showCommand(['dhcp', 'server', 'leases']);
  }
  
  /**
   * Get firewall configuration
   */
  async getFirewallConfig(): Promise<any> {
    return this.retrieveConfig(['firewall']);
  }
  
  /**
   * Get NAT configuration
   */
  async getNatConfig(): Promise<any> {
    return this.retrieveConfig(['nat']);
  }
  
  /**
   * Save the configuration
   */
  async saveConfig(file?: string): Promise<any> {
    const data: any = { op: 'save' };
    if (file) {
      data.file = file;
    }
    
    return this.apiRequest(API_ENDPOINTS.CONFIG_FILE, data);
  }
  
  /**
   * Load a configuration
   */
  async loadConfig(file: string): Promise<any> {
    return this.apiRequest(API_ENDPOINTS.CONFIG_FILE, { op: 'load', file });
  }
  
  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    return this.showCommand(['system']);
  }
  
  /**
   * Get complete router configuration
   */
  async getCompleteConfig(): Promise<any> {
    return this.retrieveConfig([]);
  }
} 