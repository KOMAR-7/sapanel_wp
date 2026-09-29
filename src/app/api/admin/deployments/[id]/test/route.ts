import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { deploymentService } from '@/services/deployments/deployment.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, errorResponse } = await requireAdminAuth(req, 'health:trigger');
  if (errorResponse) return errorResponse;

  try {
    const result = await deploymentService.checkDeploymentHealth(params.id, session?.adminId);
    return apiSuccess({ result });
  } catch (err: any) {
    return apiError(err.message || 'Failed to test deployment health', 'SERVER_ERROR', 500);
  }
}
