"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, Key, AlertCircle, Bug, RefreshCw } from "lucide-react"
import { getVyOSConfig, uploadSSHKeyViaProxy } from "@/lib/api"

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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [corsError, setCorsError] = useState(false)
  
  const [connection, setConnection] = useState({
    host: "",
    username: "",
    password: "",
    port: "22",
    use_keys: false,
    key_file: "",
    key_content: "",
  })

  const [authMethod, setAuthMethod] = useState<"password" | "keyfile" | "upload">("password")
  const [keyUploaded, setKeyUploaded] = useState(false)
  const [uploadedKeyName, setUploadedKeyName] = useState<string | null>(null)
  
  // Debug state
  const [debugMode, setDebugMode] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([])
  const [lastResponse, setLastResponse] = useState<any>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setConnection((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      setConnection(prev => ({ ...prev, key_content: content }))
      setKeyUploaded(false) // Reset uploaded state when a new file is selected
      setUploadedKeyName(null)
      
      toast({
        title: "SSH key loaded",
        description: `${file.name} has been loaded successfully. Click "Upload Key" to continue.`,
      })
    } catch (error) {
      toast({
        title: "Error loading SSH key",
        description: "Failed to read the SSH key file.",
        variant: "destructive",
      })
    }
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
  
  // Upload SSH key to server
  const handleUploadKey = async () => {
    if (!connection.key_content) {
      toast({
        title: "No SSH key to upload",
        description: "Please select an SSH key file first.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setUploading(true)
      
      // Generate a unique key name
      const keyName = `key_${Date.now()}`
      
      addDebugInfo({
        type: 'request',
        endpoint: 'upload-ssh-key',
        data: { key_content: '********', key_name: keyName }
      })
      
      // Upload the key using the API
      const response = await uploadSSHKeyViaProxy({
        key_content: connection.key_content,
        key_name: keyName
      })
      
      // Save response for debugging
      setLastResponse(response)
      
      addDebugInfo({
        type: 'response',
        endpoint: 'upload-ssh-key',
        status: 200,
        data: response
      })
      
      if (response.success) {
        setKeyUploaded(true)
        setUploadedKeyName(keyName)
        toast({
          title: "SSH key uploaded successfully",
          description: "You can now connect to the router using this key.",
        })
      } else {
        throw new Error(response.message || "Failed to upload SSH key")
      }
    } catch (error) {
      addDebugInfo({
        type: 'error',
        endpoint: 'upload-ssh-key',
        message: error instanceof Error ? error.message : String(error),
        details: error
      })
      
      toast({
        title: "Failed to upload SSH key",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleConnect = async () => {
    if (!connection.host || !connection.username) {
      toast({
        title: "Missing information",
        description: "Host and username are required.",
        variant: "destructive",
      })
      return
    }

    if (authMethod === "password" && !connection.password) {
      toast({
        title: "Missing information",
        description: "Password is required when not using SSH keys.",
        variant: "destructive",
      })
      return
    }

    if (authMethod === "upload" && !keyUploaded) {
      toast({
        title: "Missing information",
        description: "Please upload your SSH key first.",
        variant: "destructive",
      })
      return
    }

    try {
      setConnecting(true)
      setCorsError(false)
      
      // Prepare connection parameters according to the API schema
      const connectionParams: any = {
        host: connection.host,
        username: connection.username,
        port: connection.port || "22",
      }
      
      // Set authentication parameters based on method
      if (authMethod === "password") {
        connectionParams.use_keys = false
        connectionParams.password = connection.password
      } else if (authMethod === "keyfile") {
        connectionParams.use_keys = true
        connectionParams.key_file = connection.key_file
      } else if (authMethod === "upload" && uploadedKeyName) {
        // Use the uploaded key name as the key_file
        connectionParams.use_keys = true
        connectionParams.key_file = uploadedKeyName
      }
      
      // Add debug info - request
      const sanitizedParams = { ...connectionParams };
      if (sanitizedParams.password) sanitizedParams.password = "********";
      
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
              description: "Router configuration loaded.",
            })
          } else {
            toast({
              title: "Connection partial success",
              description: "Connected to API but no configuration data returned.",
              variant: "destructive",
            })
          }
          
          // Check if the response has the expected data structure
          // If response.data is undefined or null, use an empty object as fallback
          // The VyOS API nests the actual config under response.data.config
          const configData = response.data?.config || response.data || {};
          
          console.log("Response data structure:", {
            hasData: !!response.data,
            hasConfigData: !!response.data?.config,
            keys: response.data ? Object.keys(response.data) : [],
            configKeys: response.data?.config ? Object.keys(response.data.config) : []
          });
          
          // Include the raw response for debugging purposes
          const debugData = {
            ...configData,
            rawResponse: response
          };
          
          // Pass debug state to parent component along with the connection data
          onConnect(debugData, {
            ...connectionParams,
            debugMode: debugMode,
            debugInfo: debugInfo,
          })
        } else {
          throw new Error(response.message || "Failed to connect")
        }
      } catch (error) {
        // Add debug info - error
        addDebugInfo({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
          details: error
        });
        
        if (error instanceof TypeError && error.message.includes("NetworkError")) {
          // Handle CORS error by suggesting a workaround
          setCorsError(true)
          throw new Error("CORS issue detected. Please try the workaround below.")
        } else {
          throw error
        }
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Connect to VyOS Router</CardTitle>
          <CardDescription>Enter your router connection details</CardDescription>
        </div>
        <Button 
          variant={debugMode ? "destructive" : "outline"}
          size="sm" 
          onClick={toggleDebug}
          className="flex items-center gap-2"
          title="Toggle Debug Mode"
        >
          <Bug className="h-4 w-4" />
          <span>{debugMode ? "Debug ON" : "Debug"}</span>
        </Button>
      </CardHeader>
      
      <Tabs defaultValue="connection">
        <TabsList className="mx-6">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          {debugMode && <TabsTrigger value="debug">Debug Info</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="connection">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="host">Router IP/Hostname</Label>
              <Input
                id="host"
                name="host"
                placeholder="192.168.1.1"
                value={connection.host}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="vyos"
                value={connection.username}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                placeholder="22"
                value={connection.port}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-3">
              <Label>Authentication Method</Label>
              <Tabs 
                defaultValue="password" 
                value={authMethod} 
                onValueChange={(value) => setAuthMethod(value as "password" | "keyfile" | "upload")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="keyfile">SSH Key Path</TabsTrigger>
                  <TabsTrigger value="upload">Upload Key</TabsTrigger>
                </TabsList>
                
                <TabsContent value="password" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={connection.password}
                      onChange={handleChange}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="keyfile" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="key_file">SSH Key Path</Label>
                    <Input
                      id="key_file"
                      name="key_file"
                      placeholder="~/.ssh/id_rsa"
                      value={connection.key_file}
                      onChange={handleChange}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Path to the SSH key on the server, not your local machine
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="file" 
                          id="ssh_key_file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Select SSH Key File
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select your private SSH key file (id_rsa or similar)
                      </p>
                    </div>
                    
                    {connection.key_content && !keyUploaded && (
                      <Button 
                        type="button" 
                        onClick={handleUploadKey}
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            Upload Key
                          </>
                        )}
                      </Button>
                    )}
                    
                    {keyUploaded && (
                      <div className="p-2 border rounded-md bg-muted/50">
                        <p className="text-sm flex items-center">
                          <Key className="mr-2 h-4 w-4 text-green-500" />
                          SSH key uploaded successfully
                          {uploadedKeyName && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ID: {uploadedKeyName}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {corsError && (
              <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50 text-yellow-800 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-5 w-5" />
                  <span>CORS Issue Detected</span>
                </div>
                <p className="text-sm">
                  Your backend API needs to be configured to handle CORS requests. Here are two options:
                </p>
                <ol className="text-sm list-decimal pl-5 space-y-1">
                  <li>
                    Add CORS support to your FastAPI backend by installing <code className="bg-yellow-100 px-1 rounded">fastapi-cors</code> and adding:
                    <pre className="bg-yellow-100 p-2 rounded mt-1 text-xs overflow-auto">
                      {`from fastapi.middleware.cors import CORSMiddleware\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],  # or specific origins\n    allow_methods=["*"],\n    allow_headers=["*"],\n)`}
                    </pre>
                  </li>
                  <li>
                    Use a proxy server or CORS browser extension during development
                  </li>
                </ol>
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
        </TabsContent>
        
        {debugMode && (
          <TabsContent value="debug">
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Debug Information</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearDebugInfo}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Clear
                </Button>
              </div>
              
              {lastResponse && (
                <div className="border rounded-md p-3">
                  <h4 className="font-medium mb-2">Last Response</h4>
                  <div className="bg-muted p-2 rounded max-h-40 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(lastResponse, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {lastResponse?.debug && (
                <div className="border rounded-md p-3">
                  <h4 className="font-medium mb-2">Server Debug Info</h4>
                  <div className="space-y-2">
                    {lastResponse.debug.request && (
                      <div>
                        <h5 className="text-sm font-medium">Request</h5>
                        <div className="bg-muted p-2 rounded max-h-40 overflow-auto">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(lastResponse.debug.request, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {lastResponse.debug.response && (
                      <div>
                        <h5 className="text-sm font-medium">Response</h5>
                        <div className="bg-muted p-2 rounded max-h-40 overflow-auto">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(lastResponse.debug.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Activity Log</h4>
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-60 overflow-auto">
                    {debugInfo.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No activity yet. Try connecting to see debug information.
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
            </CardContent>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  )
} 