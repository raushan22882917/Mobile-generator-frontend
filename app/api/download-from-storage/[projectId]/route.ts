import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
const API_KEY = process.env.API_KEY || 'dev-key-12345';

/**
 * Route handler for legacy download-from-storage URLs
 * Proxies to the correct download endpoint instead of redirecting
 * (fetch requests don't follow redirects automatically)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> | { projectId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let { projectId } = resolvedParams;
    
    // Clean projectId - remove any invalid characters
    projectId = projectId.split(':')[0].trim();
    
    if (!projectId || projectId.length === 0) {
      return NextResponse.json(
        { 
          error: 'INVALID_PROJECT_ID',
          message: 'Project ID is required',
          suggestion: 'Please provide a valid project ID'
        },
        { status: 400 }
      );
    }
    
    // Get Authorization header from request
    const authHeader = request.headers.get('Authorization');
    
    // Prepare headers for backend request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    };
    
    // Forward Authorization header if present
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    // Proxy the request to the correct download endpoint
    const response = await fetch(`${BACKEND_URL}/download/${encodeURIComponent(projectId)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `Server returned ${response.status}` };
      }
      
      return NextResponse.json(
        {
          error: 'DOWNLOAD_FAILED',
          message: errorData.message || `Failed to download project: ${response.status}`,
          suggestion: 'Please ensure the project exists and try again'
        },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="expo-app-${projectId.substring(0, 8)}.zip"`,
      },
    });
  } catch (error: any) {
    console.error('Download-from-storage proxy error:', error);
    return NextResponse.json(
      { 
        error: 'PROXY_ERROR',
        message: error.message || 'Failed to proxy download request to backend',
        suggestion: 'Please check your network connection and try again'
      },
      { status: 500 }
    );
  }
}

