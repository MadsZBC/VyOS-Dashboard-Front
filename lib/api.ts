import { VyosConnectionParams } from './vyos-api';
import { VyosApiClient } from './vyos-api';

const API_BASE_URL = "http://localhost:8000";

// Connection parameters type
export type ConnectionParams = VyosConnectionParams & {
  use_keys?: boolean;
  key_file?: string;
  key_content?: string;
};

type SSHKeyUpload = {
  key_content: string;
  key_name?: string;
};

// Option 1: Use our Next.js proxy for VyOS API
export async function fetchVyosApi(
  endpoint: string,
  connectionParams: ConnectionParams & Record<string, any>
) {
  try {
    const response = await fetch('/api/proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
        data: connectionParams
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("VyOS API request failed:", error);
    throw error;
  }
}

// Execute a show command on the VyOS router
export async function executeShowCommand(path: string[], connectionParams: ConnectionParams) {
  return fetchVyosApi("show-command", { 
    ...connectionParams, 
    path 
  });
}

// Configure the VyOS router with a single command
export async function configureSingle(op: 'set' | 'delete' | 'comment', path: string[], connectionParams: ConnectionParams) {
  return fetchVyosApi("configure-single", { 
    ...connectionParams, 
    op,
    path 
  });
}

// Configure the VyOS router with multiple commands
export async function configureMultiple(commands: Array<{op: 'set' | 'delete' | 'comment', path: string[]}>, connectionParams: ConnectionParams) {
  return fetchVyosApi("configure-multiple", { 
    ...connectionParams, 
    commands 
  });
}

// Save VyOS configuration
export async function saveConfig(file: string | undefined, connectionParams: ConnectionParams) {
  return fetchVyosApi("save-config", { 
    ...connectionParams, 
    file 
  });
}

// Load VyOS configuration
export async function loadConfig(file: string, connectionParams: ConnectionParams) {
  return fetchVyosApi("load-config", { 
    ...connectionParams, 
    file 
  });
}

// The functions below map to specific VyOS API operations

/**
 * Get VyOS router configuration - uses the dedicated endpoint for config (Call #1)
 */
export async function getVyOSConfig(connectionParams: VyosConnectionParams) {
  try {
    console.log('Client sending config request (CALL #1):', {
      ...connectionParams,
      key: '********' // Redacted for logs
    });
    
    // Create form data with connection parameters
    const formData = new FormData();
    formData.append('host', connectionParams.host);
    formData.append('port', String(connectionParams.port || 443));
    formData.append('key', connectionParams.key);
    formData.append('https', String(connectionParams.https !== false));
    formData.append('allowInsecure', String(connectionParams.allowInsecure || false));
    
    // Send request to the config-specific endpoint
    const response = await fetch('/api/vyos/config', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('Config API response received (CALL #1):', {
      success: result.success,
      hasData: !!result.data,
      error: result.error || null
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching VyOS config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get VyOS interfaces
 */
export async function getVyOSInterfaces(connectionParams: VyosConnectionParams) {
  try {
    // This will now use the config endpoint as a fallback
    const result = await getVyOSConfig(connectionParams);
    if (result.success && result.data) {
      // Extract interfaces data if available
      if (result.data.interfaces) {
        return {
          success: true,
          data: result.data.interfaces
        };
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching VyOS interfaces:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get VyOS DHCP leases - uses the dedicated endpoint for DHCP (Call #2)
 */
export async function getVyOSDhcpLeases({
  host,
  port = 443,
  key,
  https = true,
  allowInsecure = false
}: {
  host: string;
  port?: number;
  key: string;
  https?: boolean;
  allowInsecure?: boolean;
}): Promise<any> {
  console.log(`Fetching DHCP leases from ${host}:${port} (allows insecure: ${allowInsecure})`);
  
  // Create FormData
  const formData = new FormData();
  formData.append('host', host);
  formData.append('port', port.toString());
  formData.append('key', key);
  formData.append('https', https.toString());
  formData.append('allowInsecure', allowInsecure.toString());
  
  try {
    // Use the dedicated DHCP endpoint with multiple approaches
    const response = await fetch('/api/vyos/dhcp', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('DHCP leases API response:', result);
    
    if (!result.success) {
      console.error('Failed to fetch DHCP leases:', result.error);
      throw new Error(result.error || 'Failed to fetch DHCP leases');
    }
    
    // Parse the tabular text data into a structured format
    if (result.data && typeof result.data === 'string') {
      const lines = result.data.split('\n');
      const parsedLeases: { 
        leases: { 
          [network: string]: Array<{
            ip: string;
            mac: string;
            state: string;
            leaseStart: string;
            expiry: string;
            remaining: string;
            pool: string;
            hostname: string;
            origin: string;
          }> 
        } 
      } = {
        leases: {
          'LAN': [] // Default network
        }
      };
      
      // Skip the header and separator lines (first 2 lines)
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split by whitespace but preserve spaces in fields with multiple words
        const fields = line.split(/\s{2,}/).map((field: string) => field.trim()).filter(Boolean);
        console.log('Processing DHCP lease line:', fields);
        
        if (fields.length >= 6) {
          // Format from VyOS: IP MAC State LeaseStart LeaseExpiry Remaining Pool Hostname Origin
          // Note: some fields may contain spaces and be split incorrectly
          let lease = {
            ip: fields[0] || 'Unknown',
            mac: fields[1] || 'Unknown',
            state: fields[2] || 'Unknown',
            leaseStart: 'Unknown',
            expiry: 'Unknown',
            remaining: 'Unknown',
            pool: 'LAN',
            hostname: 'Unknown',
            origin: 'Unknown'
          };
          
          // Try to parse the remaining fields
          if (fields.length >= 9) {
            lease = {
              ...lease,
              leaseStart: fields[3] + ' ' + fields[4], // Combine date and time
              expiry: fields[5] + ' ' + fields[6],     // Combine date and time
              remaining: fields[7],
              pool: fields[8],
              hostname: fields[9] || 'Unknown',
              origin: fields[10] || 'local'
            };
          }
          
          parsedLeases.leases['LAN'].push(lease);
        }
      }
      
      return parsedLeases;
    }
    
    return result.data;
  } catch (err) {
    console.error('Error fetching DHCP leases:', err);
    throw err;
  }
}

/**
 * Get VyOS DHCP configuration
 */
export async function getVyOSDhcpConfig(connectionParams: VyosConnectionParams) {
  try {
    // This will now use the config endpoint as a fallback
    const result = await getVyOSConfig(connectionParams);
    if (result.success && result.data) {
      // Extract DHCP config data if available
      if (result.data.service && result.data.service['dhcp-server']) {
        return {
          success: true,
          data: result.data.service['dhcp-server']
        };
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching VyOS DHCP config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get VyOS firewall configuration
 */
export async function getVyOSFirewall(connectionParams: VyosConnectionParams) {
  try {
    const client = new VyosApiClient(connectionParams);
    return await client.getFirewallConfig();
  } catch (error) {
    console.error('Error fetching VyOS firewall config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get VyOS NAT configuration
 */
export async function getVyOSNat(connectionParams: VyosConnectionParams) {
  try {
    const client = new VyosApiClient(connectionParams);
    return await client.getNatConfig();
  } catch (error) {
    console.error('Error fetching VyOS NAT config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get VyOS system information
 */
export async function getVyOSSystemInfo(connectionParams: VyosConnectionParams) {
  try {
    const client = new VyosApiClient(connectionParams);
    return await client.getSystemInfo();
  } catch (error) {
    console.error('Error fetching VyOS system info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Option 2: Direct API call (might have CORS issues)
export async function fetchRouterData(
  endpoint: string,
  connectionParams: ConnectionParams
) {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("API key is missing. Please set NEXT_PUBLIC_API_KEY in your environment.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(connectionParams),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Option 2: Use our Next.js proxy to avoid CORS
export async function fetchRouterDataViaProxy(
  endpoint: string,
  connectionParams: ConnectionParams
) {
  try {
    const response = await fetch('/api/proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint,
        data: connectionParams
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API proxy request failed:", error);
    throw error;
  }
}

export async function uploadSSHKey(keyData: SSHKeyUpload) {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("API key is missing. Please set NEXT_PUBLIC_API_KEY in your environment.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/upload-ssh-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(keyData),
      mode: "cors",
      credentials: "same-origin",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("SSH key upload failed:", error);
    throw error;
  }
}

// Upload SSH key via proxy
export async function uploadSSHKeyViaProxy(keyData: SSHKeyUpload) {
  try {
    const response = await fetch('/api/proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: 'upload-ssh-key',
        data: keyData
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `API request failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("SSH key upload failed:", error);
    throw error;
  }
}

// Placeholder for direct key content use
export async function uploadSSHKeyViaConnect(keyData: SSHKeyUpload) {
  return {
    success: true,
    data: {},
    message: "SSH key will be used directly with the connection request"
  };
} 