"use client"

import { useEffect } from "react"
import { useDebugStore } from "./debug-store"

// Only log requests that match these patterns
const MONITORED_URL_PATTERNS = [
  '/api/vyos',
  '/api/v1'
];

// Function to check if a URL should be monitored
function shouldMonitorUrl(url: string): boolean {
  // Skip Next.js internal requests
  if (url.includes('nextjs_original-stack-frame') || 
      url.includes('_next/') ||
      url.includes('__next')) {
    return false;
  }
  
  // Always monitor our API endpoints
  for (const pattern of MONITORED_URL_PATTERNS) {
    if (url.includes(pattern)) {
      return true;
    }
  }
  
  // Allow user to override with query parameter for debugging
  return url.includes('?debug=true');
}

export function useApiMonitor() {
  const { addLog } = useDebugStore()

  useEffect(() => {
    // Monitor XMLHttpRequest
    const originalXHR = window.XMLHttpRequest

    function newXHR() {
      const xhr = new originalXHR()
      const startTime = Date.now()
      let method = "GET" // Default method
      let requestUrl = "" // Store URL for filtering

      // Store the method when open is called
      const originalOpen = xhr.open
      xhr.open = function(m: string, url: string) {
        method = m
        requestUrl = url
        return originalOpen.apply(this, arguments as any)
      }

      xhr.addEventListener("loadstart", () => {
        const url = xhr.responseURL || requestUrl
        if (!shouldMonitorUrl(url)) return;
        
        addLog({
          type: "request",
          method,
          url,
          headers: getHeaders(xhr),
        })
      })

      xhr.addEventListener("loadend", () => {
        const url = xhr.responseURL || requestUrl
        if (!shouldMonitorUrl(url)) return;
        
        const duration = Date.now() - startTime

        if (xhr.status >= 400) {
          addLog({
            type: "error",
            method,
            url,
            status: xhr.status,
            message: xhr.statusText,
            duration,
          })
        } else {
          addLog({
            type: "response",
            method,
            url,
            status: xhr.status,
            duration,
            headers: getHeaders(xhr),
            payload: tryParseResponse(xhr),
          })
        }
      })

      return xhr
    }

    // @ts-ignore
    window.XMLHttpRequest = newXHR

    // Monitor fetch API
    const originalFetch = window.fetch
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' 
        ? input 
        : input instanceof URL
          ? input.toString()
          : input.url
          
      // Skip monitoring for non-project URLs
      if (!shouldMonitorUrl(url)) {
        return originalFetch(input, init);
      }
      
      const method = init?.method || 'GET'
      const startTime = Date.now()
      
      // Log the request
      addLog({
        type: "request",
        method,
        url,
        headers: init?.headers as Record<string, string>,
        payload: init?.body ? 
          typeof init.body === 'string' 
            ? tryParseJSON(init.body) 
            : init.body 
          : undefined
      })
      
      try {
        // Make the actual fetch call
        const response = await originalFetch(input, init)
        const duration = Date.now() - startTime
        
        // Only monitor project-related responses
        if (!shouldMonitorUrl(response.url)) {
          return response;
        }
        
        // Clone the response so we can read its body
        const clonedResponse = response.clone()
        let responseData;
        
        try {
          // Try to parse as JSON first
          responseData = await clonedResponse.json();
        } catch (e) {
          // If not JSON, get as text
          responseData = await clonedResponse.clone().text();
        }
        
        // Log the response or error
        if (!response.ok) {
          addLog({
            type: "error",
            method,
            url: response.url,
            status: response.status,
            message: response.statusText,
            duration,
            payload: responseData
          })
        } else {
          addLog({
            type: "response",
            method,
            url: response.url,
            status: response.status,
            duration,
            headers: Object.fromEntries(response.headers.entries()),
            payload: responseData
          })
        }
        
        return response
      } catch (error) {
        // Log any network errors
        const duration = Date.now() - startTime
        addLog({
          type: "error",
          method,
          url,
          message: error instanceof Error ? error.message : "Network error",
          duration
        })
        throw error
      }
    }

    return () => {
      // @ts-ignore
      window.XMLHttpRequest = originalXHR
      window.fetch = originalFetch
    }
  }, [addLog])
}

function getHeaders(xhr: XMLHttpRequest): Record<string, string> {
  const headers: Record<string, string> = {}
  const headerLines = xhr.getAllResponseHeaders().split("\r\n")

  for (const line of headerLines) {
    const [key, value] = line.split(": ")
    if (key && value) {
      headers[key.toLowerCase()] = value
    }
  }

  return headers
}

function tryParseResponse(xhr: XMLHttpRequest): any {
  try {
    const contentType = xhr.getResponseHeader("content-type")
    if (contentType?.includes("application/json")) {
      return JSON.parse(xhr.responseText)
    }
    return xhr.responseText
  } catch {
    return xhr.responseText
  }
}

function tryParseJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
} 