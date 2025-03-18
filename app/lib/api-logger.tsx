"use client"

import { getVyOSDhcpLeases } from "@/lib/api"
import { useDebugStore } from "./debug-store"
import { useEffect } from "react"

// Create a wrapper around the getVyOSDhcpLeases API
export const useLoggedApis = () => {
  const { addLog } = useDebugStore()
  
  // Wrapper for DHCP leases API
  const loggedGetVyOSDhcpLeases = async (params: any) => {
    // Log the request
    const requestId = Date.now().toString()
    addLog({
      type: 'request',
      message: `GET DHCP Leases Request [${requestId}]`,
      endpoint: '/api/vyos/dhcp',
      details: {
        method: 'POST',
        params
      }
    })
    
    try {
      // Make the actual API call
      const response = await getVyOSDhcpLeases(params)
      
      // Log the successful response
      addLog({
        type: 'response',
        message: `GET DHCP Leases Response [${requestId}]`,
        endpoint: '/api/vyos/dhcp',
        status: 200,
        data: response
      })
      
      return response
    } catch (error) {
      // Log the error
      addLog({
        type: 'error',
        message: `GET DHCP Leases Error [${requestId}]`,
        endpoint: '/api/vyos/dhcp',
        details: error instanceof Error ? error.message : String(error)
      })
      
      // Re-throw the error so it can be handled by the calling code
      throw error
    }
  }
  
  // In the future, add more wrapped API functions here
  
  return {
    getVyOSDhcpLeases: loggedGetVyOSDhcpLeases
  }
}

// Hook to listen for API calls
export function useApiMonitor() {
  const { addLog } = useDebugStore()
  
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return
    
    // Define a function to wrap XMLHttpRequest
    const setupXhrMonitoring = () => {
      const XHR = XMLHttpRequest.prototype
      
      // Save references to original methods
      const open = XHR.open
      const send = XHR.send
      
      // Override open method
      XHR.open = function(method: string, url: string) {
        // Store the request details to use later
        (this as any)._requestMethod = method
        ;(this as any)._requestUrl = url
        ;(this as any)._requestId = Date.now().toString()
        
        // Call original method
        return open.apply(this, arguments as any)
      }
      
      // Override send method
      XHR.send = function(body) {
        // Add response listeners
        this.addEventListener('load', function() {
          const requestId = (this as any)._requestId
          const url = (this as any)._requestUrl
          const method = (this as any)._requestMethod
          
          // Log response
          try {
            let responseData
            if (this.responseType === 'json' || (this.responseType === '' && this.getResponseHeader('content-type')?.includes('application/json'))) {
              responseData = JSON.parse(this.responseText)
            } else {
              responseData = this.responseText
            }
            
            addLog({
              type: 'response',
              message: `XHR Response [${requestId}]`,
              endpoint: url,
              status: this.status,
              data: responseData
            })
          } catch (e) {
            console.error('Error logging XHR response:', e)
          }
        })
        
        this.addEventListener('error', function() {
          const requestId = (this as any)._requestId
          const url = (this as any)._requestUrl
          
          addLog({
            type: 'error',
            message: `XHR Error [${requestId}]`,
            endpoint: url,
            details: 'Network error'
          })
        })
        
        // Log the request
        const requestId = (this as any)._requestId
        const url = (this as any)._requestUrl
        const method = (this as any)._requestMethod
        
        addLog({
          type: 'request',
          message: `XHR Request [${requestId}]`,
          endpoint: url,
          details: {
            method,
            body: body ? body : undefined
          }
        })
        
        // Call original method
        return send.apply(this, arguments as any)
      }
    }
    
    // Set up the monitoring
    setupXhrMonitoring()
    
    // Clean up (though this won't actually restore the original methods)
    return () => {
      // Cleanup here if needed
    }
  }, [addLog])
} 