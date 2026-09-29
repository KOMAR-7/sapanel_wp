import { NextRequest } from 'next/server';
import { requireAdminAuth } from '@/lib/api/auth-guard';
import { infrastructureService } from '@/services/infrastructure/infrastructure.service';
import { apiError, apiSuccess } from '@/lib/api/response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdminAuth(req, 'infrastructure:read');
  if (errorResponse) return errorResponse;

  try {
    const dependencies = await infrastructureService.getTenantResourceDependencies(params.id);
    return apiSuccess({ dependencies });
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch dependencies', 'SERVER_ERROR', 500);
  }
}
