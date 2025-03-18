export interface ExtendedVyosConfig {
  interfaces: {
    ethernet: Record<string, any>;
  };
  firewall: {
    group?: {
      "interface-group"?: Record<string, any>;
      "network-group"?: Record<string, any>;
    };
    ipv4?: {
      input?: {
        filter?: {
          rule?: Record<string, any>;
        };
      };
      forward?: {
        filter?: {
          rule?: Record<string, any>;
        };
      };
    };
  };
  nat: {
    source?: {
      rule?: Record<string, any>;
    };
  };
  service: Record<string, any>;
  system: {
    "host-name"?: string;
  };
}

// Helper function to safely get a value from a nested object
export function safeGet(obj: any, path: string, defaultValue: any = null): any {
  const parts = path.split('.');
  let result = obj;
  
  for (const part of parts) {
    if (result == null || result[part] === undefined) {
      return defaultValue;
    }
    result = result[part];
  }
  
  return result !== undefined ? result : defaultValue;
}

// Helper function to safely get length of an object or array
export function safeLength(obj: any, path: string): number {
  const value = safeGet(obj, path);
  
  if (value == null) return 0;
  
  if (Array.isArray(value)) {
    return value.length;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length;
  }
  
  return 0;
}

// Get the default gateway from the VyOS config
export function getDefaultGateway(config: ExtendedVyosConfig): string {
  return safeGet(config, 'protocols.static.route.0.0.0.0.next-hop.0.next-hop-address', 'Not set');
}

// Extract interfaces and determine their roles
export function getInterfaces(config: ExtendedVyosConfig): Array<{
  name: string;
  address: string;
  description: string;
  role: 'WAN' | 'LAN' | 'OTHER';
}> {
  const interfaces: Array<{
    name: string;
    address: string;
    description: string;
    role: 'WAN' | 'LAN' | 'OTHER';
  }> = [];
  
  const ethernetInterfaces = safeGet(config, 'interfaces.ethernet', {});
  
  for (const [name, details] of Object.entries(ethernetInterfaces)) {
    // Handle address being either a string or an array
    let address = 'No IP';
    if (details && typeof details === 'object') {
      const detailsObj = details as any;
      if (typeof detailsObj.address === 'string') {
        address = detailsObj.address;
      } else if (Array.isArray(detailsObj.address) && detailsObj.address.length > 0) {
        address = detailsObj.address[0];
      }
    }
      
    // Simple heuristic - eth0 is often WAN in VyOS
    const role = name === 'eth0' ? 'WAN' : (name === 'eth1' ? 'LAN' : 'OTHER');
    
    interfaces.push({
      name,
      address,
      description: details && typeof details === 'object' ? (details as any).description || '' : '',
      role
    });
  }
  
  return interfaces;
} 