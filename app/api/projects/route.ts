import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function GET(request: NextRequest) {
  console.log('Projects endpoint called');
  console.log('BACKEND_URL:', BACKEND_URL);
  
  try {
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response;
    try {
      response = await fetch(`${BACKEND_URL}/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (fetchError.name === 'AbortError') {
        console.error('Request to backend timed out after 10 seconds');
        return NextResponse.json(
          {
            error: 'TIMEOUT_ERROR',
            message: 'Request to backend timed out',
            suggestion: 'The backend server may be overloaded. Please try again.',
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
            suggestion: 'The backend server may be unreachable. Please check if the backend is running.',
          },
          { status: 503 }
        );
      }
      
      throw fetchError;
    }

    console.log('Backend response status:', response.status);

    // Check if response is ok
    if (!response.ok) {
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
    const data = await response.json();
    
    // Log detailed information for debugging
    console.log('Backend projects response:', {
      hasProjects: !!data.projects,
      projectsLength: data.projects?.length || 0,
      total: data.total,
      keys: Object.keys(data),
      firstProject: data.projects?.[0] || null,
    });
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
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

