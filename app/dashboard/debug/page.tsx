"use client"

import { useEffect, useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getConnectionState } from "@/lib/connection-store"
import { DebugInfo } from "@/app/lib/utils"
import { fetchDhcpData, clearDebugInfo } from "@/app/lib/debug-actions"

export default function DebugPage() {
  const [connectionState, setConnectionState] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load saved connection state on initial render
  useEffect(() => {
    const savedState = getConnectionState();
    if (savedState && savedState.isConnected) {
      if (savedState.connectionParams) {
        setConnectionState(savedState.connectionParams);
      }
      if (savedState.debugInfo) {
        setDebugInfo(savedState.debugInfo);
      }
    }
    setIsLoading(false);
  }, []);

  // Handler for fetching DHCP data
  const handleFetchDhcpData = async () => {
    const dhcpData = await fetchDhcpData();
    // Refresh debug info after fetch
    const savedState = getConnectionState();
    if (savedState && savedState.debugInfo) {
      setDebugInfo(savedState.debugInfo);
    }
  };

  // Handler for clearing debug logs
  const handleClearLogs = () => {
    console.log('Clearing logs');
    const clearedLogs = clearDebugInfo();
    setDebugInfo(clearedLogs);
  };

  // If loading, show a simple loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <TabsContent value="debug" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>
            Technical information for troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[500px] overflow-auto space-y-6">
          <div>
            <h3 className="text-md font-semibold mb-2">Connection State:</h3>
            <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(connectionState, null, 2)}</pre>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2">Debug Actions</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFetchDhcpData}
              >
                Test DHCP Leases Fetch
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearLogs}
              >
                Clear Debug Logs
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2">API Examples</h3>
            <div className="text-xs space-y-1 bg-muted p-2 rounded">
              <p><strong>DHCP Leases Endpoint:</strong> /api/vyos/dhcp</p>
              <p><strong>Config Endpoint:</strong> /api/vyos/config</p>
              <p><strong>FormData Example:</strong></p>
              <pre>
{`const formData = new FormData();
formData.append('host', 'your-router.example.com');
formData.append('port', '443');
formData.append('key', 'your-api-key');
formData.append('https', 'true');
formData.append('allowInsecure', 'false');

fetch('/api/vyos/dhcp', {
  method: 'POST',
  body: formData
})`}
              </pre>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-semibold mb-2">Debug Logs</h3>
            <div className="space-y-2">
              {debugInfo.map((entry, i) => (
                <div 
                  key={i} 
                  className={`text-xs p-2 rounded ${
                    entry.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 
                    entry.type === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                    entry.type === 'response' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold flex justify-between">
                    <span>{entry.type.toUpperCase()}:</span> 
                    <span className="text-muted-foreground">{entry.timestamp}</span>
                  </div>
                  <div>{entry.message}</div>
                  {entry.endpoint && <div className="text-muted-foreground">Endpoint: {entry.endpoint}</div>}
                  {entry.status && <div>Status: {entry.status}</div>}
                  {entry.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">Details</summary>
                      <pre className="mt-1 whitespace-pre-wrap">{
                        typeof entry.details === 'object' 
                          ? JSON.stringify(entry.details, null, 2) 
                          : entry.details
                      }</pre>
                    </details>
                  )}
                  {entry.data && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">Response Data</summary>
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(entry.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
              {debugInfo.length === 0 && (
                <div className="text-center text-muted-foreground text-sm p-4">
                  No debug information available yet.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
} 