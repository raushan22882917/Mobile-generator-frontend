import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
const API_KEY = process.env.API_KEY || 'dev-key-12345';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> | { projectId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let { projectId } = resolvedParams;
    
    // Clean projectId - remove any invalid characters or trailing parts
    projectId = projectId.split(':')[0].trim(); // Remove anything after colon (like :1)
    
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
    
    console.log('Download request for project:', projectId);
    
    const response = await fetch(`${BACKEND_URL}/download/${encodeURIComponent(projectId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `Server returned ${response.status}` };
      }
      
      console.error('Download failed:', response.status, errorData);
      
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
    console.error('Download proxy error:', error);
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

