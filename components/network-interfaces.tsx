import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Network, Wifi } from "lucide-react"

interface EthernetInterface {
  address?: string[] | string;
  description?: string;
  duplex?: string;
  "hw-id"?: string;
  hw_id?: string;
  smp_affinity?: string;
  speed?: string;
  disable?: boolean;
  mtu?: string | number;
}

interface InterfaceGroup {
  interface?: string[];
}

interface NetworkGroup {
  network?: string[];
}

interface FirewallGroup {
  "interface-group"?: Record<string, InterfaceGroup>;
  "network-group"?: Record<string, NetworkGroup>;
}

interface NetworkInterfacesProps {
  interfaces: {
    ethernet?: Record<string, EthernetInterface>;
    firewall?: {
      group?: FirewallGroup;
    };
  };
}

export default function NetworkInterfaces({ interfaces }: NetworkInterfacesProps) {
  // Ensure ethernet interfaces exist or default to empty object
  const ethernetInterfaces = interfaces?.ethernet || {};
  
  // Safely get firewall groups
  const interfaceGroups = interfaces?.firewall?.group?.["interface-group"] || {};
  const networkGroups = interfaces?.firewall?.group?.["network-group"] || {};

  // Check if we have any interfaces
  const hasInterfaces = Object.keys(ethernetInterfaces).length > 0;
  const hasInterfaceGroups = Object.keys(interfaceGroups).length > 0;
  const hasNetworkGroups = Object.keys(networkGroups).length > 0;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Interfaces
          </CardTitle>
          <CardDescription>Physical network interfaces and their configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {hasInterfaces ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Interface</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>MAC Address</TableHead>
                  <TableHead>MTU</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(ethernetInterfaces).map(([name, config]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{config?.description || "-"}</TableCell>
                    <TableCell>
                      {config?.address ? (
                        <div className="space-y-1">
                          {Array.isArray(config.address) && config.address.length > 0 ? (
                            config.address.map((addr, i) => (
                              <Badge key={i} variant="outline">
                                {addr}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">{typeof config.address === 'string' ? config.address : 'Unknown'}</Badge>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{config?.["hw-id"] || config?.hw_id || "-"}</TableCell>
                    <TableCell>{config?.mtu || "1500"}</TableCell>
                    <TableCell>
                      <Badge variant={name === "eth0" ? "default" : "secondary"}>{name === "eth0" ? "WAN" : "LAN"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No network interfaces found</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Network Groups
          </CardTitle>
          <CardDescription>Defined network groups for firewall rules</CardDescription>
        </CardHeader>
        <CardContent>
          {hasInterfaceGroups || hasNetworkGroups ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hasInterfaceGroups && Object.entries(interfaceGroups).map(([name, config]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>Interface Group</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(config?.interface) && config.interface.length > 0 ? (
                          config.interface.map((intf: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {intf}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No interfaces</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {hasNetworkGroups && Object.entries(networkGroups).map(([name, config]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>Network Group</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(config?.network) && config.network.length > 0 ? (
                          config.network.map((net: string, i: number) => (
                            <Badge key={i} variant="outline">
                              {net}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No networks</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No network groups found</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

