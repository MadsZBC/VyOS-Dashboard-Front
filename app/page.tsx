"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Network, Shield, Globe, Server, Cpu, Wifi, LogOut, RefreshCw, Bug } from "lucide-react"
import NetworkInterfaces from "@/components/network-interfaces"
import FirewallRules from "@/components/firewall-rules"
import NatRules from "@/components/nat-rules"
import SystemInfo from "@/components/system-info"
import Services from "@/components/services"
import RouterConnection from "@/components/router-connection"
import { Button } from "@/components/ui/button"
import { 
  getConnectionState, 
  saveConnectionState, 
  clearConnectionState 
} from "@/lib/connection-store"
import { getDhcpConfig } from "@/lib/api"
// Keep the mock data import for fallback or initial state
import { vyosConfig as mockConfig } from "@/lib/vyos-data"

// Extended interface to include raw response data
interface ExtendedVyosConfig {
  interfaces: any;
  firewall: any;
  nat: any;
  service: any;
  system: any;
  protocols: any;
  rawResponse?: any; // Add rawResponse property
}

// Debug info interface
interface DebugInfo {
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'info';
  endpoint?: string;
  data?: any;
  status?: number;
  message?: string;
  details?: any;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isConnected, setIsConnected] = useState(false)
  const [vyosConfig, setVyosConfig] = useState<ExtendedVyosConfig>(mockConfig as ExtendedVyosConfig)
  const [connectionParams, setConnectionParams] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([])
  const [dhcpLeases, setDhcpLeases] = useState<any>(null)

  // Function to add debug info entries
  const addDebugInfo = (info: Partial<DebugInfo>) => {
    const timestamp = new Date().toISOString();
    const newInfo = { timestamp, ...info } as DebugInfo;
    
    setDebugInfo(prev => [newInfo, ...prev.slice(0, 19)]); // Keep only last 20 entries
    
    // Update saved state
    const savedState = getConnectionState();
    if (savedState) {
      saveConnectionState({
        ...savedState,
        debugInfo: [newInfo, ...(savedState.debugInfo || []).slice(0, 19)]
      });
    }
  }
  
  // Function to clear debug info
  const clearDebugInfo = () => {
    setDebugInfo([]);
    
    // Update saved state
    const savedState = getConnectionState();
    if (savedState) {
      saveConnectionState({
        ...savedState,
        debugInfo: []
      });
    }
  }

  // Load saved connection state on initial render
  useEffect(() => {
    const savedState = getConnectionState();
    if (savedState?.isConnected && savedState?.config) {
      setIsConnected(true);
      setVyosConfig(savedState.config);
      if (savedState.connectionParams) {
        setConnectionParams(savedState.connectionParams);
      }
      if (savedState.debugMode) {
        setDebugMode(savedState.debugMode);
      }
      if (savedState.debugInfo) {
        setDebugInfo(savedState.debugInfo);
      }
      if (savedState.dhcpLeases) {
        setDhcpLeases(savedState.dhcpLeases);
      }
    }
    setIsLoading(false);
  }, []);

  const toggleDebug = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    
    // If turning on debug, switch to debug tab
    if (newDebugMode) {
      setActiveTab("debug");
    }
    
    // Save the debug state
    const savedState = getConnectionState();
    if (savedState) {
      saveConnectionState({
        ...savedState,
        debugMode: newDebugMode
      });
    }
  }

  const handleConnect = async (configData: any, params: any) => {
    // Log the raw API response
    console.log("API Response:", configData);
    console.log("Connection Params:", params);
    
    // The VyOS API returns data in a nested structure: data.config
    // First check if we have a rawResponse with nested data structure
    const actualData = configData.rawResponse?.data?.config 
      ? configData.rawResponse.data.config  // Use the nested config object
      : configData.rawResponse?.data        // Try direct data object
        ? configData.rawResponse.data       // Use direct data object
        : configData;                       // Fallback to passed configData
      
    console.log("Using data from:", configData.rawResponse?.data?.config 
      ? "response.data.config" 
      : configData.rawResponse?.data 
        ? "response.data" 
        : "direct data");
    
    // Make sure configData has all the required properties or use defaults
    const safeConfig = {
      // Ensure all required properties exist with defaults
      interfaces: actualData?.interfaces || { ethernet: {} },
      firewall: actualData?.firewall || { 
        ipv4: { 
          input: { filter: { rule: {} } }, 
          forward: { filter: { rule: {} } } 
        } 
      },
      nat: actualData?.nat || { source: { rule: {} } },
      service: actualData?.service || {},
      system: actualData?.system || { "host-name": params.host },
      protocols: actualData?.protocols || { 
        static: { route: { "0.0.0.0/0": { "next-hop": {} } } } 
      },
      // Add raw response for debugging
      rawResponse: configData.rawResponse || configData
    };
    
    // Log the processed config
    console.log("Processed Config:", safeConfig);
    
    // Get debug info and mode from params if available
    if (params.debugMode !== undefined) {
      setDebugMode(params.debugMode);
    }
    
    if (params.debugInfo) {
      setDebugInfo(params.debugInfo);
    }
    
    // Remove extra props from connection params before saving
    const connectionParamsToSave = { ...params };
    delete connectionParamsToSave.debugMode;
    delete connectionParamsToSave.debugInfo;
    
    setVyosConfig(safeConfig);
    setConnectionParams(connectionParamsToSave);
    setIsConnected(true);
    
    // Also fetch DHCP leases data when connecting
    let dhcpLeaseData = null;
    try {
      console.log("Fetching DHCP leases...");
      const dhcpResponse = await getDhcpConfig(connectionParamsToSave);
      console.log("DHCP Response:", dhcpResponse);
      
      if (dhcpResponse.success && dhcpResponse.data) {
        // Process the DHCP data
        const processedData: any = {
          // Store the original response for debugging
          raw: dhcpResponse.data,
          // Store configuration
          dhcp_config: dhcpResponse.data.dhcp_config,
        };
        
        // Process structured lease data if available
        if (dhcpResponse.data.dhcp_leases && dhcpResponse.data.dhcp_leases.structured) {
          // Transform leases into expected format
          const leasesByNetwork: Record<string, any[]> = {};
          
          // Get the configured DHCP networks and subnets for matching
          const configuredNetworks: Record<string, string[]> = {};
          if (dhcpResponse.data.dhcp_config && dhcpResponse.data.dhcp_config['shared-network-name']) {
            const networks = dhcpResponse.data.dhcp_config['shared-network-name'];
            for (const networkName in networks) {
              if (networks[networkName].subnet) {
                configuredNetworks[networkName] = Object.keys(networks[networkName].subnet);
              }
            }
          }
          
          console.log("Configured DHCP networks:", configuredNetworks);
          
          // Function to check if IP is in subnet
          const isIpInSubnet = (ip: string, subnet: string): boolean => {
            try {
              // Simple string-based check - is the IP part of the subnet prefix?
              // For example, IP 192.168.0.9 would match 192.168.0.0/24
              const subnetPrefix = subnet.split('/')[0].slice(0, -1); // Remove last digit and CIDR
              return ip.startsWith(subnetPrefix);
            } catch (error) {
              console.error("Error checking if IP is in subnet:", error);
              return false;
            }
          };
          
          // Helper to find which network an IP belongs to
          const findNetworkForIp = (ip: string): string => {
            for (const networkName in configuredNetworks) {
              const subnets = configuredNetworks[networkName];
              for (const subnet of subnets) {
                if (isIpInSubnet(ip, subnet)) {
                  return networkName;
                }
              }
            }
            return 'default'; // If no match found
          };
          
          // Process each lease in the structured array
          dhcpResponse.data.dhcp_leases.structured.forEach((lease: any) => {
            // Find network for this IP
            const networkName = findNetworkForIp(lease.ip_address);
            
            // Create the network entry if it doesn't exist
            if (!leasesByNetwork[networkName]) {
              leasesByNetwork[networkName] = [];
            }
            
            // Transform to our expected format
            leasesByNetwork[networkName].push({
              ip: lease.ip_address,
              mac: lease.mac_address,
              hostname: lease.hostname || 'Unknown',
              expiry: lease.ends,
              state: lease.binding_state
            });
          });
          
          // Store the processed leases
          processedData.leases = leasesByNetwork;
          
          console.log("Processed DHCP leases:", processedData.leases);
          addDebugInfo({
            type: 'info',
            message: 'DHCP lease data processed',
            data: { 
              leaseCount: Object.values(leasesByNetwork).flat().length,
              networks: Object.keys(leasesByNetwork),
              configuredNetworks
            }
          });
        } else {
          // No structured lease data found
          processedData.leases = {};
          console.log("No structured DHCP lease data found");
        }
        
        dhcpLeaseData = processedData;
        setDhcpLeases(dhcpLeaseData);
      }
    } catch (error) {
      console.error("Error fetching DHCP leases during connection:", error);
      addDebugInfo({
        type: 'error',
        message: 'Failed to fetch DHCP leases during connection',
        details: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Save connection state
    saveConnectionState({
      isConnected: true,
      connectionParams: connectionParamsToSave,
      config: safeConfig,
      debugMode: params.debugMode || debugMode,
      debugInfo: params.debugInfo || debugInfo,
      dhcpLeases: dhcpLeaseData
    });
  }

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectionParams(null);
    clearConnectionState();
  }

  // If loading, show a simple loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // If not connected, show the connection form
  if (!isConnected) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/40">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-6 w-6 text-primary" />
            <span>VyOS Dashboard</span>
          </div>
        </header>
        <main className="flex-1 p-6 flex items-center justify-center">
          <RouterConnection onConnect={handleConnect} />
        </main>
      </div>
    )
  }

  // Helper function to safely access nested properties
  const safeGet = (obj: any, path: string, defaultValue: any = undefined) => {
    const keys = path.split('.');
    return keys.reduce((o, key) => (o && o[key] !== undefined && o[key] !== null) ? o[key] : defaultValue, obj);
  };

  // Helper to safely get array length
  const safeLength = (obj: any, path: string) => {
    const value = safeGet(obj, path, {});
    return Object.keys(value || {}).length;
  };
  
  // Helper to get the default gateway IP
  const getDefaultGateway = (config: any): string => {
    try {
      // For VyOS, the default gateway is under protocols.static.route["0.0.0.0/0"].next-hop
      const nextHop = safeGet(config, 'protocols.static.route["0.0.0.0/0"].next-hop', {});
      // The gateway IP is the key of the next-hop object
      const gateways = Object.keys(nextHop);
      
      // Log for debugging
      console.log("Default Gateway lookup:", { nextHop, gateways });
      
      // Return the first gateway found
      return gateways.length > 0 ? gateways[0] : 'N/A';
    } catch (error) {
      console.error('Error extracting default gateway:', error);
      return 'N/A';
    }
  };
  
  // Helper to extract actual interface IP from config
  const getInterfaceIP = (config: any, interfaceName: string): string => {
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
      
      console.log(`IP for ${interfaceName}:`, 'Not found');
      return 'N/A';
    } catch (error) {
      console.error(`Error extracting IP for ${interfaceName}:`, error);
      return 'N/A';
    }
  };

  // Helper function to get all interfaces and classify them
  const getInterfaces = (config: any) => {
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

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6 text-primary" />
          <span>VyOS Dashboard</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {safeGet(vyosConfig, 'system.host-name', connectionParams?.host || 'VyOS Router')}
          </Badge>
          <Button 
            variant={debugMode ? "destructive" : "outline"}
            size="sm" 
            onClick={toggleDebug}
            className="flex items-center gap-2"
            title="Toggle Debug Mode"
          >
            <Bug className="h-4 w-4" />
            <span className="hidden sm:inline-flex">{debugMode ? "Debug ON" : "Debug"}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDisconnect}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Disconnect</span>
          </Button>
        </nav>
      </header>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-6">
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-7 gap-2">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="network" className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Network</span>
                </TabsTrigger>
                <TabsTrigger value="firewall" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Firewall</span>
                </TabsTrigger>
                <TabsTrigger value="nat" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">NAT</span>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Services</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">System</span>
                </TabsTrigger>
                <TabsTrigger value="debug" className={`flex items-center gap-2 ${!debugMode && 'hidden'}`}>
                  <Bug className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Debug</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Interfaces</CardTitle>
                      <Network className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{safeLength(vyosConfig, 'interfaces.ethernet')}</div>
                      <p className="text-xs text-muted-foreground">Configured network interfaces</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Firewall Rules</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {safeLength(vyosConfig, 'firewall.ipv4.input.filter.rule') +
                          safeLength(vyosConfig, 'firewall.ipv4.forward.filter.rule')}
                      </div>
                      <p className="text-xs text-muted-foreground">Active firewall rules</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">NAT Rules</CardTitle>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{safeLength(vyosConfig, 'nat.source.rule')}</div>
                      <p className="text-xs text-muted-foreground">Network address translation rules</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Services</CardTitle>
                      <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{safeLength(vyosConfig, 'service')}</div>
                      <p className="text-xs text-muted-foreground">Active network services</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="col-span-2">
                    <CardHeader>
                      <CardTitle>Network Overview</CardTitle>
                      <CardDescription>Visual representation of your network topology</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center space-y-8">
                        {/* Internet */}
                        <div className="flex flex-col items-center">
                          <Globe className="h-12 w-12 text-muted-foreground mb-2" />
                          <div className="text-sm font-medium">Internet</div>
                          <div className="text-xs text-muted-foreground">
                            Default Gateway: <span className="font-bold text-primary">{getDefaultGateway(vyosConfig)}</span>
                          </div>
                        </div>

                        {/* Get interfaces and generate visualization */}
                        {(() => {
                          const interfaces = getInterfaces(vyosConfig);
                          const wanInterfaces = interfaces.filter(i => i.role === 'WAN');
                          const lanInterfaces = interfaces.filter(i => i.role === 'LAN');
                          const otherInterfaces = interfaces.filter(i => i.role === 'OTHER');
                          
                          return (
                            <>
                              {/* Show WAN interfaces */}
                              {wanInterfaces.length > 0 && (
                                <>
                                  <div className="h-8 w-0.5 bg-border relative">
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-muted px-2 py-1 rounded text-xs">
                                      WAN
                                    </div>
                                  </div>
                                  
                                  {wanInterfaces.map((iface, index) => (
                                    <div key={iface.name} className="flex flex-col items-center">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Interface: <span className="font-medium">{iface.name}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        IP: <span className="font-bold text-primary">{iface.address}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {iface.description}
                                      </div>
                                      
                                      {/* Add connector if not the last WAN interface */}
                                      {index < wanInterfaces.length - 1 && (
                                        <div className="h-4 w-0.5 bg-border mt-2"></div>
                                      )}
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Router */}
                              <div className="flex flex-col items-center">
                                <Shield className="h-12 w-12 text-primary mb-2" />
                                <div className="text-sm font-medium">
                                  {safeGet(vyosConfig, 'system.host-name', connectionParams?.host || 'VyOS')}
                                </div>
                              </div>

                              {/* Show LAN interfaces */}
                              {lanInterfaces.length > 0 && (
                                <>
                                  <div className="h-8 w-0.5 bg-border relative">
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-muted px-2 py-1 rounded text-xs">
                                      LAN
                                    </div>
                                  </div>
                                  
                                  {lanInterfaces.map((iface, index) => (
                                    <div key={iface.name} className="flex flex-col items-center">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Interface: <span className="font-medium">{iface.name}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        IP: <span className="font-bold text-primary">{iface.address}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {iface.description}
                                      </div>
                                      
                                      {/* Add connector if not the last LAN interface */}
                                      {index < lanInterfaces.length - 1 && (
                                        <div className="h-4 w-0.5 bg-border mt-2"></div>
                                      )}
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Internal Network */}
                              {lanInterfaces.length > 0 && (
                                <>
                                  <div className="h-8 w-0.5 bg-border"></div>
                                  <div className="flex flex-col items-center">
                                    <Wifi className="h-12 w-12 text-muted-foreground mb-2" />
                                    <div className="text-sm font-medium">Internal Network</div>
                                    {lanInterfaces.length === 1 && (
                                      <div className="text-xs text-muted-foreground">
                                        Network: {safeGet(vyosConfig, 'firewall.group.network-group.NET-INSIDE-v4.network[0]', 'N/A')}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* Show OTHER interfaces if any */}
                              {otherInterfaces.length > 0 && (
                                <>
                                  <div className="h-8 w-0.5 bg-border relative mt-4">
                                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 bg-muted px-2 py-1 rounded text-xs">
                                      OTHER
                                    </div>
                                  </div>
                                  
                                  {otherInterfaces.map((iface, index) => (
                                    <div key={iface.name} className="flex flex-col items-center">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        Interface: <span className="font-medium">{iface.name}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-1">
                                        IP: <span className="font-bold text-primary">{iface.address}</span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {iface.description}
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>System Information</CardTitle>
                      <CardDescription>Router configuration details</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Hostname</div>
                          <div className="font-medium">{safeGet(vyosConfig, 'system.host-name', 'N/A')}</div>

                          <div className="text-muted-foreground">WAN Interface</div>
                          <div className="font-medium">
                            eth0 ({safeGet(vyosConfig, 'interfaces.ethernet.eth0.description', 'N/A')})
                          </div>

                          <div className="text-muted-foreground">LAN Interface</div>
                          <div className="font-medium">
                            eth1 ({safeGet(vyosConfig, 'interfaces.ethernet.eth1.description', 'N/A')})
                          </div>

                          <div className="text-muted-foreground">DHCP Server</div>
                          <div className="font-medium">
                            {safeGet(vyosConfig, 'service.dhcp-server', null) ? 'Enabled' : 'Disabled'}
                          </div>

                          <div className="text-muted-foreground">DNS Forwarding</div>
                          <div className="font-medium">
                            {safeGet(vyosConfig, 'service.dns.forwarding', null) ? 'Enabled' : 'Disabled'}
                          </div>

                          <div className="text-muted-foreground">SSH Access</div>
                          <div className="font-medium">
                            Port {safeGet(vyosConfig, 'service.ssh.port.0', safeGet(vyosConfig, 'service.ssh.port[0]', 'N/A'))}
                          </div>
                          
                          <div className="text-muted-foreground">Default Gateway</div>
                          <div className="font-medium">
                            {getDefaultGateway(vyosConfig)}
                          </div>
                          
                          <div className="text-muted-foreground">Network Groups</div>
                          <div className="font-medium">
                            {Object.keys(safeGet(vyosConfig, 'firewall.group.network-group', {})).length || 0} defined
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="network">
                <NetworkInterfaces interfaces={{ 
                  ethernet: vyosConfig.interfaces.ethernet,
                  firewall: {
                    group: vyosConfig.firewall.group
                  }
                }} />
              </TabsContent>

              <TabsContent value="firewall">
                <FirewallRules firewall={vyosConfig.firewall} />
              </TabsContent>

              <TabsContent value="nat">
                <NatRules nat={vyosConfig.nat} />
              </TabsContent>

              <TabsContent value="services">
                {isConnected && (
                  <Services services={vyosConfig.service} dhcpLeases={dhcpLeases} />
                )}
              </TabsContent>

              <TabsContent value="system">
                <SystemInfo system={vyosConfig.system} />
              </TabsContent>

              <TabsContent value="debug">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Debug Information</CardTitle>
                      <CardDescription>Raw data loaded from API</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Force refresh by discarding current data
                        clearConnectionState();
                        window.location.reload();
                      }}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="max-h-[500px] overflow-auto space-y-6">
                    <div>
                      <h3 className="text-md font-semibold mb-2">Connection Parameters:</h3>
                      <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(connectionParams, null, 2)}</pre>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-semibold mb-2">Raw API Response:</h3>
                      <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(vyosConfig?.rawResponse, null, 2)}</pre>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-semibold mb-2">Configuration Status:</h3>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <span className="font-medium">Success:</span>
                          <span>{vyosConfig?.rawResponse?.success?.toString() || 'undefined'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium">Message:</span>
                          <span>{vyosConfig?.rawResponse?.message || 'No message'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium">Data Present:</span>
                          <span>{vyosConfig?.rawResponse?.data ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium">Config Structure:</span>
                          <span>
                            data{vyosConfig?.rawResponse?.data ? '✓' : '✗'} → 
                            config{vyosConfig?.rawResponse?.data?.config ? '✓' : '✗'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium">Data Path Used:</span>
                          <span>
                            {vyosConfig?.rawResponse?.data?.config 
                              ? 'response.data.config' 
                              : vyosConfig?.rawResponse?.data 
                                ? 'response.data' 
                                : 'direct data'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-semibold mb-2">Activity Log:</h3>
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs text-muted-foreground">
                          {debugInfo.length} {debugInfo.length === 1 ? 'entry' : 'entries'} recorded
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={clearDebugInfo}
                          className="flex items-center gap-1 h-7 px-2"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span className="text-xs">Clear Log</span>
                        </Button>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-60 overflow-auto">
                          {debugInfo.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No activity recorded yet.
                            </div>
                          ) : (
                            <div className="divide-y">
                              {debugInfo.map((info, index) => (
                                <div 
                                  key={index} 
                                  className={`p-2 text-sm ${
                                    info.type === 'error' 
                                      ? 'bg-red-50' 
                                      : info.type === 'response' 
                                        ? 'bg-green-50' 
                                        : 'bg-blue-50'
                                  }`}
                                >
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>{info.type.toUpperCase()}</span>
                                    <span>{new Date(info.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  {info.endpoint && <div>Endpoint: {info.endpoint}</div>}
                                  {info.message && <div>Message: {info.message}</div>}
                                  {info.status && <div>Status: {info.status}</div>}
                                  {info.data && (
                                    <div className="mt-1">
                                      <details>
                                        <summary className="cursor-pointer text-xs">Data</summary>
                                        <pre className="mt-1 p-1 bg-white/50 rounded text-xs overflow-auto max-h-20">
                                          {JSON.stringify(info.data, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-md font-semibold mb-2">Processed Configuration:</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium">Interfaces:</h4>
                          <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(vyosConfig?.interfaces, null, 2)}</pre>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium">Firewall:</h4>
                          <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(vyosConfig?.firewall, null, 2)}</pre>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium">NAT:</h4>
                          <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(vyosConfig?.nat, null, 2)}</pre>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium">Service:</h4>
                          <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(vyosConfig?.service, null, 2)}</pre>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium">System:</h4>
                          <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(vyosConfig?.system, null, 2)}</pre>
                        </div>

                        <div>
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium bg-blue-50 p-2 rounded">DHCP Data:</h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={async () => {
                                try {
                                  // Log that we're starting the fetch
                                  addDebugInfo({
                                    type: 'info',
                                    message: 'Manually fetching DHCP data from debug tab',
                                    data: { connectionParams }
                                  });
                                  
                                  // Fetch DHCP data
                                  console.log("Debug tab: Fetching DHCP leases...");
                                  const dhcpResponse = await getDhcpConfig(connectionParams);
                                  console.log("Debug tab: DHCP Response:", dhcpResponse);
                                  
                                  // Log successful response
                                  addDebugInfo({
                                    type: 'response',
                                    endpoint: 'get-dhcp-config',
                                    status: 200,
                                    message: 'DHCP data retrieved from debug tab',
                                    data: dhcpResponse
                                  });
                                  
                                  // Update state with response
                                  if (dhcpResponse.success && dhcpResponse.data) {
                                    // Process the DHCP data
                                    const processedData: any = {
                                      // Store the original response for debugging
                                      raw: dhcpResponse.data,
                                      // Store configuration
                                      dhcp_config: dhcpResponse.data.dhcp_config,
                                    };
                                    
                                    // Process structured lease data if available
                                    if (dhcpResponse.data.dhcp_leases && dhcpResponse.data.dhcp_leases.structured) {
                                      // Transform leases into expected format
                                      const leasesByNetwork: Record<string, any[]> = {};
                                      
                                      // Get the configured DHCP networks and subnets for matching
                                      const configuredNetworks: Record<string, string[]> = {};
                                      if (dhcpResponse.data.dhcp_config && dhcpResponse.data.dhcp_config['shared-network-name']) {
                                        const networks = dhcpResponse.data.dhcp_config['shared-network-name'];
                                        for (const networkName in networks) {
                                          if (networks[networkName].subnet) {
                                            configuredNetworks[networkName] = Object.keys(networks[networkName].subnet);
                                          }
                                        }
                                      }
                                      
                                      console.log("Configured DHCP networks:", configuredNetworks);
                                      
                                      // Function to check if IP is in subnet
                                      const isIpInSubnet = (ip: string, subnet: string): boolean => {
                                        try {
                                          // Simple string-based check - is the IP part of the subnet prefix?
                                          // For example, IP 192.168.0.9 would match 192.168.0.0/24
                                          const subnetPrefix = subnet.split('/')[0].slice(0, -1); // Remove last digit and CIDR
                                          return ip.startsWith(subnetPrefix);
                                        } catch (error) {
                                          console.error("Error checking if IP is in subnet:", error);
                                          return false;
                                        }
                                      };
                                      
                                      // Helper to find which network an IP belongs to
                                      const findNetworkForIp = (ip: string): string => {
                                        for (const networkName in configuredNetworks) {
                                          const subnets = configuredNetworks[networkName];
                                          for (const subnet of subnets) {
                                            if (isIpInSubnet(ip, subnet)) {
                                              return networkName;
                                            }
                                          }
                                        }
                                        return 'default'; // If no match found
                                      };
                                      
                                      // Process each lease in the structured array
                                      dhcpResponse.data.dhcp_leases.structured.forEach((lease: any) => {
                                        // Find network for this IP
                                        const networkName = findNetworkForIp(lease.ip_address);
                                        
                                        // Create the network entry if it doesn't exist
                                        if (!leasesByNetwork[networkName]) {
                                          leasesByNetwork[networkName] = [];
                                        }
                                        
                                        // Transform to our expected format
                                        leasesByNetwork[networkName].push({
                                          ip: lease.ip_address,
                                          mac: lease.mac_address,
                                          hostname: lease.hostname || 'Unknown',
                                          expiry: lease.ends,
                                          state: lease.binding_state
                                        });
                                      });
                                      
                                      // Store the processed leases
                                      processedData.leases = leasesByNetwork;
                                      
                                      console.log("Processed DHCP leases:", processedData.leases);
                                      addDebugInfo({
                                        type: 'info',
                                        message: 'DHCP lease data processed',
                                        data: { 
                                          leaseCount: Object.values(leasesByNetwork).flat().length,
                                          networks: Object.keys(leasesByNetwork),
                                          configuredNetworks
                                        }
                                      });
                                    } else {
                                      // No structured lease data found
                                      processedData.leases = {};
                                      console.log("No structured DHCP lease data found");
                                    }
                                    
                                    setDhcpLeases(processedData);
                                    
                                    // Save in connection state
                                    const savedState = getConnectionState();
                                    if (savedState) {
                                      saveConnectionState({
                                        ...savedState,
                                        dhcpLeases: processedData
                                      });
                                    }
                                  }
                                } catch (error) {
                                  console.error("Debug tab: Error fetching DHCP leases:", error);
                                  addDebugInfo({
                                    type: 'error',
                                    message: 'Failed to fetch DHCP leases from debug tab',
                                    details: error instanceof Error ? error.message : String(error)
                                  });
                                }
                              }}
                            >
                              Fetch DHCP Data
                            </Button>
                          </div>
                          <pre className="text-xs bg-muted p-2 rounded mt-2">{JSON.stringify(dhcpLeases, null, 2)}</pre>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium bg-blue-50 p-2 rounded">DHCP Response Logs:</h4>
                          <div className="max-h-60 overflow-auto">
                            {debugInfo
                              .filter(info => info.endpoint === 'get-dhcp-config' || (info.message && info.message.includes('DHCP')))
                              .map((info, index) => (
                                <div 
                                  key={`dhcp-${index}`} 
                                  className={`p-2 text-sm ${
                                    info.type === 'error' 
                                      ? 'bg-red-50' 
                                      : info.type === 'response' 
                                        ? 'bg-green-50' 
                                        : 'bg-blue-50'
                                  } mb-2 border rounded`}
                                >
                                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                    <span>{info.type.toUpperCase()}</span>
                                    <span>{new Date(info.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  {info.endpoint && <div>Endpoint: {info.endpoint}</div>}
                                  {info.message && <div>Message: {info.message}</div>}
                                  {info.status && <div>Status: {info.status}</div>}
                                  {info.data && (
                                    <div className="mt-1">
                                      <details open>
                                        <summary className="cursor-pointer text-xs">Data</summary>
                                        <pre className="mt-1 p-1 bg-white/50 rounded text-xs overflow-auto max-h-40">
                                          {JSON.stringify(info.data, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}

