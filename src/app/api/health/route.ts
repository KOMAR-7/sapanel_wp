import { NextResponse } from 'next/server';

/**
 * Public Health Check Endpoint for ALB / Load Balancer & Monitoring Canaries
 *
 * Strictly returns HTTP 200 with minimal health status.
 * NEVER exposes database connection strings, credentials, or internal environment variables.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'restroconnect-control-plane',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
