"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Bug, RefreshCw, KeyRound, Server, ShieldAlert } from "lucide-react"
import { getVyOSConfig } from "@/lib/api"

interface RouterConnectionProps {
  onConnect: (config: any, connectionParams: any) => void
}

interface DebugInfo {
  timestamp: string;
  type: 'request' | 'response' | 'error';
  endpoint?: string;
  data?: any;
  status?: number;
  message?: string;
  details?: any;
}

export default function RouterConnection({ onConnect }: RouterConnectionProps) {
  const { toast } = useToast()
  const [connecting, setConnecting] = useState(false)
  
  const [connection, setConnection] = useState({
    host: "",
    key: "", // VyOS API key
    port: "443",
    https: true,
    allowInsecure: false, // Add option to allow self-signed certificates
  })
  
  // Debug state
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([])
  const [lastResponse, setLastResponse] = useState<any>(null)
  const [certError, setCertError] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConnection((prev) => ({ ...prev, [name]: value }))
    // Reset cert error when changing connection details
    setCertError(false)
  }

  const handleHttpsToggle = (checked: boolean) => {
    setConnection((prev) => ({ ...prev, https: checked }))
    setCertError(false)
  }

  const handleInsecureToggle = (checked: boolean) => {
    setConnection((prev) => ({ ...prev, allowInsecure: checked }))
    setCertError(false)
  }

  // Add debug info
  const addDebugInfo = (info: Partial<DebugInfo>) => {
    const timestamp = new Date().toISOString()
    setDebugInfo(prev => [
      { timestamp, ...info } as DebugInfo,
      ...prev.slice(0, 19) // Keep only last 20 entries
    ])
  }

  // Clear debug info
  const clearDebugInfo = () => {
    setDebugInfo([])
    setLastResponse(null)
  }

  const handleConnect = async () => {
    if (!connection.host || !connection.key) {
      toast({
        title: "Missing information",
        description: "Host and API key are required for VyOS API connection.",
        variant: "destructive",
      })
      return
    }

    try {
      setConnecting(true)
      setCertError(false)
      
      // Prepare connection parameters according to the VyOS API schema
      const connectionParams = {
        host: connection.host,
        key: connection.key, // API key for VyOS
        port: parseInt(connection.port || "443", 10),
        https: connection.https,
        allowInsecure: connection.allowInsecure, // Add self-signed cert option
      }
      
      // Add debug info - request
      const sanitizedParams = { ...connectionParams, key: "********" };
      
      addDebugInfo({
        type: 'request',
        endpoint: 'get-config',
        data: sanitizedParams
      });
      
      try {
        // Make the API request
        const response = await getVyOSConfig(connectionParams)
        
        // Store the response for debugging
        setLastResponse(response)
        
        // Add debug info - response
        addDebugInfo({
          type: 'response',
          endpoint: 'get-config',
          status: 200,
          data: response
        });
        
        if (response.success) {
          if (response.data) {
            toast({
              title: "Connected successfully",
              description: "VyOS router configuration loaded.",
            })
          } else {
            toast({
              title: "Connection partial success",
              description: "Connected to VyOS API but no configuration data returned.",
              variant: "destructive",
            })
          }
          
          // Check if the response has the expected data structure
          // The VyOS API response structure may vary based on the endpoint
          const configData = response.data || {};
          
          console.log("Response data structure:", {
            hasData: !!response.data,
            keys: response.data ? Object.keys(response.data) : []
          });
          
          // Include the raw response for debugging purposes
          const debugData = {
            ...configData,
            rawResponse: response
          };
          
          // Pass debug state to parent component along with the connection data
          onConnect(debugData, {
            ...connectionParams,
            key: "********", // Redact the key in the UI
            debugMode: debugMode,
            debugInfo: debugInfo,
          })
        } else {
          // Check if there's a certificate error specifically reported by our API
          if (response.certError) {
            setCertError(true)
            toast({
              title: "Certificate Error",
              description: "The router has a self-signed certificate. Enable 'Allow Self-Signed Certificate' to connect.",
              variant: "destructive",
            })
          } else {
            throw new Error(response.error || "Failed to connect")
          }
        }
      } catch (error) {
        addDebugInfo({
          type: 'error',
          endpoint: 'get-config',
          message: error instanceof Error ? error.message : String(error),
          details: error
        });
        
        // Check for certificate error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('certificate') || 
            errorMessage.toLowerCase().includes('cert') || 
            errorMessage.toLowerCase().includes('self-signed')) {
          setCertError(true)
          toast({
            title: "Certificate Error",
            description: "The router has a self-signed certificate. Enable 'Allow Self-Signed Certificate' to connect.",
            variant: "destructive",
          })
        } else if (errorMessage.toLowerCase().includes('cors')) {
          toast({
            title: "CORS Error",
            description: "Enable CORS on your VyOS router or check your connection settings.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Connection failed",
            description: errorMessage,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    } finally {
      setConnecting(false)
    }
  }

  const toggleDebug = () => {
    setDebugMode(!debugMode)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          <span>Connect to VyOS Router</span>
        </CardTitle>
        <CardDescription>
          Enter your VyOS router details and API key to connect
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="host">Router Address</Label>
          <Input
            id="host"
            name="host"
            placeholder="IP address or hostname"
            value={connection.host}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            name="port"
            placeholder="443"
            value={connection.port}
            onChange={handleChange}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="https"
            checked={connection.https}
            onCheckedChange={handleHttpsToggle}
          />
          <Label htmlFor="https">Use HTTPS</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="allow-insecure"
            checked={connection.allowInsecure}
            onCheckedChange={handleInsecureToggle}
          />
          <Label htmlFor="allow-insecure" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>Allow Self-Signed Certificate</span>
          </Label>
        </div>
        
        {certError && (
          <Alert variant="destructive" className="mt-2">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Certificate validation failed. Enable "Allow Self-Signed Certificate" to connect to this router.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="key" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span>API Key</span>
          </Label>
          <Input
            id="key"
            name="key"
            type="password"
            placeholder="VyOS API key"
            value={connection.key}
            onChange={handleChange}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Generate an API key on your VyOS router using: <code>generate auth api-key id &lt;name&gt;</code>
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="debug-mode"
            checked={debugMode}
            onCheckedChange={toggleDebug}
          />
          <Label htmlFor="debug-mode" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <span>Debug Mode</span>
          </Label>
        </div>

        {debugMode && debugInfo.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Debug Information</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearDebugInfo}
                className="h-7 px-2"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
            <div className="text-xs bg-muted p-2 rounded h-32 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="mb-1 pb-1 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{new Date(info.timestamp).toLocaleTimeString()}</span>
                  {' - '}
                  <span className={info.type === 'error' ? 'text-destructive' : ''}>
                    {info.type}: {info.endpoint} {info.message ? `- ${info.message}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 