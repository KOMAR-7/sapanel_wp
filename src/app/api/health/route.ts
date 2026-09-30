import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public Health Check Endpoint for ALB / Load Balancer & Monitoring Canaries
 *
 * Strictly returns HTTP 200 with minimal health status.
 * Generated dynamically on every request with the current server time.
 * NEVER exposes database connection strings, credentials, or internal environment variables.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'restroconnect-control-plane',
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
