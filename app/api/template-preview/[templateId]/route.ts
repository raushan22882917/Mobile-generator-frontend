import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const { templateId } = params;
    
    const response = await fetch(`${BACKEND_URL}/template-preview/${templateId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    // Return the image/blob directly
    const blob = await response.blob();
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new NextResponse(null, { status: 500 });
  }
}

