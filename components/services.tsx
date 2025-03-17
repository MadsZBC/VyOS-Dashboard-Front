import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Server, Database, Clock, Wifi, RefreshCw, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getDhcpConfig } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import IPAddressMap from "./ip-address-map"

interface DHCPServerSharedNetworkSubnet {
  "default-router"?: string;
  "domain-name"?: string;
  "lease"?: string;
  "name-server"?: string[];
  "range"?: {
    [key: string]: {
      start?: string;
      stop?: string;
    };
  };
}

interface DHCPServerSharedNetwork {
  subnet: Record<string, DHCPServerSharedNetworkSubnet>;
}

interface ServicesProps {
  services: {
    "dhcp-server"?: {
      "shared-network-name"?: Record<string, DHCPServerSharedNetwork>;
    };
    dns?: {
      forwarding?: {
        "allow-from"?: string[];
        "listen-address"?: string[];
        "cache-size"?: string;
      };
    };
    ntp?: {
      "allow-client"?: {
        address?: string[];
      };
      server?: Record<string, any>;
    };
    ssh?: {
      port?: string[];
      "client-keepalive-interval"?: string;
      "disable-password-authentication"?: Record<string, never>;
    };
    [key: string]: any;
  };
  dhcpLeases?: DHCPLeases | null;
}

// Add interface for DHCP leases
interface DHCPLease {
  ip: string;
  mac: string;
  hostname: string;
  expiry: string;
  state: string;
}

interface DHCPLeases {
  leases?: Record<string, DHCPLease[]>;
  dhcp_config?: any;
}

// Extract lease information from the DHCP status if available
const extractLeasesFromStatus = (dhcpData: any) => {
  // If we already have a structured leases object, return it
  if (dhcpData.leases && Object.keys(dhcpData.leases).length > 0) {
    return dhcpData.leases;
  }

  // Try to extract leases from the dhcp_status if available
  if (dhcpData.dhcp_status && dhcpData.dhcp_status.leases) {
    try {
      // Create a leases object with the network name as the key
      const extractedLeases: Record<string, DHCPLease[]> = {};
      
      // Example conversion, adjust based on actual response format
      Object.entries(dhcpData.dhcp_status.leases).forEach(([ip, leaseData]: [string, any]) => {
        const networkName = leaseData.network || 'default';
        
        if (!extractedLeases[networkName]) {
          extractedLeases[networkName] = [];
        }
        
        extractedLeases[networkName].push({
          ip: ip,
          mac: leaseData.mac || 'Unknown',
          hostname: leaseData.hostname || 'Unknown',
          expiry: leaseData.expiry || new Date().toISOString(),
          state: leaseData.state || 'active'
        });
      });
      
      return extractedLeases;
    } catch (error) {
      console.error("Error extracting leases from DHCP status:", error);
      return {};
    }
  }
  
  // If we get here, we couldn't find any lease information
  return {};
};

export default function Services({ services, dhcpLeases: initialDhcpLeases }: ServicesProps) {
  const { toast } = useToast();
  const [dhcpLeases, setDhcpLeases] = useState<DHCPLeases | null>(initialDhcpLeases || null);
  const [leasesLoading, setLeasesLoading] = useState(false);
  const [connectionParams, setConnectionParams] = useState<any>(null);

  // Get connection params from localStorage to use for API calls
  useEffect(() => {
    const savedState = localStorage.getItem('connection-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.connectionParams) {
          setConnectionParams(parsed.connectionParams);
        }
      } catch (e) {
        console.error('Error parsing saved connection state:', e);
      }
    }
  }, []);

  // Process DHCP data to extract leases information
  useEffect(() => {
    if (initialDhcpLeases) {
      // Try to extract lease information from the DHCP data
      const leases = extractLeasesFromStatus(initialDhcpLeases);
      
      // Check if we have any leases
      if (Object.keys(leases).length > 0) {
        console.log("Extracted leases:", leases);
        setDhcpLeases({
          ...initialDhcpLeases,
          leases
        });
      } else {
        // Just use the data as is
        setDhcpLeases(initialDhcpLeases);
      }
    }
  }, [initialDhcpLeases]);

  // Function to fetch DHCP leases
  const fetchDhcpLeases = async () => {
    if (!connectionParams) {
      toast({
        title: "Cannot fetch DHCP leases",
        description: "No active connection parameters found",
        variant: "destructive",
      });
      return;
    }

    setLeasesLoading(true);
    try {
      const response = await getDhcpConfig(connectionParams);
      console.log("DHCP leases response:", response);
      
      if (response.success && response.data) {
        // Handle both data formats
        let formattedData: DHCPLeases = {};
        
        if (response.data.dhcp_config) {
          // If the response has the dhcp_config structure
          formattedData = {
            leases: response.data.leases || {},
            dhcp_config: response.data.dhcp_config
          };
        } else {
          // Use existing format
          formattedData = response.data;
        }
        
        setDhcpLeases(formattedData);
        toast({
          title: "DHCP leases retrieved",
          description: "Successfully fetched DHCP lease information"
        });
      } else {
        toast({
          title: "Failed to get DHCP leases",
          description: response.message || "No lease data available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching DHCP leases:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch DHCP leases",
        variant: "destructive",
      });
    } finally {
      setLeasesLoading(false);
    }
  };

  // Calculate time remaining from expiry timestamp
  const getTimeRemaining = (expiry: string) => {
    try {
      // Parse date from format like "2025/03/18 19:56:42"
      const parts = expiry.split(' ');
      if (parts.length !== 2) return "Invalid date";
      
      const dateParts = parts[0].split('/');
      const timeParts = parts[1].split(':');
      
      if (dateParts.length !== 3 || timeParts.length !== 3) return "Invalid date format";
      
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
      const day = parseInt(dateParts[2]);
      const hour = parseInt(timeParts[0]);
      const minute = parseInt(timeParts[1]);
      const second = parseInt(timeParts[2]);
      
      const expiryTime = new Date(year, month, day, hour, minute, second).getTime();
      const now = new Date().getTime();
      const diff = expiryTime - now;
      
      if (diff <= 0) return "Expired";
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    } catch (error) {
      console.error("Error calculating time remaining:", error);
      return "Unknown";
    }
  };

  return (
    <div className="grid gap-4">
      <Tabs defaultValue="dhcp">
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="dhcp" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline-flex">DHCP</span>
          </TabsTrigger>
          <TabsTrigger value="leases" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline-flex">Leases</span>
          </TabsTrigger>
          <TabsTrigger value="dns" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            <span className="hidden sm:inline-flex">DNS</span>
          </TabsTrigger>
          <TabsTrigger value="ntp" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline-flex">NTP</span>
          </TabsTrigger>
          <TabsTrigger value="ssh" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline-flex">SSH</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dhcp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                DHCP Server
              </CardTitle>
              <CardDescription>Dynamic Host Configuration Protocol server settings</CardDescription>
            </CardHeader>
            <CardContent>
              {services["dhcp-server"] ? (
                <div className="space-y-6">
                  {services["dhcp-server"]["shared-network-name"] && 
                    Object.entries(services["dhcp-server"]["shared-network-name"]).map(
                    ([networkName, networkConfig]) => (
                      <div key={networkName} className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium">{networkName} Network</h3>
                        </div>

                        {Object.entries(networkConfig.subnet).map(([subnet, subnetConfig]) => (
                          <div key={subnet} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium">Subnet: {subnet}</h4>
                              <Badge>Active</Badge>
                            </div>

                            <Table>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">Default Router</TableCell>
                                  <TableCell>{subnetConfig["default-router"]}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Domain Name</TableCell>
                                  <TableCell>{subnetConfig["domain-name"]}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Lease Time</TableCell>
                                  <TableCell>{subnetConfig.lease} seconds</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">Name Servers</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {subnetConfig["name-server"]?.map((server: string, i: number) => (
                                        <Badge key={i} variant="outline">
                                          {server}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-medium">IP Range</TableCell>
                                  <TableCell>
                                    {subnetConfig.range && Object.entries(subnetConfig.range).map(([rangeId, range]) => (
                                      <div key={rangeId} className="flex items-center gap-2">
                                        <span>{range.start}</span>
                                        <span>-</span>
                                        <span>{range.stop}</span>
                                      </div>
                                    ))}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                            
                            {/* Add IP Address Map visualization */}
                            <div className="mt-4">
                              <h5 className="text-sm font-medium mb-2">IP Address Visualization</h5>
                              <IPAddressMap 
                                subnet={subnet}
                                dhcpRange={
                                  subnetConfig.range && Object.values(subnetConfig.range)[0] 
                                    ? {
                                        start: Object.values(subnetConfig.range)[0].start || "",
                                        stop: Object.values(subnetConfig.range)[0].stop || ""
                                      } 
                                    : undefined
                                }
                                leases={dhcpLeases?.leases?.[networkName] || []}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">DHCP server is not configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leases" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  DHCP Leases
                </CardTitle>
                <CardDescription>Active DHCP leases on the network</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDhcpLeases}
                disabled={leasesLoading || !connectionParams}
                className="flex items-center gap-2"
              >
                {leasesLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {!dhcpLeases && !leasesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No DHCP lease data available.</p>
                  <p className="text-sm mt-2">Click the Refresh button to fetch lease information.</p>
                </div>
              ) : leasesLoading ? (
                <div className="flex justify-center items-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* First, check if we have any structured leases data */}
                  {dhcpLeases?.leases && Object.keys(dhcpLeases.leases).length > 0 ? (
                    <>
                      {/* Find the shared network names from DHCP server config */}
                      {services["dhcp-server"] && (
                        Object.entries(services["dhcp-server"]["shared-network-name"] || {}).map(
                          ([networkName, _networkConfig]) => {
                            // Check if we have leases for this network
                            const networkLeases = dhcpLeases?.leases?.[networkName] || [];
                            
                            return (
                              <div key={networkName} className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-lg font-medium">{networkName} Network</h3>
                                  <Badge variant={networkLeases.length > 0 ? "default" : "outline"}>
                                    {networkLeases.length} Leases
                                  </Badge>
                                </div>
                                
                                {networkLeases.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>MAC Address</TableHead>
                                        <TableHead>Hostname</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead>Time Left</TableHead>
                                        <TableHead>State</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {networkLeases.map((lease, index) => (
                                        <TableRow key={`${lease.ip}-${index}`}>
                                          <TableCell className="font-medium">{lease.ip}</TableCell>
                                          <TableCell>{lease.mac}</TableCell>
                                          <TableCell>{lease.hostname || "Unknown"}</TableCell>
                                          <TableCell>{new Date(lease.expiry).toLocaleString()}</TableCell>
                                          <TableCell>{getTimeRemaining(lease.expiry)}</TableCell>
                                          <TableCell>
                                            <Badge variant={lease.state === "active" ? "default" : "outline"}>
                                              {lease.state}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <div className="text-center py-4 border rounded-md text-muted-foreground">
                                    No active leases for this network
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )
                      )}
                      
                      {/* If there are leases that don't match any configured network */}
                      {dhcpLeases.leases && Object.entries(dhcpLeases.leases)
                        .filter(([networkName, _]) => 
                          !services["dhcp-server"] || 
                          !services["dhcp-server"]["shared-network-name"] ||
                          !services["dhcp-server"]["shared-network-name"][networkName]
                        )
                        .map(([networkName, leases]) => (
                          <div key={networkName} className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-medium">{networkName} Network</h3>
                              <Badge variant="secondary">
                                {leases.length} Leases (Unconfigured Network)
                              </Badge>
                            </div>
                            
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>IP Address</TableHead>
                                  <TableHead>MAC Address</TableHead>
                                  <TableHead>Hostname</TableHead>
                                  <TableHead>Expiry</TableHead>
                                  <TableHead>Time Left</TableHead>
                                  <TableHead>State</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {leases.map((lease, index) => (
                                  <TableRow key={`${lease.ip}-${index}`}>
                                    <TableCell className="font-medium">{lease.ip}</TableCell>
                                    <TableCell>{lease.mac}</TableCell>
                                    <TableCell>{lease.hostname || "Unknown"}</TableCell>
                                    <TableCell>{new Date(lease.expiry).toLocaleString()}</TableCell>
                                    <TableCell>{getTimeRemaining(lease.expiry)}</TableCell>
                                    <TableCell>
                                      <Badge variant={lease.state === "active" ? "default" : "outline"}>
                                        {lease.state}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                    </>
                  ) : (
                    // If we don't have structured leases data, try to display raw DHCP status
                    <div className="space-y-6">
                      <div className="text-center py-4 border rounded-md bg-muted/10">
                        <p className="text-muted-foreground">DHCP data received, but no active leases found.</p>
                        <p className="text-xs mt-1">Try refreshing if you believe there should be active leases.</p>
                      </div>
                      
                      {/* Display raw DHCP configuration if available, for debugging */}
                      {dhcpLeases?.dhcp_config && (
                        <div className="space-y-4 mt-8">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">DHCP Configuration</h3>
                            <Badge variant="outline">
                              Status: Active
                            </Badge>
                          </div>
                          
                          {/* Display a summary of the DHCP configuration */}
                          <div className="border rounded-lg p-4">
                            <div className="text-sm font-medium mb-2">Configured Networks:</div>
                            {dhcpLeases.dhcp_config["shared-network-name"] && 
                              Object.keys(dhcpLeases.dhcp_config["shared-network-name"]).map(name => (
                                <Badge key={name} className="mr-2 mb-2">{name}</Badge>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                DNS Forwarding
              </CardTitle>
              <CardDescription>Domain Name System forwarding service</CardDescription>
            </CardHeader>
            <CardContent>
              {services.dns?.forwarding ? (
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Listen Addresses</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {services.dns.forwarding["listen-address"]?.map((addr, i) => (
                            <Badge key={i} variant="outline">
                              {addr}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Allow From</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {services.dns.forwarding["allow-from"]?.map((network, i) => (
                            <Badge key={i} variant="outline">
                              {network}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Cache Size</TableCell>
                      <TableCell>{services.dns.forwarding["cache-size"] || "Default"}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-4">DNS forwarding is not configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ntp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                NTP Service
              </CardTitle>
              <CardDescription>Network Time Protocol service configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {services.ntp ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">NTP Servers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {Object.keys(services.ntp.server || {}).map((server) => (
                        <Card key={server}>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <div className="font-medium">{server}</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Client Access</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Allowed Networks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {services.ntp["allow-client"] && services.ntp["allow-client"].address && 
                                services.ntp["allow-client"].address.map((addr: string, i: number) => (
                                  <Badge key={i} variant="outline">
                                    {addr}
                                  </Badge>
                                ))
                              }
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">NTP service is not configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ssh" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                SSH Service
              </CardTitle>
              <CardDescription>Secure Shell service configuration</CardDescription>
            </CardHeader>
            <CardContent>
              {services.ssh ? (
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Port</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {services.ssh.port?.map((port, i) => (
                            <Badge key={i} variant="outline">
                              {port}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Client Keepalive Interval</TableCell>
                      <TableCell>{services.ssh["client-keepalive-interval"] || "Default"} seconds</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Password Authentication</TableCell>
                      <TableCell>
                        {services.ssh["disable-password-authentication"] ? (
                          <Badge variant="destructive">Disabled</Badge>
                        ) : (
                          <Badge variant="default">Enabled</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-4">SSH service is not configured</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

