"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Network, Shield, Globe, Server, Cpu, Wifi, RefreshCcw } from "lucide-react"
import { TabsContent } from "@/components/ui/tabs"
import { useConnectionStore } from "@/app/lib/connection-store"
import { getConnectionState, hasValidCachedData, setConnectionState } from "@/lib/connection-store"
import { vyosConfig as mockConfig } from "@/lib/vyos-data"
import { ExtendedVyosConfig, safeLength, safeGet, getDefaultGateway, getInterfaces } from "@/app/lib/utils"
import { getFullConfiguration } from "@/app/lib/vyos-api-manager"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function OverviewPage() {
  const [vyosConfig, setVyosConfig] = useState<ExtendedVyosConfig>(mockConfig as ExtendedVyosConfig)
  const [isLoading, setIsLoading] = useState(true)
  const { connectionParams } = useConnectionStore()
  const { toast } = useToast()
  
  // Function to load configuration from cache or API
  const loadConfiguration = async () => {
    if (!connectionParams) {
      toast({
        title: "Not Connected",
        description: "Please connect to a VyOS router first",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if we have valid cached data
      if (hasValidCachedData()) {
        const cachedState = getConnectionState();
        if (cachedState?.config) {
          console.log("Using cached configuration data");
          setVyosConfig(cachedState.config as ExtendedVyosConfig);
          toast({
            title: "Using Cached Data",
            description: "Loading configuration from cache",
          });
          setIsLoading(false);
          return;
        }
      }

      // If no valid cache, fetch from API
      console.log("Fetching configuration from API");
      const configResponse = await getFullConfiguration(connectionParams);
      
      if (configResponse && configResponse.success) {
        setVyosConfig(configResponse.data as ExtendedVyosConfig);
        
        // Update the cache with new data
        const cachedState = getConnectionState() || {};
        setConnectionState({
          ...cachedState,
          isConnected: true,
          config: configResponse.data,
          lastUpdate: new Date().toISOString()
        });
        
        toast({
          title: "Configuration Loaded",
          description: "Successfully loaded the router configuration",
        });
      } else {
        console.error("Failed to load configuration:", configResponse);
        toast({
          title: "Error Loading Configuration",
          description: "Couldn't retrieve router configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the router",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load configuration on initial render
  useEffect(() => {
    loadConfiguration();
  }, [connectionParams]);

  // If loading, show a simple loading state
  if (isLoading) {
    return (
      <TabsContent value="overview">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">Loading dashboard information...</div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="overview" className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={loadConfiguration}
          disabled={isLoading}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
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
                        {safeGet(vyosConfig, 'system.host-name', 'VyOS')}
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
  )
} 