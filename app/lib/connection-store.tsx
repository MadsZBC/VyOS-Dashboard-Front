"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { ConnectionParams } from "@/app/types/connection"
import { getConnectionState, setConnectionState as setLegacyConnectionState } from "@/lib/connection-store"

// Type adapter to convert between different connection parameter formats
function adaptLegacyConnectionParams(params: any): ConnectionParams | null {
  if (!params) return null;
  
  return {
    host: params.host,
    apiKey: params.key || params.apiKey,
    port: params.port,
    allowInsecure: params.allowInsecure
  };
}

function adaptToLegacyConnectionParams(params: ConnectionParams): any {
  return {
    host: params.host,
    key: params.apiKey,
    port: params.port,
    allowInsecure: params.allowInsecure,
    https: true // Default to https
  };
}

interface ConnectionStoreContextType {
  connectionParams: ConnectionParams | null
  setConnectionParams: (params: ConnectionParams) => void
  clearConnectionParams: () => void
}

const ConnectionStoreContext = createContext<ConnectionStoreContextType | undefined>(undefined)

export function ConnectionStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [connectionParams, setConnectionParamsState] = useState<ConnectionParams | null>(null)

  // Load from both localStorage mechanisms on initial render (client-side only)
  useEffect(() => {
    // First try the legacy connection store
    const legacyState = getConnectionState();
    if (legacyState?.connectionParams) {
      const adaptedParams = adaptLegacyConnectionParams(legacyState.connectionParams);
      if (adaptedParams) {
        setConnectionParamsState(adaptedParams);
        return;
      }
    }
    
    // Fall back to direct localStorage if necessary
    const savedParams = localStorage.getItem("vyosConnectionParams")
    if (savedParams) {
      try {
        setConnectionParamsState(JSON.parse(savedParams))
      } catch (e) {
        console.error("Failed to parse saved connection params", e)
        localStorage.removeItem("vyosConnectionParams")
      }
    }
  }, [])

  const setConnectionParams = (params: ConnectionParams) => {
    // Update the state in the context
    setConnectionParamsState(params)
    
    // Also sync with the localStorage directly
    localStorage.setItem("vyosConnectionParams", JSON.stringify(params))
    
    // And sync with the legacy connection store
    const legacyState = getConnectionState() || {};
    setLegacyConnectionState({
      ...legacyState,
      isConnected: true,
      connectionParams: adaptToLegacyConnectionParams(params),
      lastUpdate: new Date().toISOString()
    });
  }

  const clearConnectionParams = () => {
    setConnectionParamsState(null)
    localStorage.removeItem("vyosConnectionParams")
    
    // Also clear the legacy connection store
    setLegacyConnectionState({
      isConnected: false,
      connectionParams: undefined,
      config: null,
      lastUpdate: new Date().toISOString()
    });
  }

  return (
    <ConnectionStoreContext.Provider
      value={{
        connectionParams,
        setConnectionParams,
        clearConnectionParams,
      }}
    >
      {children}
    </ConnectionStoreContext.Provider>
  )
}

export function useConnectionStore() {
  const context = useContext(ConnectionStoreContext)
  if (context === undefined) {
    throw new Error("useConnectionStore must be used within a ConnectionStoreProvider")
  }
  return context
} 