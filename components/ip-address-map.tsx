import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IPAddressMapProps {
  subnet: string;
  dhcpRange?: {
    start: string;
    stop: string;
  };
  usedIPs?: string[];
  leases?: Array<{
    ip: string;
    mac: string;
    hostname: string;
    expiry: string;
    state: string;
  }>;
}

export default function IPAddressMap({ subnet, dhcpRange, usedIPs = [], leases = [] }: IPAddressMapProps) {
  // Parse subnet information
  const parsedSubnet = useMemo(() => {
    const [network, cidr] = subnet.split('/');
    const cidrNum = parseInt(cidr);
    
    if (!network || isNaN(cidrNum)) {
      return null;
    }
    
    const networkParts = network.split('.');
    if (networkParts.length !== 4) {
      return null;
    }
    
    return {
      network,
      cidr: cidrNum,
      networkParts: networkParts.map(part => parseInt(part)),
    };
  }, [subnet]);
  
  // Generate IP list
  const ipAddresses = useMemo(() => {
    if (!parsedSubnet) return [];
    
    const { networkParts, cidr } = parsedSubnet;
    
    // Only handle /24 or smaller networks to avoid generating too many IPs
    if (cidr < 24) {
      return []; // Too many IPs to display
    }
    
    const baseIP = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`;
    const ipList = [];
    
    // Create a map of used IPs for quick lookup
    const usedIPMap = new Map();
    usedIPs.forEach(ip => usedIPMap.set(ip, true));
    
    // Create a map of leased IPs with their details
    const leaseMap = new Map();
    leases.forEach(lease => {
      leaseMap.set(lease.ip, lease);
      usedIPMap.set(lease.ip, true); // Also mark as used
    });
    
    // Parse DHCP range
    let dhcpStart = 0;
    let dhcpEnd = 255;
    
    if (dhcpRange) {
      const startParts = dhcpRange.start.split('.');
      const stopParts = dhcpRange.stop.split('.');
      
      if (startParts.length === 4 && stopParts.length === 4) {
        dhcpStart = parseInt(startParts[3]);
        dhcpEnd = parseInt(stopParts[3]);
      }
    }
    
    // Calculate network and broadcast addresses
    const networkAddress = `${baseIP}.0`;
    const broadcastAddress = `${baseIP}.255`;
    
    // Add all IPs in the range
    for (let i = 0; i <= 255; i++) {
      const ip = `${baseIP}.${i}`;
      const isNetworkAddress = i === 0;
      const isBroadcastAddress = i === 255;
      const isInDhcpRange = i >= dhcpStart && i <= dhcpEnd;
      const isUsed = usedIPMap.has(ip);
      const lease = leaseMap.get(ip);
      
      ipList.push({
        ip,
        isUsed,
        isNetworkAddress,
        isBroadcastAddress,
        isInDhcpRange,
        lease,
      });
    }
    
    return ipList;
  }, [parsedSubnet, usedIPs, leases, dhcpRange]);
  
  if (!parsedSubnet) {
    return <div>Invalid subnet format</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>IP Address Map: {subnet}</span>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="bg-green-100">Available</Badge>
            <Badge variant="outline" className="bg-red-100">In Use</Badge>
            <Badge variant="outline" className="bg-gray-100">Reserved</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-1">
            {ipAddresses.map(({ ip, isUsed, isNetworkAddress, isBroadcastAddress, isInDhcpRange, lease }) => {
              let bgColor = "bg-gray-100"; // Default for non-DHCP range
              let tooltipContent = ip;
              
              if (isNetworkAddress) {
                bgColor = "bg-blue-100";
                tooltipContent = `${ip} (Network Address)`;
              } else if (isBroadcastAddress) {
                bgColor = "bg-blue-100";
                tooltipContent = `${ip} (Broadcast Address)`;
              } else if (isInDhcpRange) {
                bgColor = isUsed ? "bg-red-100" : "bg-green-100";
                
                if (lease) {
                  tooltipContent = `${ip}\nMAC: ${lease.mac}\nHostname: ${lease.hostname}\nExpiry: ${lease.expiry}`;
                }
              }
              
              return (
                <Tooltip key={ip}>
                  <TooltipTrigger asChild>
                    <div 
                      className={`h-6 rounded ${bgColor} text-xs flex items-center justify-center cursor-pointer`}
                      onClick={() => console.log(`IP: ${ip}, Used: ${isUsed}`, lease)}
                    >
                      {ip.split('.')[3]}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <pre className="text-xs">{tooltipContent}</pre>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
} 