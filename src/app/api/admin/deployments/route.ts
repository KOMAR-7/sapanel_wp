import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { deploymentService } from '@/services/deployments/deployment.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdminAuth(req, 'tenants:read');
  if (errorResponse) return errorResponse;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || undefined;

  try {
    const deployments = await deploymentService.listDeployments(tenantId);
    return apiSuccess({ deployments });
  } catch (err: any) {
    return apiError(err.message || 'Failed to list deployments', 'SERVER_ERROR', 500);
  }
}
