import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
const API_KEY = process.env.API_KEY || 'dev-key-12345';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/apply-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    // Check if response is ok before parsing
    if (!response.ok) {
      let errorData;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => 'Unknown error');
        errorData = { message: text, error: 'BACKEND_ERROR' };
      }
      
      // Check for hung status
      const isHung = errorData.result_code === 'hung' || 
                     errorData.error === 'hung' ||
                     errorData.message?.toLowerCase().includes('hung');
      
      if (isHung) {
        return NextResponse.json(
          {
            error: 'RESULT_CODE_HUNG',
            message: 'The operation timed out or hung on the backend',
            suggestion: 'The backend operation may be taking too long. Please try again or check the backend status.',
          },
          { status: 504 }
        );
      }
      
      console.error('Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    // Parse successful response
    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
      ? await response.json()
      : { message: await response.text() };
    
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'PROXY_ERROR',
        message: error.message || 'Failed to proxy request to backend',
        suggestion: 'Please check your network connection and try again',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

