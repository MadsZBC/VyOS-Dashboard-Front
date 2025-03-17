import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { endpoint, data } = body;
    
    // Get API key from environment
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          message: "API key is missing",
          debug: {
            request: { endpoint, data: sanitizeData(data) },
            error: "API key is missing from environment variables"
          }
        },
        { status: 500 }
      );
    }
    
    // Capture request details for debugging
    const requestDetails = {
      url: `${API_BASE_URL}/${endpoint}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": "***" // Don't expose actual API key in debug info
      },
      body: sanitizeData(data)
    };
    
    console.log(`Making request to ${endpoint}`, requestDetails);
    
    // Forward the request to the actual API
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(data),
    });
    
    // Store response details
    const responseDetails = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()])
    };
    
    // Get the response text first, then try to parse as JSON
    const responseText = await response.text();
    
    console.log(`Response from ${endpoint}:`, {
      status: response.status,
      text: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
    });
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, create an error response with the text content
      console.error("Failed to parse response as JSON:", parseError);
      
      return NextResponse.json({
        success: false,
        data: { error: "Invalid response format" },
        message: "Server returned non-JSON response",
        debug: {
          request: requestDetails,
          response: {
            ...responseDetails,
            body: responseText.substring(0, 500) // Limit text length
          },
          error: parseError instanceof Error ? parseError.message : String(parseError)
        }
      }, { status: 500 });
    }
    
    // Return the response with debug information
    return NextResponse.json({
      ...responseData,
      debug: {
        request: requestDetails,
        response: {
          ...responseDetails,
          body: responseData
        }
      }
    }, { 
      status: response.status 
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred",
        debug: {
          error: error instanceof Error ? 
            { message: error.message, stack: error.stack } : 
            String(error)
        }
      },
      { status: 500 }
    );
  }
}

// Helper function to sanitize sensitive data
function sanitizeData(data: any): any {
  if (!data) return data;
  
  // Create a copy to avoid modifying the original
  const sanitized = { ...data };
  
  // Remove sensitive fields
  if (sanitized.password) sanitized.password = "********";
  if (sanitized.key_content) sanitized.key_content = "********";
  
  return sanitized;
} 