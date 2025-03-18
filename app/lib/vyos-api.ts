"use client"

import { ConnectionParams } from '@/app/types/connection';

const API_BASE_URL = '/api/vyos';

export interface DhcpLease {
  ip: string;
  mac: string;
  hostname: string;
  expiry: string;
  pool: string;
}

export interface InterfaceStatus {
  name: string;
  status: "up" | "down";
  macAddress: string;
  speed: string;
  ipAddresses: string[];
}

export interface SystemStatus {
  hostname: string;
  version: string;
  uptime: string;
  load: number[];
  memoryUsage: {
    total: number;
    used: number;
    free: number;
  };
  diskUsage: {
    total: number;
    used: number;
    free: number;
  };
}

export async function vyosApiCall(
  connectionParams: ConnectionParams,
  operation: string,
  path: string[],
  data?: any
) {
  const { host, port, apiKey, allowInsecure } = connectionParams;
  const url = `https://${host}${port ? `:${port}` : ''}/show`;

  // Create actual FormData values to send to the server
  const apiData = {
    data: JSON.stringify({
      op: operation,
      path: path
    }),
    key: apiKey
  };

  // Make request to our proxy endpoint
  const response = await fetch(API_BASE_URL, {
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
      allowInsecure: allowInsecure === true, // Ensure boolean type
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  const result = await response.json();
  console.log('API response:', result);
  
  // Try to parse the data as JSON if it's a string
  if (result.data && typeof result.data === 'string') {
    try {
      result.data = JSON.parse(result.data);
    } catch (e) {
      // If it's not valid JSON, keep as string
      console.log('Response is not JSON, keeping as string');
    }
  }
  
  return result.data;
}

/**
 * Get a list of all DHCP leases from the VyOS router
 */
export async function getVyOSDhcpLeases(connectionParams: ConnectionParams): Promise<DhcpLease[]> {
  const result = await vyosApiCall(
    connectionParams,
    'show',
    ['service', 'dhcp-server', 'shared-network-name']
  );
  
  // Transform the API response to our interface format
  // This would need to be adjusted based on actual API response structure
  const leases = result.leases || [];
  
  return leases.map((lease: any) => ({
    ip: lease.ip || '',
    mac: lease.mac || '',
    hostname: lease.hostname || '',
    expiry: lease.expiry || '',
    pool: lease.pool || ''
  }));
}

/**
 * Get the status of all interfaces on the VyOS router
 */
export async function getVyOSInterfaceStatus(connectionParams: ConnectionParams): Promise<InterfaceStatus[]> {
  const result = await vyosApiCall(
    connectionParams,
    'show',
    ['interfaces', 'ethernet']
  );
  
  // Transform the API response to our interface format
  // This would need to be adjusted based on actual API response structure
  const interfaces = result.interfaces || [];
  
  return interfaces.map((iface: any) => ({
    name: iface.name || '',
    status: iface.status || 'down',
    macAddress: iface.mac_address || '',
    speed: iface.speed || '',
    ipAddresses: iface.ip_addresses || []
  }));
}

/**
 * Get system status information from the VyOS router
 */
export async function getVyOSSystemStatus(connectionParams: ConnectionParams): Promise<SystemStatus> {
  const result = await vyosApiCall(
    connectionParams,
    'show',
    ['system', 'memory']
  );
  
  // Transform the API response to our interface format
  // This would need to be adjusted based on actual API response structure
  const system = result.system || {};
  
  return {
    hostname: system.hostname || '',
    version: system.version || '',
    uptime: system.uptime || '',
    load: system.load || [0, 0, 0],
    memoryUsage: {
      total: system.memory?.total || 0,
      used: system.memory?.used || 0,
      free: system.memory?.free || 0
    },
    diskUsage: {
      total: system.disk?.total || 0,
      used: system.disk?.used || 0,
      free: system.disk?.free || 0
    }
  };
} 