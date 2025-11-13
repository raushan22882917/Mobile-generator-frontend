import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
const API_KEY = process.env.API_KEY || 'dev-key-12345';

export async function POST(request: NextRequest) {
  // Log environment configuration (without sensitive data)
  console.log('Fast-generate endpoint called');
  console.log('BACKEND_URL:', BACKEND_URL);
  console.log('API_KEY set:', !!API_KEY && API_KEY !== 'dev-key-12345');
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST',
          message: 'Invalid request body. Expected JSON.',
          suggestion: 'Please check that your request contains valid JSON data.',
        },
        { status: 400 }
      );
    }
    
    console.log('Proxying fast-generate request to:', `${BACKEND_URL}/api/v1/fast-generate`);
    console.log('Request body:', body);
    
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response;
    try {
      response = await fetch(`${BACKEND_URL}/api/v1/fast-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (fetchError.name === 'AbortError') {
        console.error('Request to backend timed out after 30 seconds');
        return NextResponse.json(
          {
            error: 'TIMEOUT_ERROR',
            message: 'Request to backend timed out after 30 seconds',
            suggestion: 'The backend server may be overloaded or unreachable. Please try again in a few moments.',
          },
          { status: 504 }
        );
      }
      
      // Handle network errors
      if (fetchError.message?.includes('fetch failed') || fetchError.code === 'ECONNREFUSED') {
        console.error('Network error connecting to backend:', fetchError);
        return NextResponse.json(
          {
            error: 'NETWORK_ERROR',
            message: 'Failed to connect to backend server',
            suggestion: 'The backend server may be unreachable. Please check if the backend is running and accessible.',
          },
          { status: 503 }
        );
      }
      
      // Re-throw other errors
      throw fetchError;
    }

    console.log('Backend response status:', response.status);
    
    // Check if response is ok
    if (!response.ok) {
      // Handle 503 Service Unavailable specifically
      if (response.status === 503) {
        let errorData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({}));
        } else {
          const text = await response.text().catch(() => 'Service Unavailable');
          errorData = { message: text, error: 'SERVICE_UNAVAILABLE' };
        }
        
        console.error('Backend 503 error:', errorData);
        return NextResponse.json(
          {
            error: 'SERVICE_UNAVAILABLE',
            message: errorData.message || 'Backend service is currently unavailable',
            suggestion: 'The backend server may be temporarily overloaded or under maintenance. Please try again in a few moments. If the problem persists, check if the backend server is running.',
            ...errorData,
          },
          { status: 503 }
        );
      }
      
      // Try to get error message from response
      let errorData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => 'Unknown error');
        errorData = { message: text, error: 'BACKEND_ERROR' };
      }
      
      console.error('Backend error:', errorData);
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    // Parse successful response
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Failed to proxy request to backend';
    let errorType = 'PROXY_ERROR';
    let suggestion = 'Please check your network connection and try again';
    
    if (error.name === 'AbortError') {
      errorType = 'TIMEOUT_ERROR';
      errorMessage = 'Request timed out';
      suggestion = 'The request took too long. Please try again.';
    } else if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      errorType = 'CONNECTION_REFUSED';
      errorMessage = 'Cannot connect to backend server';
      suggestion = 'The backend server may not be running or is unreachable.';
    } else if (error.message?.includes('fetch failed')) {
      errorType = 'NETWORK_ERROR';
      errorMessage = 'Network error occurred';
      suggestion = 'Please check your network connection and try again.';
    }
    
    return NextResponse.json(
      { 
        error: errorType,
        message: errorMessage,
        suggestion,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

