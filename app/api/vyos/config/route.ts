import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import fetch from 'node-fetch';
import https from 'https';

export async function POST(request: NextRequest) {
  try {
    // Parse form data from request
    const formData = await request.formData();
    const host = formData.get('host') as string;
    const port = formData.get('port') as string;
    const key = formData.get('key') as string;
    const allowInsecure = formData.get('allowInsecure') === 'true';
    
    console.log('Config API request for host:', host);

    if (!host || !key) {
      return NextResponse.json(
        { error: "Missing required parameters (host, key)" },
        { status: 400 }
      );
    }

    // Create VyOS API request
    const url = `https://${host}:${port || 443}/retrieve`;
    const apiFormData = new FormData();
    apiFormData.append('data', JSON.stringify({
      op: 'showConfig',
      path: []
    }));
    apiFormData.append('key', key);
    
    // Create an HTTPS agent to handle self-signed certificates
    const agent = allowInsecure 
      ? new https.Agent({ rejectUnauthorized: false }) 
      : undefined;
    
    console.log('Making config request to VyOS API:', url);
    
    // Make the request to VyOS
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...apiFormData.getHeaders(),
        'Accept': 'application/json'
      },
      body: apiFormData,
      agent
    });
    
    console.log('Response status:', response.status);
    
    // Get the response text
    const responseData = await response.text();
    
    // Try to parse as JSON or return as raw
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
      console.log('Successfully parsed response as JSON');
    } catch (e: any) {
      console.log('Response is not valid JSON:', e.message);
      parsedData = { 
        rawOutput: responseData,
        error: null,
        success: true 
      };
    }
    
    // Return the parsed data
    return NextResponse.json({
      status: response.status,
      data: parsedData,
      success: response.ok
    });
    
  } catch (error: any) {
    console.error('Config API Error:', error);
    
    // Provide a more helpful error message for certificate errors
    let errorMessage = 'Failed to retrieve configuration';
    if (error.message.includes('certificate') || error.message.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
      errorMessage = "SSL Certificate Error: Enable 'Allow insecure SSL connections'";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 