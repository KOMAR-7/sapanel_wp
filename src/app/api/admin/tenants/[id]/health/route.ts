import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { healthService } from '@/services/health/health.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'health:read');
  if (errorResponse) return errorResponse;

  try {
    const health = await healthService.getTenantHealthSummary(params.id);
    return apiSuccess({ health });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch health status', 'SERVER_ERROR', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'health:trigger');
  if (errorResponse) return errorResponse;

  try {
    const results = await healthService.runTenantHealthCheck(params.id);
    return apiSuccess({ results, message: 'Health checks completed.' });
  } catch (err: any) {
    return apiError(err.message || 'Failed to run health checks', 'SERVER_ERROR', 500);
  }
}
