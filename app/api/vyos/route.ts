import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
import fetch from 'node-fetch';
import https from 'https';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, data, headers, allowInsecure } = body;
    
    console.log('Request body:', JSON.stringify(body, null, 2));
    console.log('Allow insecure:', allowInsecure);

    // Create form data if needed
    let formData: FormData | undefined;
    if (data && typeof data === 'object') {
      formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData!.append(key, value as string);
        console.log(`Adding form data: ${key}`);
      });
    }
    
    // Create an HTTPS agent to handle self-signed certificates
    const agent = allowInsecure 
      ? new https.Agent({ rejectUnauthorized: false }) 
      : undefined;
      
    console.log('Using agent with rejectUnauthorized:', agent ? 'false' : 'true');

    // Prepare request options
    const requestOptions: any = {
      method,
      agent,
      headers: {
        ...headers,
        ...(formData ? formData.getHeaders() : {}),
      },
      body: formData ? formData : (data ? JSON.stringify(data) : undefined),
    };

    console.log('Making request to:', url);
    console.log('Request options:', JSON.stringify({
      method: requestOptions.method,
      headers: requestOptions.headers,
      hasBody: !!requestOptions.body,
    }, null, 2));
    
    // Make the request to VyOS
    const response = await fetch(url, requestOptions);
    const responseData = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response data (preview):', responseData.substring(0, 200));

    // Try to parse the response as JSON if it has JSON content
    let parsedData;
    if (responseData && responseData.trim()) {
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
    } else {
      console.log('Empty response received');
      parsedData = { 
        rawOutput: '', 
        error: 'Empty response',
        success: false 
      };
    }

    // Return the response
    return NextResponse.json({
      status: response.status,
      data: parsedData,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (error) {
    console.error('API Error:', error);
    
    // Provide a more helpful error message for certificate errors
    let errorMessage = 'Failed to make API request';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', error.stack);
      
      if (errorMessage.includes('certificate') || 
          errorMessage.includes('DEPTH_ZERO_SELF_SIGNED_CERT')) {
        errorMessage = "SSL Certificate Error: Enable 'Allow insecure SSL connections'";
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 