import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing bucket-projects endpoint...');
    console.log('BACKEND_URL:', BACKEND_URL);
    
    const response = await fetch(`${BACKEND_URL}/bucket-projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        {
          error: 'BACKEND_ERROR',
          message: `Backend returned ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract project count
    const projectCount = data.projects?.length || data.items?.length || 0;
    const totalSize = data.total_size_mb || 0;
    const bucketName = data.bucket_name || 'unknown';
    
    // Log detailed information
    console.log('=== BUCKET PROJECTS TEST RESULTS ===');
    console.log(`Total Projects: ${projectCount}`);
    console.log(`Total Size: ${totalSize} MB`);
    console.log(`Bucket Name: ${bucketName}`);
    console.log('Projects:', data.projects?.map((p: any) => ({
      id: p.project_id,
      size: p.size_mb,
      created: p.created_at
    })) || []);
    console.log('===================================');
    
    return NextResponse.json({
      success: true,
      summary: {
        total_projects: projectCount,
        total_size_mb: totalSize,
        bucket_name: bucketName,
      },
      projects: data.projects || [],
      full_response: data,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test bucket-projects endpoint',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

