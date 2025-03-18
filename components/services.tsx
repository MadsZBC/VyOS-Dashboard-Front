import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Server, Database, Clock, Wifi, RefreshCw, Users, Globe, Terminal, Settings } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { getVyOSDhcpLeases } from "@/lib/api"
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
  remaining: string;
  pool: string;
  leaseStart: string;
  origin: string;
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
          state: leaseData.state || 'active',
          remaining: leaseData.remaining || 'Unknown',
          pool: leaseData.pool || 'Unknown',
          leaseStart: leaseData.leaseStart || 'Unknown',
          origin: leaseData.origin || 'Unknown'
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
      const response = await getVyOSDhcpLeases(connectionParams);
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
            <span>DHCP Server</span>
          </TabsTrigger>
          <TabsTrigger value="dns" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>DNS</span>
          </TabsTrigger>
          <TabsTrigger value="ssh" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>SSH</span>
          </TabsTrigger>
          <TabsTrigger value="ntp" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>NTP</span>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Other</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dhcp">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>DHCP Leases</CardTitle>
                    <CardDescription>Currently active DHCP leases</CardDescription>
                  </div>
                  <Button 
                    onClick={fetchDhcpLeases} 
                    size="sm" 
                    className="flex items-center gap-2"
                    disabled={leasesLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${leasesLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dhcpLeases?.leases && Object.keys(dhcpLeases.leases).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>IP Address</TableHead>
                        <TableHead>MAC Address</TableHead>
                        <TableHead>Hostname</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(dhcpLeases.leases).flatMap(([network, leases]) =>
                        leases.map((lease, i) => (
                          <TableRow key={`${network}-${lease.ip || i}`}>
                            <TableCell className="font-medium">{lease.ip}</TableCell>
                            <TableCell>{lease.mac}</TableCell>
                            <TableCell>{lease.hostname}</TableCell>
                            <TableCell>
                              <Badge variant={lease.state === 'active' ? 'default' : 'secondary'}>
                                {lease.state}
                              </Badge>
                            </TableCell>
                            <TableCell>{lease.remaining || 'Unknown'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No active DHCP leases</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      There are currently no devices with active DHCP leases on your network.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                          {Array.isArray(services.dns.forwarding["listen-address"]) && services.dns.forwarding["listen-address"].length > 0 ? (
                            services.dns.forwarding["listen-address"].map((addr, i) => (
                              <Badge key={i} variant="outline">
                                {addr}
                              </Badge>
                            ))
                          ) : (
                            services.dns.forwarding["listen-address"] ? (
                              <Badge variant="outline">
                                {services.dns.forwarding["listen-address"]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">None specified</span>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Allow From</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(services.dns.forwarding["allow-from"]) && services.dns.forwarding["allow-from"].length > 0 ? (
                            services.dns.forwarding["allow-from"].map((network, i) => (
                              <Badge key={i} variant="outline">
                                {network}
                              </Badge>
                            ))
                          ) : (
                            services.dns.forwarding["allow-from"] ? (
                              <Badge variant="outline">
                                {services.dns.forwarding["allow-from"]}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">None specified</span>
                            )
                          )}
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
                          {Array.isArray(services.ssh.port) && services.ssh.port.length > 0 ? (
                            services.ssh.port.map((port, i) => (
                              <Badge key={i} variant="outline">
                                {port}
                              </Badge>
                            ))
                          ) : (
                            services.ssh.port ? (
                              <Badge variant="outline">
                                {services.ssh.port}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Default (22)</span>
                            )
                          )}
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
                              {services.ntp["allow-client"] && services.ntp["allow-client"].address ? (
                                Array.isArray(services.ntp["allow-client"].address) && services.ntp["allow-client"].address.length > 0 ? (
                                  services.ntp["allow-client"].address.map((addr: string, i: number) => (
                                    <Badge key={i} variant="outline">
                                      {addr}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline">
                                    {services.ntp["allow-client"].address}
                                  </Badge>
                                )
                              ) : (
                                <span className="text-muted-foreground">None specified</span>
                              )}
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

        <TabsContent value="other" className="mt-4">
          {/* Add other content here */}
        </TabsContent>
      </Tabs>
    </div>
  )
}

