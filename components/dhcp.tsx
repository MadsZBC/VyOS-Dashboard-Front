"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface DHCPProps {
  dhcpData: any;
  onRefresh?: () => void;
}

export default function DHCP({ dhcpData, onRefresh }: DHCPProps) {
  const [leases, setLeases] = useState<any[]>([]);
  const [leasesFormat, setLeasesFormat] = useState<string>("unknown");
  
  // Process DHCP data in various possible formats
  useEffect(() => {
    console.log("DHCP component received data:", dhcpData);
    
    if (!dhcpData) {
      setLeases([]);
      return;
    }
    
    // Try to determine the format of the leases data
    const processedLeases: any[] = [];
    
    try {
      // Format could be different based on what API returns
      // Log the structure to help debug
      console.log("DHCP data keys:", Object.keys(dhcpData));
      
      // Case 1: Direct leases array
      if (Array.isArray(dhcpData)) {
        setLeasesFormat("array");
        dhcpData.forEach((lease, index) => {
          processedLeases.push({
            id: index.toString(),
            ip: lease.ip || lease.address || "Unknown",
            mac: lease.mac || lease["mac-address"] || lease.hardware || "Unknown",
            hostname: lease.hostname || lease.host || lease.client || "Unknown",
            expires: lease.expires || lease.end || "Unknown"
          });
        });
      }
      // Case 2: Leases as object with pool/subnet structure
      else if (dhcpData.pool || dhcpData.subnet) {
        setLeasesFormat("pool");
        const pool = dhcpData.pool || dhcpData.subnet;
        Object.entries(pool).forEach(([subnet, leaseData]: [string, any]) => {
          if (leaseData && leaseData.leases) {
            Object.entries(leaseData.leases).forEach(([ip, lease]: [string, any]) => {
              processedLeases.push({
                id: ip,
                ip: ip,
                mac: lease.mac || lease["mac-address"] || "Unknown",
                hostname: lease.hostname || lease.host || "Unknown",
                expires: lease.expires || lease.end || "Unknown",
                subnet
              });
            });
          }
        });
      } 
      // Case 3: VyOS format with objects by IP address
      else {
        setLeasesFormat("vyos");
        // Try to extract data from various possible structures
        let leaseEntries: [string, any][] = [];
        
        if (Object.keys(dhcpData).some(key => key.includes('.'))) {
          // Directly IP addresses as keys
          leaseEntries = Object.entries(dhcpData);
        } else if (dhcpData.leases && typeof dhcpData.leases === 'object') {
          leaseEntries = Object.entries(dhcpData.leases);
        } else if (dhcpData.server && dhcpData.server.leases) {
          leaseEntries = Object.entries(dhcpData.server.leases);
        }

        leaseEntries.forEach(([ip, lease]) => {
          if (typeof lease === 'object') {
            processedLeases.push({
              id: ip,
              ip: ip,
              mac: lease.mac || lease["mac-address"] || lease["hardware-address"] || "Unknown",
              hostname: lease.hostname || lease.host || lease["client-hostname"] || "Unknown",
              expires: lease.expires || lease.end || lease["expiry"] || "Unknown",
              state: lease.state || "active"
            });
          }
        });
      }
      
      console.log("Processed leases:", processedLeases);
      setLeases(processedLeases);
    } catch (err) {
      console.error("Error processing DHCP data:", err);
      console.log("Raw DHCP data:", dhcpData);
      // Store raw data for debugging
      setLeases([{
        id: "error",
        ip: "Error processing data",
        mac: "See console for details",
        hostname: String(err),
        expires: "N/A"
      }]);
    }
  }, [dhcpData]);

  return (
    <Card className="col-span-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">DHCP Leases</CardTitle>
          <CardDescription>Active DHCP address assignments</CardDescription>
        </div>
        {onRefresh && (
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh DHCP data">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {leases.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No active DHCP leases found
          </div>
        ) : (
          <Table>
            <TableCaption>DHCP active leases (Format: {leasesFormat})</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">IP Address</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((lease) => (
                <TableRow key={lease.id}>
                  <TableCell className="font-medium">{lease.ip}</TableCell>
                  <TableCell>{lease.mac}</TableCell>
                  <TableCell>{lease.hostname}</TableCell>
                  <TableCell>{lease.expires}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={lease.state === "expired" ? "outline" : "default"}>
                      {lease.state || "active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {dhcpData && Object.keys(dhcpData).length > 0 && leases.length === 0 && (
          <div className="mt-4 p-4 border rounded bg-muted">
            <h3 className="font-medium mb-2">Debug: Raw DHCP Data</h3>
            <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[200px]">
              {JSON.stringify(dhcpData, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 