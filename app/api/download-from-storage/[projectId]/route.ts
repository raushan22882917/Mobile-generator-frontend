import { NextRequest, NextResponse } from 'next/server';

/**
 * Route handler for legacy download-from-storage URLs
 * This handles 404 errors from old URL patterns
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> | { projectId: string } }
) {
  try {
    // Handle both sync and async params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { projectId } = resolvedParams;
    
    // Redirect to the correct download endpoint
    return NextResponse.redirect(new URL(`/api/download/${projectId}`, request.url), 301);
  } catch (error: any) {
    console.error('Download-from-storage redirect error:', error);
    // If redirect fails, return 404
    return NextResponse.json(
      { 
        error: 'NOT_FOUND',
        message: 'Download endpoint not found. Please use /api/download/{projectId}',
      },
      { status: 404 }
    );
  }
}

