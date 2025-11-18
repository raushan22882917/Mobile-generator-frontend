import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
const API_KEY = process.env.API_KEY || 'dev-key-12345';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json(
        { 
          error: 'MISSING_PATH',
          message: 'File path parameter is required',
          suggestion: 'Please provide a file path in the query parameter'
        },
        { status: 400 }
      );
    }
    
    // Try the editor API endpoint first (with query parameter)
    // According to OpenAPI spec: /api/editor/projects/{project_id}/file?path=...
    const editorApiUrl = `${BACKEND_URL}/api/editor/projects/${projectId}/file?path=${encodeURIComponent(filePath)}`;
    
    console.log('Fetching file content via editor API:', { projectId, filePath, url: editorApiUrl });
    
    let response = await fetch(editorApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    // If editor API fails, try the files endpoint as fallback
    if (!response.ok) {
      console.log('Editor API failed, trying files endpoint...');
      // Encode each segment for the backend URL to handle special characters like parentheses
      const encodedSegments = filePath.split('/').map(segment => encodeURIComponent(segment));
      const encodedPath = encodedSegments.join('/');
      const filesApiUrl = `${BACKEND_URL}/files/${projectId}/${encodedPath}/content`;
      
      console.log('Trying files endpoint:', { url: filesApiUrl });
      response = await fetch(filesApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('File content fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        filePath,
        projectId
      });
      return NextResponse.json(
        { 
          error: 'FILE_NOT_FOUND',
          message: errorData.message || errorData.error || `Failed to load file: ${filePath}`,
          suggestion: 'The file may not exist or the project may not be ready'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the content in a consistent format
    // Editor API returns { content: "..." }, files API might return different format
    return NextResponse.json(
      { content: data.content || data },
      { status: 200 }
    );
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

