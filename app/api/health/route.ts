import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mobile-generator-backend-1098053868371.us-central1.run.app';

export async function GET() {
  try {
    // Check if backend is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    let backendHealthy = false;
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      clearTimeout(timeoutId);
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        backendHealthy = backendData.status === 'healthy' || backendData.status === 'ok';
      }
    } catch (backendError) {
      clearTimeout(timeoutId);
      // Backend check failed, but frontend is still accessible
      console.debug('Backend health check failed (non-critical):', backendError);
    }
    
    return NextResponse.json(
      { 
        status: backendHealthy ? 'healthy' : 'ok', // 'ok' means frontend is up, backend may be down
        timestamp: new Date().toISOString(),
        active_projects: 0, // We don't track this in frontend
        system_metrics: backendHealthy ? undefined : {
          note: 'Backend health check unavailable'
        }
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

