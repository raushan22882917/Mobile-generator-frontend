import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';
const API_KEY = process.env.API_KEY || 'dev-key-12345';

export async function GET(request: NextRequest) {
  try {
    // Use /bucket-projects endpoint to get projects from Cloud Storage
    const response = await fetch(`${BACKEND_URL}/bucket-projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform bucket projects response to match ProjectListItem format
    if (data.projects && Array.isArray(data.projects)) {
      const projects = data.projects.map((project: any) => ({
        id: project.project_id,
        name: project.file_name?.replace('.zip', '') || undefined,
        status: 'inactive' as const, // Bucket projects are inactive by default
        preview_url: project.download_url || null,
        created_at: project.created_at,
        updated_at: project.updated_at,
      }));
      
      return NextResponse.json(projects, { status: 200 });
    }
    
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

