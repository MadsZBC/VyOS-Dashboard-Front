"use client"

import { ConnectionParams } from '@/app/types/connection';

/**
 * VyOS API Manager - Centralized management for all VyOS API operations
 */

// Configuration options
export const VyOSEndpoints = {
  SHOW: '/show',
  CONFIGURE: '/configure',
  CONFIGURE_COMMANDS: '/configure-commands',
  CONF_MODE_COMMANDS: '/conf-mode-commands',
  RETRIEVE: '/retrieve'
};

// Define common paths for reuse
export const VyOSPaths = {
  // System paths
  SYSTEM: {
    MEMORY: ['system', 'memory'],
    STATUS: ['system', 'status'],
    UPTIME: ['system', 'uptime'],
    VERSION: ['system', 'version'],
    HOST_NAME: ['system', 'host-name'],
    PROCESSES: ['system', 'processes']
  },
  // Interface paths
  INTERFACES: {
    ALL: ['interfaces'],
    ETHERNET: ['interfaces', 'ethernet'],
    WIRELESS: ['interfaces', 'wireless'],
    BRIDGE: ['interfaces', 'bridge'],
    OPENVPN: ['interfaces', 'openvpn'],
    WIREGUARD: ['interfaces', 'wireguard']
  },
  // Service paths
  SERVICES: {
    DHCP_SERVER: {
      ALL: ['service', 'dhcp-server'],
      LEASES: ['service', 'dhcp-server', 'leases'],
      SHARED_NETWORKS: ['service', 'dhcp-server', 'shared-network-name']
    },
    DNS: ['service', 'dns'],
    FIREWALL: ['service', 'firewall'],
    NAT: ['service', 'nat'],
    SSH: ['service', 'ssh'],
    VPN: ['service', 'vpn']
  },
  // Routing paths
  ROUTING: {
    ROUTES: ['protocols'],
    BGP: ['protocols', 'bgp'],
    OSPF: ['protocols', 'ospf']
  }
};

// API Operations
export const VyOSOperations = {
  SHOW: 'show',
  SET: 'set',
  DELETE: 'delete',
  COMMENT: 'comment'
};

// Core API call function with configurable endpoint and path
export async function vyosApiCall(
  connectionParams: ConnectionParams,
  endpoint: string = VyOSEndpoints.SHOW,
  operation: string = VyOSOperations.SHOW,
  path: string[],
  additionalData?: Record<string, any>
) {
  if (!connectionParams || !connectionParams.host || !connectionParams.apiKey) {
    throw new Error("Connection parameters missing");
  }

  const { host, port, apiKey, allowInsecure } = connectionParams;
  const url = `https://${host}${port ? `:${port}` : ''}${endpoint}`;

  // Create API data payload
  const apiData = {
    data: JSON.stringify({
      op: operation,
      path: path,
      ...additionalData
    }),
    key: apiKey
  };

  // Log API call details for debugging
  console.log(`Making API call to ${endpoint} with operation: ${operation}, path: ${path.join('/')}`);

  // Make request through our proxy endpoint
  const response = await fetch('/api/vyos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      method: 'POST',
      data: apiData,
      headers: {
        'Accept': 'application/json',
      },
      allowInsecure: allowInsecure === true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API request failed with status ${response.status}`);
  }

  const result = await response.json();
  
  // Check if the response contains parsed data or raw output
  if (result.data) {
    // If we have a rawOutput field, it means the API returned non-JSON content
    if (result.data.rawOutput !== undefined) {
      return {
        success: result.data.success,
        data: result.data.rawOutput,
        error: result.data.error
      };
    }
    
    // Otherwise return the already parsed data
    return result.data;
  }
  
  return result;
}

// Higher-level API functions

/**
 * Perform a generic "show" operation
 */
export function showConfiguration(
  connectionParams: ConnectionParams, 
  path: string[],
  operation: string = VyOSOperations.SHOW
) {
  return vyosApiCall(
    connectionParams,
    VyOSEndpoints.SHOW,
    operation,
    path
  );
}

/**
 * Get DHCP server information
 */
export function getDhcpServerInfo(
  connectionParams: ConnectionParams,
  operation: string = VyOSOperations.SHOW
) {
  return showConfiguration(connectionParams, VyOSPaths.SERVICES.DHCP_SERVER.SHARED_NETWORKS, operation);
}

/**
 * Get information about Ethernet interfaces
 */
export function getInterfacesInfo(
  connectionParams: ConnectionParams,
  operation: string = VyOSOperations.SHOW
) {
  return showConfiguration(connectionParams, VyOSPaths.INTERFACES.ETHERNET, operation);
}

/**
 * Get system memory information
 */
export function getSystemMemoryInfo(
  connectionParams: ConnectionParams,
  operation: string = VyOSOperations.SHOW
) {
  return showConfiguration(connectionParams, VyOSPaths.SYSTEM.MEMORY, operation);
}

/**
 * Run a custom show command with any path
 */
export function customShowCommand(
  connectionParams: ConnectionParams,
  customPath: string[],
  operation: string = VyOSOperations.SHOW,
  endpoint: string = VyOSEndpoints.SHOW
) {
  return vyosApiCall(
    connectionParams,
    endpoint,
    operation,
    customPath
  );
}

/**
 * Execute configuration commands (for advanced users)
 */
export function executeConfigCommands(
  connectionParams: ConnectionParams,
  commands: string[]
) {
  return vyosApiCall(
    connectionParams,
    VyOSEndpoints.CONFIGURE_COMMANDS,
    VyOSOperations.SET,
    [],
    { commands }
  );
}

/**
 * Get the complete configuration 
 */
export function getFullConfiguration(connectionParams: ConnectionParams) {
  return vyosApiCall(
    connectionParams,
    VyOSEndpoints.RETRIEVE,
    'showConfig',
    []
  );
} 