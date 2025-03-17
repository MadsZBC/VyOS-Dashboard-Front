"use client"

export interface ConnectionState {
  isConnected: boolean;
  connectionParams?: {
    host: string;
    username: string;
    password?: string;
    port?: string;
    use_keys: boolean;
    key_file?: string;
  };
  config?: any;
  debugMode?: boolean;
  debugInfo?: any[];
  dhcpLeases?: any;
}

const CONNECTION_STORAGE_KEY = "vyos_connection_state";

export function saveConnectionState(state: ConnectionState): void {
  if (typeof window !== "undefined") {
    // Remove password for security before storing
    const stateToSave = {
      ...state,
      connectionParams: state.connectionParams ? {
        ...state.connectionParams,
        password: undefined
      } : undefined
    };
    localStorage.setItem(CONNECTION_STORAGE_KEY, JSON.stringify(stateToSave));
  }
}

export function getConnectionState(): ConnectionState | null {
  if (typeof window !== "undefined") {
    try {
      const savedState = localStorage.getItem(CONNECTION_STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (error) {
      console.error("Error retrieving connection state:", error);
    }
  }
  return null;
}

export function clearConnectionState(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONNECTION_STORAGE_KEY);
  }
} 