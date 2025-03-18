"use client"

import { useEffect, useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { useConnectionStore } from "@/app/lib/connection-store"
import { vyosConfig as mockConfig } from "@/lib/vyos-data"
import { ExtendedVyosConfig } from "@/app/lib/utils"
import { getFullConfiguration } from "@/app/lib/vyos-api-manager"
import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Services from "@/components/services"
import { getConnectionState, hasValidCachedData, setConnectionState } from "@/lib/connection-store"

export default function ServicesPage() {
  const [vyosConfig, setVyosConfig] = useState<ExtendedVyosConfig>(mockConfig as ExtendedVyosConfig)
  const [isLoading, setIsLoading] = useState(true)
  const { connectionParams } = useConnectionStore()
  const { toast } = useToast()
  
  // Function to load configuration from cache or API
  const loadConfiguration = async (forceRefresh: boolean = false) => {
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
      // Check if we have valid cached data and not forcing refresh
      if (!forceRefresh && hasValidCachedData()) {
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

      // If no valid cache or forcing refresh, fetch from API
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

  // Load configuration on initial render - always use cache
  useEffect(() => {
    loadConfiguration(false);
  }, []);

  return (
    <TabsContent value="services">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Network Services</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => loadConfiguration(true)} // Force refresh when button is clicked
          disabled={isLoading}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">Loading services information...</div>
        </div>
      ) : (
        <Services services={vyosConfig.service} />
      )}
    </TabsContent>
  )
} 