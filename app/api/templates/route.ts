import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/templates`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'PROXY_ERROR',
        message: error.message || 'Failed to proxy request to backend',
        suggestion: 'Please check your network connection and try again'
      },
      { status: 500 }
    );
  }
}

