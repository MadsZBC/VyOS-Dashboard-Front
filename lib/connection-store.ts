"use client"

import { ConnectionParams } from './api';

export interface ConnectionState {
  isConnected: boolean;
  connectionParams?: {
    host: string;
    key: string; // VyOS API requires a key
    port?: number;
    https?: boolean;
    allowInsecure?: boolean;
  };
  config?: any;
  debugMode?: boolean;
  debugInfo?: any[];
  dhcpLeases?: any;
  lastUpdate?: string; // Timestamp of last data update
}

// Update localStorage key to indicate we're using VyOS API now
const STORAGE_KEY = 'vyos-router-connection';

// Save connection state to localStorage
export function saveConnectionState(state: Partial<ConnectionState>) {
  if (typeof window !== 'undefined') {
    // Don't store key in localStorage for security reasons
    const safeState = { ...state };
    if (safeState.connectionParams?.key) {
      safeState.connectionParams = {
        ...safeState.connectionParams,
        key: '********' // Redact the key
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  }
}

// Get connection state from localStorage
export function getConnectionState(): Partial<ConnectionState> | null {
  if (typeof window !== 'undefined') {
    const storedState = localStorage.getItem(STORAGE_KEY);
    if (storedState) {
      try {
        return JSON.parse(storedState);
      } catch (e) {
        console.error('Error parsing stored connection state:', e);
      }
    }
  }
  return null;
}

// Clear connection state from localStorage
export function clearConnectionState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Get default connection parameters (for new connections)
export function getDefaultConnectionParams(): Partial<ConnectionParams> {
  return {
    host: '',
    key: '', // API key is required
    port: 443,
    https: true,
    allowInsecure: false, // Default to not allowing insecure connections
    // Legacy properties kept for backward compatibility
    use_keys: false 
  };
}

// Merge saved state with defaults
export function getConnectionParams(): ConnectionParams {
  const defaults = getDefaultConnectionParams();
  const savedState = getConnectionState();
  
  if (savedState?.connectionParams) {
    return {
      ...defaults,
      ...savedState.connectionParams
    } as ConnectionParams;
  }
  
  return defaults as ConnectionParams;
}

// Set connection state
export function setConnectionState(state: ConnectionState) {
  saveConnectionState(state);
}

// Check if we have valid cached data
export function hasValidCachedData(): boolean {
  const state = getConnectionState();
  if (!state?.isConnected || !state?.config) {
    return false;
  }
  
  // Check if the data is less than 5 minutes old
  if (state.lastUpdate) {
    const lastUpdate = new Date(state.lastUpdate);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (now.getTime() - lastUpdate.getTime()) < fiveMinutes;
  }
  
  return false;
} 