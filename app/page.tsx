"use client"

import { useEffect, useState } from "react"
import RouterConnection from "@/components/router-connection"
import { getConnectionState, setConnectionState } from "@/lib/connection-store"
import { useRouter } from "next/navigation"
import { useConnectionStore } from "@/app/lib/connection-store"

// Convert from router-connection format to app format
function adaptConnectionParams(params: any) {
  return {
    host: params.host,
    apiKey: params.key,
    port: params.port,
    allowInsecure: params.allowInsecure
  };
}

export default function Home() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { setConnectionParams } = useConnectionStore()

  // Check if already connected on initial render
  useEffect(() => {
    const savedState = getConnectionState();
    if (savedState && savedState.isConnected) {
      setIsConnected(true);
      router.push('/dashboard');
    }
    setIsLoading(false);
  }, [router]);

  // If loading, show a simple loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <div className="max-w-md w-full p-6 space-y-6 bg-background rounded-lg shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">VyOS Router Dashboard</h1>
          <p className="text-muted-foreground">Connect to your VyOS router to get started</p>
        </div>
        
        <div>
          <RouterConnection 
            onConnect={(configData, connectionParams) => {
              // Save connection state with timestamp to localStorage
              setConnectionState({
                isConnected: true,
                config: configData,
                connectionParams: connectionParams,
                lastUpdate: new Date().toISOString()
              });
              
              // Also update the React context with adapted params
              setConnectionParams(adaptConnectionParams(connectionParams));
              
              setIsConnected(true);
              // Force a hard navigation to ensure state is refreshed
              window.location.href = '/dashboard';
            }}
          />
        </div>
      </div>
    </div>
  )
}

