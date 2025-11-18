import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id_token) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Missing id_token in request body' 
        },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token: body.id_token }),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Verify token proxy error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error.message || 'Failed to verify token',
      },
      { status: 500 }
    );
  }
}

