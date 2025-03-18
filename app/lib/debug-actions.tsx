import { getConnectionState, saveConnectionState } from "@/lib/connection-store";
import { DebugInfo } from "@/app/lib/utils";
import { getVyOSDhcpLeases } from "@/lib/api";

// Function to add debug info entries
export const addDebugInfo = (info: Partial<DebugInfo>) => {
  const timestamp = new Date().toISOString();
  const newInfo = { timestamp, ...info } as DebugInfo;
  
  // Get current debug info from connection state
  const savedState = getConnectionState();
  const currentDebugInfo = savedState?.debugInfo || [];
  
  // Update with new info, keeping only last 20 entries
  const updatedDebugInfo = [newInfo, ...currentDebugInfo.slice(0, 19)];
  
  // Save back to connection state
  if (savedState) {
    saveConnectionState({
      ...savedState,
      debugInfo: updatedDebugInfo
    });
  }
  
  return updatedDebugInfo;
};

// Function to clear debug info
export const clearDebugInfo = () => {
  const savedState = getConnectionState();
  if (savedState) {
    saveConnectionState({
      ...savedState,
      debugInfo: []
    });
  }
  return [];
};

// Function to fetch DHCP data
export const fetchDhcpData = async () => {
  console.log('Fetching DHCP data...');
  const timestamp = new Date().toISOString();
  const savedState = getConnectionState();
  const params = savedState?.connectionParams;
  
  // Store initial debug info
  const updatedDebugInfo = addDebugInfo({
    timestamp,
    type: 'info',
    message: 'Starting DHCP leases fetch',
    endpoint: '/api/vyos/dhcp'
  });
  
  if (!params || !params.host || !params.key) {
    console.log('No connection data available, skipping DHCP fetch');
    
    return addDebugInfo({
      type: 'warning',
      message: 'Missing connection data (host or key)',
      endpoint: '/api/vyos/dhcp'
    });
  }

  try {
    // Add request debug info
    addDebugInfo({
      type: 'info',
      message: `Sending request to /api/vyos/dhcp for ${params.host}:${params.port}`,
      endpoint: '/api/vyos/dhcp',
      details: {
        host: params.host,
        port: params.port || "443",
        https: params.https !== false,
        allowInsecure: params.allowInsecure === true
      }
    });
    
    // Use the dedicated DHCP leases function
    const dhcpData = await getVyOSDhcpLeases({
      host: params.host,
      port: params.port ? Number(params.port) : 443,
      key: params.key,
      https: params.https !== false,
      allowInsecure: params.allowInsecure === true
    });
    
    console.log('DHCP data received:', dhcpData);
    
    // Log successful response
    addDebugInfo({
      type: 'response',
      message: 'DHCP leases data received successfully',
      endpoint: '/api/vyos/dhcp',
      status: 200,
      data: dhcpData
    });
    
    // Save the data to the connection state
    if (savedState) {
      saveConnectionState({
        ...savedState,
        dhcpLeases: dhcpData
      });
    }
    
    return dhcpData;
  } catch (error) {
    console.error('Error fetching DHCP data:', error);
    
    // Log error
    addDebugInfo({
      type: 'error',
      message: `Error fetching DHCP data: ${error instanceof Error ? error.message : String(error)}`,
      endpoint: '/api/vyos/dhcp',
      details: error instanceof Error ? error.stack : undefined
    });
    
    return null;
  }
}; 