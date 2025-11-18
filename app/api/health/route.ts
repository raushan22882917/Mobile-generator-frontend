import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function GET() {
  try {
    // Check if backend is accessible with fast timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for faster response
    
    let backendHealthy = false;
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache control to prevent stale responses
        cache: 'no-store',
      });
      clearTimeout(timeoutId);
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        backendHealthy = backendData.status === 'healthy' || backendData.status === 'ok';
      }
    } catch (backendError) {
      clearTimeout(timeoutId);
      // Backend check failed quickly, return immediately
      // Don't wait - just return that frontend is ok
    }
    
    return NextResponse.json(
      { 
        status: backendHealthy ? 'healthy' : 'ok', // 'ok' means frontend is up, backend may be down
        timestamp: new Date().toISOString(),
        active_projects: 0, // We don't track this in frontend
      },
      { status: 200 }
    );
  } catch (error) {
    // Frontend is still accessible even if backend check fails
    return NextResponse.json(
      { 
        status: 'ok',
        timestamp: new Date().toISOString(),
        active_projects: 0,
        message: 'Frontend API routes are accessible'
      },
      { status: 200 }
    );
  }
}

