"use client"

import React, { useEffect, useState } from "react"
import { useDebugStore } from "@/app/lib/debug-store"
import { useConnectionStore } from "@/app/lib/connection-store"
import { getVyOSDhcpLeases, getVyOSInterfaceStatus, getVyOSSystemStatus } from "@/app/lib/vyos-api"
import { useApiMonitor } from "@/app/lib/api-monitor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Separator } from "@/components/ui/separator"
import { 
  Terminal, 
  FileJson, 
  Download, 
  AlertCircle, 
  Server, 
  Network, 
  Database, 
  Router, 
  ShieldAlert, 
  ExternalLink, 
  Filter, 
  Trash2, 
  HardDrive,
  Play 
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  getDhcpServerInfo, 
  getInterfacesInfo, 
  getSystemMemoryInfo,
  customShowCommand,
  vyosApiCall,
  VyOSPaths,
  VyOSEndpoints,
  VyOSOperations,
  getFullConfiguration
} from "@/app/lib/vyos-api-manager"

// Helper function to format JSON for display
function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2)
}

export default function LiveDebugPage() {
  const { logs, clearLogs, toggleRecording, isRecording } = useDebugStore()
  const { connectionParams, setConnectionParams, clearConnectionParams } = useConnectionStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("requests")
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Connection form state
  const [routerIp, setRouterIp] = useState(connectionParams?.host || "")
  const [apiKey, setApiKey] = useState(connectionParams?.apiKey || "")
  const [port, setPort] = useState(connectionParams?.port?.toString() || "443")
  const [allowInsecure, setAllowInsecure] = useState(connectionParams?.allowInsecure || false)

  // State for custom API call
  const [customEndpoint, setCustomEndpoint] = useState<string>(VyOSEndpoints.SHOW);
  const [customOperation, setCustomOperation] = useState<string>(VyOSOperations.SHOW);
  const [customPath, setCustomPath] = useState<string>("");
  const [lastCustomResponse, setLastCustomResponse] = useState<any>(null);
  const [lastCustomRequest, setLastCustomRequest] = useState<any>(null);

  // Initialize API monitoring
  useApiMonitor()

  // Filter logs based on active tab
  const filteredLogs = logs.filter((log) => {
    if (activeTab === "all") return true
    if (activeTab === "requests") return log.type === "request"
    if (activeTab === "responses") return log.type === "response"
    if (activeTab === "errors") return log.type === "error"
    return true
  })

  const selectedLog = logs.find((log) => log.id === selectedLogId)

  // If a log is deleted, clear the selection if needed
  useEffect(() => {
    if (selectedLogId && !logs.some((log) => log.id === selectedLogId)) {
      setSelectedLogId(null)
    }
  }, [logs, selectedLogId])

  // If logs change and we have none selected, select the first one
  useEffect(() => {
    if (filteredLogs.length > 0 && !selectedLogId) {
      setSelectedLogId(filteredLogs[0].id)
    }
  }, [filteredLogs, selectedLogId])

  // Load connection params into form state
  useEffect(() => {
    if (connectionParams) {
      setRouterIp(connectionParams.host)
      setApiKey(connectionParams.apiKey)
      setPort(connectionParams.port?.toString() || "443")
      setAllowInsecure(connectionParams.allowInsecure || false)
    }
  }, [connectionParams])

  const handleConnect = () => {
    if (!routerIp || !apiKey) {
      toast({
        title: "Connection Error",
        description: "Please provide both Router IP and API Key",
        variant: "destructive",
      })
      return
    }

    setConnectionParams({
      host: routerIp,
      apiKey: apiKey,
      port: port ? parseInt(port) : undefined,
      allowInsecure,
    })

    toast({
      title: "Connection Saved",
      description: `Connected to ${routerIp}${port && port !== "443" ? `:${port}` : ""}`,
    })
  }

  const handleDisconnect = () => {
    clearConnectionParams()
    setRouterIp("")
    setApiKey("")
    setPort("443")
    setAllowInsecure(false)
    toast({
      title: "Disconnected",
      description: "Connection parameters cleared",
    })
  }

  const downloadLogs = () => {
    const json = JSON.stringify(logs, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `api-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Handle the API test functions using the new API manager
  const handleTestGetDhcpLeases = async () => {
    if (!connectionParams) {
      toast({
        title: "Connection Error",
        description: "Please connect to a router first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await getDhcpServerInfo(connectionParams);
      console.log('DHCP Leases Response:', response);
    } catch (error) {
      console.error('Error fetching DHCP leases:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch DHCP leases",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestGetInterfaceStatus = async () => {
    if (!connectionParams) {
      toast({
        title: "Connection Error",
        description: "Please connect to a router first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await getInterfacesInfo(connectionParams);
      console.log('Interface Status Response:', response);
    } catch (error) {
      console.error('Error fetching interface status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch interface status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSystemStatus = async () => {
    if (!connectionParams) {
      toast({
        title: "Connection Error",
        description: "Please connect to a router first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await getSystemMemoryInfo(connectionParams);
      console.log('System Status Response:', response);
    } catch (error) {
      console.error('Error fetching system status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch system status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test retrieving full configuration
  const handleTestGetConfig = async () => {
    setIsLoading(true);
    
    try {
      if (!connectionParams) {
        toast({
          title: "Connection Error",
          description: "Please connect to a router first",
          variant: "destructive"
        });
        throw new Error("No connection parameters available");
      }

      // Create a unique ID for request tracking
      const requestId = crypto.randomUUID();
      
      // Log the request
      const requestData = {
        type: 'request' as const,
        url: '/retrieve',
        method: 'POST',
        data: {
          op: 'showConfig',
          path: []
        },
        timestamp: new Date(),
        id: requestId,
        source: 'GetConfigTest'
      };
      console.log('Request:', requestData);
      
      try {
        const result = await getFullConfiguration(connectionParams);
        
        // Log the response
        const responseData = {
          id: crypto.randomUUID(),
          requestId,
          type: 'response' as const,
          status: 200,
          data: result,
          timestamp: new Date(),
          duration: 0
        };
        console.log('Response:', responseData);
        
        toast({
          title: "Config Retrieved",
          description: "Full configuration successfully retrieved",
        });
      } catch (error: any) {
        // Log the error
        const errorData = {
          id: crypto.randomUUID(),
          requestId,
          type: 'error' as const,
          error: error.message || 'Unknown error',
          timestamp: new Date(),
          stack: error.stack
        };
        console.log('Error:', errorData);
        
        toast({
          title: "API Error",
          description: error.message || "Failed to retrieve configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error in test function:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom API call handler
  const handleCustomApiCall = async () => {
    if (!connectionParams) {
      toast({
        title: "Connection Error",
        description: "Please connect to a router first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Parse the custom path from string to array
      const pathArray = customPath.split(' ').filter(Boolean);
      

      
      // Save request details for export
      const requestDetails = {
        endpoint: customEndpoint,
        operation: customOperation,
        path: pathArray,
        timestamp: new Date().toISOString()
      };
      setLastCustomRequest(requestDetails);
      
      const response = await vyosApiCall(
        connectionParams,
        customEndpoint,
        customOperation,
        pathArray
      );
      
      // Save response for export
      setLastCustomResponse({
        data: response,
        timestamp: new Date().toISOString()
      });
      
      console.log('Custom API Response:', response);
      
      toast({
        title: "Custom API Call",
        description: "API call completed successfully",
      });

      // Check if auto-export is enabled
      const shouldAutoExport = localStorage.getItem('autoExportApiCalls') === 'true';
      if (shouldAutoExport) {
        // We need to wait a moment for the lastCustomResponse state to update
        setTimeout(() => exportCustomApiCall(), 500);
      }
      
    } catch (error) {
      console.error('Error making custom API call:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute custom API call",
        variant: "destructive",
      });
      
      // Save error response
      setLastCustomResponse({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export custom API call details
  const exportCustomApiCall = () => {
    if (!lastCustomRequest || !lastCustomResponse) {
      toast({
        title: "Nothing to Export",
        description: "Please make a custom API call first",
        variant: "destructive",
      });
      return;
    }
    
    // Create export object with request and response details
    const exportData = {
      requestDetails: {
        endpoint: lastCustomRequest.endpoint,
        operation: lastCustomRequest.operation,
        path: lastCustomRequest.path,
        payload: lastCustomRequest.payload || null,
        timestamp: lastCustomRequest.timestamp
      },
      responseDetails: {
        data: lastCustomResponse.data,
        error: lastCustomResponse.error,
        timestamp: lastCustomResponse.timestamp
      },
      connectionDetails: {
        host: connectionParams?.host,
        port: connectionParams?.port,
        allowInsecure: connectionParams?.allowInsecure
      },
      executionDetails: {
        duration: lastCustomResponse.timestamp 
          ? new Date(lastCustomResponse.timestamp).getTime() - new Date(lastCustomRequest.timestamp).getTime() 
          : null,
        success: !lastCustomResponse.error
      },
      example: `
// Example API call
const response = await vyosApiCall(
  connectionParams,
  '${lastCustomRequest.endpoint}',  // endpoint
  '${lastCustomRequest.operation}', // operation
  ${JSON.stringify(lastCustomRequest.path)},  // path
  ${JSON.stringify(lastCustomRequest.payload || {})}  // payload
);
      `.trim()
    };
    
    // Create and download the export file
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyos-custom-api-call-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Custom API Call Exported",
      description: "API call details have been saved to a JSON file",
    });
  };

  // Add this function after downloadLogs
  const exportSelectedLog = () => {
    if (!selectedLog) return;
    
    // Find the matching request/response pair if possible
    let requestLog = selectedLog;
    let responseLog = null;
    
    if (selectedLog.type === 'response') {
      // If we have a response, find the matching request
      requestLog = logs.find(log => 
        log.type === 'request' && 
        log.url === selectedLog.url && 
        new Date(log.timestamp).getTime() < new Date(selectedLog.timestamp).getTime()
      ) || selectedLog;
    } else if (selectedLog.type === 'request') {
      // If we have a request, find the matching response
      responseLog = logs.find(log => 
        log.type === 'response' && 
        log.url === selectedLog.url && 
        new Date(log.timestamp).getTime() > new Date(selectedLog.timestamp).getTime()
      );
    }
    
    // Create an export object with detailed API information
    const exportData = {
      endpoint: selectedLog.url?.split('?')[0] || 'unknown',
      method: requestLog.method || 'GET',
      timestamp: new Date(selectedLog.timestamp).toISOString(),
      requestPayload: requestLog.payload || null,
      requestHeaders: requestLog.headers || null,
      responseStatus: responseLog?.status || selectedLog.status,
      responsePayload: responseLog?.payload || (selectedLog.type === 'response' ? selectedLog.payload : null),
      responseHeaders: responseLog?.headers || (selectedLog.type === 'response' ? selectedLog.headers : null),
      duration: responseLog?.duration || (selectedLog.type === 'response' ? selectedLog.duration : null),
      description: `${requestLog.method || 'GET'} ${selectedLog.url?.split('?')[0] || 'unknown'}`,
      example: `
// Example API call
const response = await vyosApiCall(
  connectionParams,
  '/show',               // endpoint
  'show',                // operation
  ['system', 'memory'],  // path - extract from the request payload if possible
  // Additional data if needed
);
      `.trim()
    };
    
    // Extract path from request payload if possible
    if (requestLog.payload?.data) {
      try {
        const dataObj = typeof requestLog.payload.data === 'string' 
          ? JSON.parse(requestLog.payload.data) 
          : requestLog.payload.data;
          
        if (dataObj.op && dataObj.path) {
          exportData.example = `
// Example API call
const response = await vyosApiCall(
  connectionParams,
  '${selectedLog.url?.includes('/show') ? '/show' : selectedLog.url?.split('/').pop() || '/show'}',  // endpoint
  '${dataObj.op}',                                           // operation
  ${JSON.stringify(dataObj.path)},  // path
  // Additional data if needed
);
          `.trim();
        }
      } catch (e) {
        console.error('Failed to parse request data', e);
      }
    }
    
    // Create and download the export file
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyos-api-${exportData.description.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Log Exported",
      description: "API details have been saved to a JSON file",
    });
  };

  // Add this function after exportSelectedLog
  const exportApiDocumentation = () => {
    // Create a complete documentation of all available API endpoints
    const documentation = {
      title: "VyOS API Documentation",
      description: "Auto-generated documentation for VyOS API endpoints",
      generatedAt: new Date().toISOString(),
      endpoints: Object.entries(VyOSEndpoints).map(([key, endpoint]) => ({
        name: key,
        endpoint,
        operations: Object.entries(VyOSOperations).map(([opKey, operation]) => ({
          name: opKey,
          operation,
          description: getOperationDescription(operation, endpoint),
        }))
      })),
      commonPaths: Object.entries(VyOSPaths).map(([category, paths]) => ({
        category,
        paths: flattenPaths(category, paths),
      })),
      exampleCalls: [
        {
          title: "Get System Memory",
          description: "Retrieve system memory information",
          code: `
const response = await vyosApiCall(
  connectionParams,
  VyOSEndpoints.SHOW,
  VyOSOperations.SHOW,
  VyOSPaths.SYSTEM.MEMORY
);
          `.trim()
        },
        {
          title: "Get DHCP Server Information",
          description: "Retrieve DHCP server shared networks",
          code: `
const response = await vyosApiCall(
  connectionParams,
  VyOSEndpoints.SHOW,
  VyOSOperations.SHOW,
  VyOSPaths.SERVICES.DHCP_SERVER.SHARED_NETWORKS
);
          `.trim()
        },
        {
          title: "Get Interface Status",
          description: "Retrieve ethernet interface information",
          code: `
const response = await vyosApiCall(
  connectionParams,
  VyOSEndpoints.SHOW,
  VyOSOperations.SHOW,
  VyOSPaths.INTERFACES.ETHERNET
);
          `.trim()
        },
        {
          title: "Custom API Call",
          description: "Make a custom API call with any path",
          code: `
// Define your custom path
const customPath = ['your', 'custom', 'path'];

const response = await vyosApiCall(
  connectionParams,
  VyOSEndpoints.SHOW,  // Use different endpoint if needed
  VyOSOperations.SHOW, // Use different operation if needed
  customPath
);
          `.trim()
        }
      ],
      recordedCalls: logs
        .filter(log => log.type === 'response' && log.url && log.status === 200)
        .slice(0, 10) // Limit to the last 10 successful responses
        .map(log => {
          // Find the matching request
          const request = logs.find(req => 
            req.type === 'request' && 
            req.url === log.url && 
            new Date(req.timestamp).getTime() < new Date(log.timestamp).getTime()
          );
          
          return {
            url: log.url,
            method: request?.method || 'GET',
            requestPayload: request?.payload || null,
            responsePayload: log.payload || null,
            duration: log.duration,
            timestamp: log.timestamp
          };
        })
    };
    
    // Helper to get operation descriptions
    function getOperationDescription(operation: string, endpoint: string) {
      switch(`${operation}:${endpoint}`) {
        case `show:/show`:
          return "Display configuration or operational state";
        case `set:/configure`:
          return "Set a configuration value";
        case `delete:/configure`:
          return "Delete a configuration node";
        case `comment:/configure`:
          return "Add a comment to a configuration node";
        default:
          return `${operation.charAt(0).toUpperCase() + operation.slice(1)} operation for ${endpoint} endpoint`;
      }
    }
    
    // Helper to flatten nested path objects
    function flattenPaths(prefix: string, obj: any, currentPath: string[] = []): any[] {
      if (Array.isArray(obj)) {
        return [{
          name: prefix,
          path: obj,
          example: `vyosApiCall(connectionParams, VyOSEndpoints.SHOW, VyOSOperations.SHOW, VyOSPaths.${currentPath.join('.')})`
        }];
      }
      
      return Object.entries(obj).flatMap(([key, value]) => {
        const newPath = [...currentPath, key];
        return flattenPaths(key, value, newPath);
      });
    }
    
    // Create and download documentation
    const json = JSON.stringify(documentation, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyos-api-documentation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "API Documentation Exported",
      description: "Complete API documentation has been saved to a JSON file",
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Live API Debug</h1>
          </div>
          <div className="flex space-x-2">
            <Button
              variant={isRecording ? "default" : "outline"}
              onClick={toggleRecording}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
            <Button variant="outline" onClick={clearLogs}>Clear</Button>
            <Button variant="outline" onClick={downloadLogs}>
              <Download className="mr-2 h-4 w-4" />
              Export Logs
            </Button>
            <Button variant="secondary" onClick={exportApiDocumentation}>
              <FileJson className="mr-2 h-4 w-4" />
              Export API Documentation
            </Button>
          </div>
        </div>
        
        {/* Connection Form */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Router className="h-5 w-5" />
              <CardTitle>VyOS Router Connection</CardTitle>
            </div>
            <CardDescription>
              Configure connection to your VyOS router
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="router-ip">Router IP or Hostname</Label>
                <Input 
                  id="router-ip" 
                  placeholder="e.g. 192.168.1.1 or vyos.example.com" 
                  value={routerIp}
                  onChange={e => setRouterIp(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="port">Port (Optional)</Label>
                <Input 
                  id="port" 
                  placeholder="443" 
                  value={port}
                  onChange={e => setPort(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <Label htmlFor="api-key">API Key</Label>
                <Input 
                  id="api-key" 
                  type="password" 
                  placeholder="Your VyOS API Key" 
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
              </div>
              <div className="md:col-span-4 flex items-center space-x-2">
                <Checkbox 
                  id="allow-insecure" 
                  checked={allowInsecure} 
                  onCheckedChange={(checked) => setAllowInsecure(checked === true)}
                />
                <div className="flex items-center">
                  <Label 
                    htmlFor="allow-insecure" 
                    className="cursor-pointer flex items-center text-sm font-medium"
                  >
                    <ShieldAlert className="h-4 w-4 mr-2 text-yellow-500" />
                    Allow insecure SSL connections (self-signed certificates)
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              {connectionParams ? 
                `Connected to: ${connectionParams.host}${connectionParams.port ? `:${connectionParams.port}` : ""}` : 
                'Not connected to any router'}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleDisconnect}
                disabled={!connectionParams}
              >
                Disconnect
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={!routerIp || !apiKey}
              >
                Connect
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>API Test Functions</CardTitle>
            <CardDescription>
              Test API calls with these buttons to see them in the debug console
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="card-content flex gap-2 flex-wrap">
              <Button 
                onClick={handleTestGetDhcpLeases}
                disabled={isLoading}
                className="flex items-center"
              >
                <Server className="w-4 h-4 mr-2" />
                Test DHCP Leases
              </Button>
              <Button 
                onClick={handleTestGetInterfaceStatus}
                disabled={isLoading}
                className="flex items-center"
              >
                <Network className="w-4 h-4 mr-2" />
                Test Interface Status
              </Button>
              <Button 
                onClick={handleTestSystemStatus}
                disabled={isLoading}
                className="flex items-center"
              >
                <Database className="w-4 h-4 mr-2" />
                Test System Status
              </Button>
              <Button 
                onClick={handleTestGetConfig}
                disabled={isLoading}
                className="flex items-center"
              >
                <HardDrive className="w-4 h-4 mr-2" />
                Get Full Config
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom API Call Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Custom API Call
            </CardTitle>
            <CardDescription>
              Craft your own API calls to the VyOS router
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-endpoint">API Endpoint</Label>
                  <select
                    id="api-endpoint"
                    className="w-full p-2 border rounded-md"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                  >
                    {Object.entries(VyOSEndpoints).map(([key, value]) => (
                      <option key={key} value={value}>
                        {key}: {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-operation">Operation</Label>
                  <Input
                    id="api-operation"
                    placeholder="Enter operation (e.g., show, set)"
                    value={customOperation}
                    onChange={(e) => setCustomOperation(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-path">
                  Path (space-separated, e.g. "interfaces ethernet")
                </Label>
                <Input
                  id="api-path"
                  placeholder="Enter path..."
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Common paths: system memory, interfaces ethernet, service dhcp-server leases
                </div>
              </div>
              {lastCustomResponse && (
                <div className="border p-3 rounded-md bg-muted/50 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm">Last API Call Result</h4>
                    <Badge
                      variant={lastCustomResponse.error ? "destructive" : "secondary"}
                    >
                      {lastCustomResponse.error ? "Error" : "Success"}
                    </Badge>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md bg-background p-2">
                    <pre className="text-xs font-mono">
                      {lastCustomResponse.error 
                        ? lastCustomResponse.error 
                        : JSON.stringify(lastCustomResponse.data, null, 2)}
                    </pre>
                  </div>
                  <div className="flex justify-end mt-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(lastCustomResponse.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <Checkbox 
                  id="auto-export" 
                  onCheckedChange={(checked) => {
                    localStorage.setItem('autoExportApiCalls', checked ? 'true' : 'false');
                  }}
                  defaultChecked={typeof window !== 'undefined' ? localStorage.getItem('autoExportApiCalls') === 'true' : false}
                />
                <Label 
                  htmlFor="auto-export" 
                  className="cursor-pointer text-sm font-medium"
                >
                  Automatically export call details after execution
                </Label>
              </div>
              <div className="flex justify-between mt-4">
                <Button
                  disabled={isLoading || !connectionParams}
                  onClick={handleCustomApiCall}
                  className="flex-1 mr-2"
                >
                  {isLoading ? "Executing..." : "Execute Custom API Call"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!lastCustomResponse}
                  onClick={exportCustomApiCall}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Call & Response
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Log list panel */}
        <div className="w-1/3 border-r min-w-[300px] flex flex-col">
          <div className="p-4 border-b">
            <ToggleGroup type="single" value={activeTab} onValueChange={(value) => value && setActiveTab(value)}>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="requests">Requests</ToggleGroupItem>
              <ToggleGroupItem value="responses">Responses</ToggleGroupItem>
              <ToggleGroupItem value="errors">Errors</ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredLogs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No logs recorded</p>
                  <p className="text-sm">Make API calls to see logs here</p>
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 ${
                      selectedLogId === log.id ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedLogId(log.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-mono text-sm truncate flex-1">
                        {log.url || log.message}
                      </div>
                      <Badge 
                        variant={
                          log.type === 'error' ? 'destructive' : 
                          log.type === 'response' ? 'secondary' : 
                          'default'
                        }
                        className="ml-2 whitespace-nowrap"
                      >
                        {log.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{log.method || ""}</span>
                      <span>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Log details panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedLog ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center">
                <div>
                  <Badge 
                    variant={
                      selectedLog.type === 'error' ? 'destructive' : 
                      selectedLog.type === 'response' ? 'secondary' : 
                      'default'
                    }
                    className="mr-2"
                  >
                    {selectedLog.type}
                  </Badge>
                  <span className="font-mono text-sm">{selectedLog.url || selectedLog.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportSelectedLog}
                    className="flex items-center"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export API Details
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedLog.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <Tabs defaultValue="details" className="flex-1 flex flex-col">
                <div className="border-b px-4">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="payload">Payload</TabsTrigger>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="details" className="flex-1 p-0 data-[state=active]:flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-1">Overview</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="font-medium">Type:</div>
                          <div>{selectedLog.type}</div>
                          {selectedLog.method && (
                            <>
                              <div className="font-medium">Method:</div>
                              <div>{selectedLog.method}</div>
                            </>
                          )}
                          {selectedLog.status && (
                            <>
                              <div className="font-medium">Status:</div>
                              <div>{selectedLog.status}</div>
                            </>
                          )}
                          <div className="font-medium">Time:</div>
                          <div>{new Date(selectedLog.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      {selectedLog.duration && (
                        <div>
                          <h3 className="font-semibold mb-1">Performance</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="font-medium">Duration:</div>
                            <div>{selectedLog.duration}ms</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedLog.message && (
                        <div>
                          <h3 className="font-semibold mb-1">Message</h3>
                          <div className="text-sm bg-muted p-3 rounded-md font-mono">
                            {selectedLog.message}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="payload" className="flex-1 p-0 data-[state=active]:flex flex-col">
                  <ScrollArea className="flex-1">
                    <pre className="p-4 text-sm font-mono">{selectedLog.payload ? formatJson(selectedLog.payload) : 'No payload data'}</pre>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="headers" className="flex-1 p-0 data-[state=active]:flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    {selectedLog.headers ? (
                      <div className="divide-y">
                        {Object.entries(selectedLog.headers).map(([key, value]) => (
                          <div key={key} className="py-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="font-medium">{key}:</div>
                            <div className="md:col-span-2 font-mono break-all">{value as string}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No header data available</div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground flex-col">
              <FileJson className="h-12 w-12 mb-4 opacity-50" />
              <p>Select a log to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 