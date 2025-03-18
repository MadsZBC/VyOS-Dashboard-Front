"use client"

import { useState, useEffect } from "react"
import { Shield, Bug, LogOut, Terminal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Network, Globe, Server, Cpu } from "lucide-react"
import { 
  getConnectionState, 
  clearConnectionState 
} from "@/lib/connection-store"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [isConnected, setIsConnected] = useState(false)
  const [hostname, setHostname] = useState("VyOS Router")
  const [debugMode, setDebugMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load saved connection state on initial render
  useEffect(() => {
    const savedState = getConnectionState();
    if (savedState && savedState.isConnected) {
      setIsConnected(true);
      setHostname(savedState.config?.system?.["host-name"] || savedState.connectionParams?.host || "VyOS Router");
      if (savedState.debugMode) {
        setDebugMode(savedState.debugMode);
      }
    } else {
      // Redirect to home/login if not connected
      router.push("/");
    }
    setIsLoading(false);
  }, [router]);

  const toggleDebug = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    
    // If turning on debug, navigate to debug page
    if (newDebugMode) {
      router.push("/dashboard/debug");
    }
    
    // Save the debug state
    const savedState = getConnectionState();
    if (savedState) {
      savedState.debugMode = newDebugMode;
      localStorage.setItem('vyosConnectionState', JSON.stringify(savedState));
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false);
    clearConnectionState();
    router.push("/");
  }

  // If loading, show a simple loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6 text-primary" />
          <span>VyOS Dashboard</span>
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {hostname}
          </Badge>
          
          <Link href="/livedebug" passHref>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              title="Live API Debug"
            >
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline-flex">API Debug</span>
            </Button>
          </Link>
          
          <Button 
            variant={debugMode ? "destructive" : "outline"}
            size="sm" 
            onClick={toggleDebug}
            className="flex items-center gap-2"
            title="Toggle Debug Mode"
          >
            <Bug className="h-4 w-4" />
            <span className="hidden sm:inline-flex">{debugMode ? "Debug ON" : "Debug"}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDisconnect}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Disconnect</span>
          </Button>
        </nav>
      </header>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-6">
            <Tabs defaultValue="overview" value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              router.push(`/dashboard/${value === "overview" ? "" : value}`);
            }} className="space-y-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-7 gap-2">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="network" className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Network</span>
                </TabsTrigger>
                <TabsTrigger value="firewall" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Firewall</span>
                </TabsTrigger>
                <TabsTrigger value="nat" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">NAT</span>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Services</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">System</span>
                </TabsTrigger>
                <TabsTrigger value="debug" className={`flex items-center gap-2 ${!debugMode && 'hidden'}`}>
                  <Bug className="h-4 w-4" />
                  <span className="hidden sm:inline-flex">Debug</span>
                </TabsTrigger>
              </TabsList>

              {children}
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
} 