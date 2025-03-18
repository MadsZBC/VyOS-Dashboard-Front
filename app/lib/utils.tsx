// Extended interface to include raw response data
export interface ExtendedVyosConfig {
  interfaces: any;
  firewall: any;
  nat: any;
  service: any;
  system: any;
  protocols: any;
  rawResponse?: any; // Add rawResponse property
}

// Debug info interface
export interface DebugInfo {
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'info' | 'warning';
  endpoint?: string;
  data?: any;
  status?: number;
  message?: string;
  details?: any;
}

// Helper function to safely access nested properties
export const safeGet = (obj: any, path: string, defaultValue: any = undefined) => {
  const keys = path.split('.');
  return keys.reduce((o, key) => (o && o[key] !== undefined && o[key] !== null) ? o[key] : defaultValue, obj);
};

// Helper to safely get array length
export const safeLength = (obj: any, path: string) => {
  const value = safeGet(obj, path, {});
  return Object.keys(value || {}).length;
};

// Helper to get the default gateway IP
export const getDefaultGateway = (config: any): string => {
  try {
    // For VyOS, the default gateway is under protocols.static.route["0.0.0.0/0"].next-hop
    const nextHop = safeGet(config, 'protocols.static.route["0.0.0.0/0"].next-hop', {});
    // The gateway IP is the key of the next-hop object
    const gateways = Object.keys(nextHop);
    
    // Return the first gateway found
    return gateways.length > 0 ? gateways[0] : 'N/A';
  } catch (error) {
    console.error('Error extracting default gateway:', error);
    return 'N/A';
  }
};

// Helper to extract actual interface IP from config
export const getInterfaceIP = (config: any, interfaceName: string): string => {
  try {
    // Try different possible paths in the configuration
    const addressPath = `interfaces.ethernet.${interfaceName}.address`;
    
    // First check if it's an array
    const addressArray = safeGet(config, addressPath, []);
    
    // Handle array format
    if (Array.isArray(addressArray) && addressArray.length > 0) {
      const address = addressArray[0];
      // Clean up the CIDR notation if needed
      if (address && address.includes('/')) {
        return address.split('/')[0];
      }
      return address || 'N/A';
    }
    
    // If not an array, try as object
    const addressObj = safeGet(config, addressPath, {});
    if (typeof addressObj === 'object' && Object.keys(addressObj).length > 0) {
      const address = Object.keys(addressObj)[0];
      if (address && address.includes('/')) {
        return address.split('/')[0];
      }
      return address || 'N/A';
    }
    
    return 'N/A';
  } catch (error) {
    console.error(`Error extracting IP for ${interfaceName}:`, error);
    return 'N/A';
  }
};

// Helper function to get all interfaces and classify them
export const getInterfaces = (config: any) => {
  const interfaces: {
    name: string;
    description: string;
    address: string;
    role: 'WAN' | 'LAN' | 'OTHER';
  }[] = [];
  
  // Get all ethernet interfaces
  const ethernetInterfaces = safeGet(config, 'interfaces.ethernet', {});
  
  // Get interface groups to classify interfaces
  const wanInterfaces = safeGet(config, 'firewall.group.interface-group.WAN.interface', []);
  const lanInterfaces = safeGet(config, 'firewall.group.interface-group.LAN.interface', []);
  
  // Process each interface
  Object.keys(ethernetInterfaces).forEach(ifName => {
    const ifData = ethernetInterfaces[ifName];
    const addresses = safeGet(ifData, 'address', []);
    const address = Array.isArray(addresses) && addresses.length > 0 
      ? addresses[0].split('/')[0] 
      : 'N/A';
    
    // Determine role
    let role: 'WAN' | 'LAN' | 'OTHER' = 'OTHER';
    if (wanInterfaces.includes(ifName)) {
      role = 'WAN';
    } else if (lanInterfaces.includes(ifName)) {
      role = 'LAN';
    }
    
    interfaces.push({
      name: ifName,
      description: safeGet(ifData, 'description', ''),
      address,
      role
    });
  });
  
  // Sort interfaces: WAN first, then LAN, then others
  return interfaces.sort((a, b) => {
    if (a.role === 'WAN' && b.role !== 'WAN') return -1;
    if (a.role !== 'WAN' && b.role === 'WAN') return 1;
    if (a.role === 'LAN' && b.role === 'OTHER') return -1;
    if (a.role === 'OTHER' && b.role === 'LAN') return 1;
    return a.name.localeCompare(b.name);
  });
}; 